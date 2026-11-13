import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { PSE_BANKS, PSE_DECLINE_BANK, PERSON_TYPES, DOC_TYPES, NEQUI_DECLINED } from "@/lib/payments";

/* PASARELA SIMULADA: procesa el "pago" con tarjeta, PSE o Nequi.
   - NUNCA se guarda el número completo de la tarjeta ni el CVC: solo la marca y los últimos 4 dígitos.
   - Tarjetas de prueba que SIEMPRE se rechazan (cualquier otra tarjeta válida se aprueba).
   - PSE: el banco "Banco que rechaza (pruebas)" siempre se rechaza.
   - Nequi: el celular 3992222222 siempre se rechaza.
   Para cobrar de verdad hay que conectar un proveedor (Wompi, ePayco, PayU, Mercado Pago…): esto es solo una demo. */
const DECLINED: Record<string, string> = {
  "4000000000000002": "El banco rechazó la tarjeta.",
  "4000000000009995": "Fondos insuficientes.",
  "4000000000000069": "La tarjeta está vencida.",
  "4000000000000127": "El código de seguridad es incorrecto.",
};

class PayError extends Error {
  constructor(message: string, public status = 409) {
    super(message);
  }
}

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");

function luhn(n: string) {
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return n.length > 0 && sum % 10 === 0;
}

const brandOf = (n: string) =>
  /^4/.test(n) ? "Visa" : /^(5[1-5]|2[2-7])/.test(n) ? "Mastercard" : /^3[47]/.test(n) ? "American Express" : "Tarjeta";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const wait = (min: number, extra: number) => new Promise((r) => setTimeout(r, min + Math.random() * extra));

type Charge = { brand: string; last4: string; detail: string; declined?: string };

/* Cada método valida sus datos y devuelve cómo se guarda y se muestra el pago. Si el "banco" lo rechaza, trae "declined". */
async function chargeCard(card: any): Promise<Charge> {
  const number = digits(card?.number);
  const holder = String(card?.name ?? "").trim();
  const cvc = digits(card?.cvc);
  const [mm, yy] = String(card?.expiry ?? "").split("/");

  if (number.length < 13 || number.length > 19 || !luhn(number)) throw new PayError("El número de tarjeta no es válido.", 400);
  if (holder.length < 3) throw new PayError("Escribe el nombre como aparece en la tarjeta.", 400);
  const month = Number(mm);
  const year = 2000 + Number(yy);
  if (!(month >= 1 && month <= 12) || !yy || yy.length !== 2 || Number.isNaN(year))
    throw new PayError("La fecha de vencimiento no es válida.", 400);
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))
    throw new PayError("La tarjeta está vencida.", 400);
  if (cvc.length < 3 || cvc.length > 4) throw new PayError("El código de seguridad no es válido.", 400);

  return { brand: brandOf(number), last4: number.slice(-4), detail: `${brandOf(number)} terminada en ${number.slice(-4)}`, declined: DECLINED[number] };
}

function chargePse(pse: any): Charge {
  const bank = String(pse?.bank ?? "");
  const person = String(pse?.personType ?? "");
  const docType = String(pse?.docType ?? "");
  const doc = digits(pse?.docNumber);

  if (!PSE_BANKS.includes(bank)) throw new PayError("Selecciona un banco de la lista.", 400);
  if (!(PERSON_TYPES as readonly string[]).includes(person)) throw new PayError("Tipo de persona no válido.", 400);
  if (!(DOC_TYPES as readonly string[]).includes(docType)) throw new PayError("Tipo de documento no válido.", 400);
  if (doc.length < 5 || doc.length > 12) throw new PayError("El número de documento no es válido.", 400);

  return {
    brand: "PSE",
    last4: doc.slice(-4),
    detail: `PSE · ${bank}`,
    declined: bank === PSE_DECLINE_BANK ? "El banco rechazó la transacción." : undefined,
  };
}

function chargeNequi(nequi: any): Charge {
  const phone = digits(nequi?.phone);
  if (!/^3\d{9}$/.test(phone)) throw new PayError("Escribe un celular válido de 10 dígitos (empieza por 3).", 400);
  return {
    brand: "Nequi",
    last4: phone.slice(-4),
    detail: `Nequi · cel. terminado en ${phone.slice(-4)}`,
    declined: phone === NEQUI_DECLINED ? "El pago fue rechazado en la app de Nequi." : undefined,
  };
}

export async function POST(req: Request) {
  try {
    const { orderId, method = "card", card, pse, nequi } = await req.json();

    // --- Validaciones propias de cada método (igual que haría una pasarela real) ---
    let charge: Charge;
    let delay: [number, number];
    if (method === "card") { charge = await chargeCard(card); delay = [1500, 1000]; }
    else if (method === "pse") { charge = chargePse(pse); delay = [2000, 1000]; }
    else if (method === "nequi") { charge = chargeNequi(nequi); delay = [3000, 1500]; } // el usuario "aprueba" en su app
    else throw new PayError("Método de pago no válido.", 400);

    // --- El pedido debe existir y seguir pendiente ---
    const oid = Number(orderId);
    if (!Number.isInteger(oid) || oid < 1) return fail("Pedido no válido.");
    const order = await prisma.order.findUnique({ where: { id: oid }, include: { items: true } });
    if (!order) return fail("Pedido no encontrado.", 404);
    if (order.status !== "PENDING") return fail("Este pedido ya fue pagado.", 409);

    // --- Simula el tiempo que tarda el banco / la app en responder ---
    await wait(delay[0], delay[1]);

    if (charge.declined) return fail(charge.declined, 402);

    // --- Aprobado: marcar pagado y descontar stock, todo junto ---
    const paymentId = "SIM-" + crypto.randomBytes(5).toString("hex").toUpperCase();

    await prisma.$transaction(async (tx) => {
      // updateMany con status PENDING evita cobrar dos veces el mismo pedido
      // (cardBrand / cardLast4 guardan aquí también "PSE" o "Nequi" y los últimos 4 del documento o celular)
      const done = await tx.order.updateMany({
        where: { id: oid, status: "PENDING" },
        data: { status: "PAID", paymentId, cardBrand: charge.brand, cardLast4: charge.last4, paidAt: new Date() },
      });
      if (done.count === 0) throw new PayError("Este pedido ya fue pagado.");

      for (const it of order.items) {
        const upd = await tx.product.updateMany({
          where: { id: it.productId, stock: { gte: it.quantity } },
          data: { stock: { decrement: it.quantity } },
        });
        // Si falla, la transacción completa se revierte: el pedido sigue PENDING
        if (upd.count === 0) throw new PayError("Un producto se quedó sin stock. No se realizó el cobro.");
      }
    });

    return NextResponse.json({ ok: true, paymentId, method, brand: charge.brand, last4: charge.last4, detail: charge.detail });
  } catch (e: any) {
    if (e instanceof PayError) return fail(e.message, e.status);
    console.error(e);
    return fail("Error interno", 500);
  }
}