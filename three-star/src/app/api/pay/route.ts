import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/* PASARELA SIMULADA: procesa el "pago" con tarjeta.
   - NUNCA se guarda el número completo ni el CVC: solo la marca y los últimos 4 dígitos.
   - Tarjetas de prueba que SIEMPRE se rechazan (cualquier otra tarjeta válida se aprueba). */
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

export async function POST(req: Request) {
  try {
    const { orderId, card } = await req.json();
    const number = digits(card?.number);
    const holder = String(card?.name ?? "").trim();
    const cvc = digits(card?.cvc);
    const [mm, yy] = String(card?.expiry ?? "").split("/");

    // --- Validaciones (igual que haría una pasarela real) ---
    if (number.length < 13 || number.length > 19 || !luhn(number)) return fail("El número de tarjeta no es válido.");
    if (holder.length < 3) return fail("Escribe el nombre como aparece en la tarjeta.");
    const month = Number(mm);
    const year = 2000 + Number(yy);
    if (!(month >= 1 && month <= 12) || !yy || yy.length !== 2 || Number.isNaN(year))
      return fail("La fecha de vencimiento no es válida.");
    const now = new Date();
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))
      return fail("La tarjeta está vencida.");
    if (cvc.length < 3 || cvc.length > 4) return fail("El código de seguridad no es válido.");

    // --- El pedido debe existir y seguir pendiente ---
    const oid = Number(orderId);
    if (!Number.isInteger(oid) || oid < 1) return fail("Pedido no válido.");
    const order = await prisma.order.findUnique({ where: { id: oid }, include: { items: true } });
    if (!order) return fail("Pedido no encontrado.", 404);
    if (order.status !== "PENDING") return fail("Este pedido ya fue pagado.", 409);

    // --- Simula el tiempo que tarda el banco en responder ---
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

    const declined = DECLINED[number];
    if (declined) return fail(declined, 402);

    // --- Aprobado: marcar pagado y descontar stock, todo junto ---
    const paymentId = "SIM-" + crypto.randomBytes(5).toString("hex").toUpperCase();
    const brand = brandOf(number);
    const last4 = number.slice(-4);

    await prisma.$transaction(async (tx) => {
      // updateMany con status PENDING evita cobrar dos veces el mismo pedido
      const done = await tx.order.updateMany({
        where: { id: oid, status: "PENDING" },
        data: { status: "PAID", paymentId, cardBrand: brand, cardLast4: last4, paidAt: new Date() },
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

    return NextResponse.json({ ok: true, paymentId, brand, last4 });
  } catch (e: any) {
    if (e instanceof PayError) return fail(e.message, e.status);
    console.error(e);
    return fail("Error interno", 500);
  }
}