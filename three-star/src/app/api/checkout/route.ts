import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/* PASARELA SIMULADA
   Este endpoint crea el pedido (PENDING) y manda al cliente a /pago/[id].
   El cobro "real" lo simula /api/pay. */

class HttpError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function POST(req: Request) {
  try {
    const { customer, items } = await req.json();

    // Limpiar y validar los datos del cliente EN EL SERVIDOR
    const name = String(customer?.name ?? "").trim();
    const email = String(customer?.email ?? "").trim().toLowerCase();
    const address = String(customer?.address ?? "").trim();
    const city = String(customer?.city ?? "").trim();
    if (!name || !email || !address || !city || !Array.isArray(items) || !items.length)
      throw new HttpError("Datos incompletos");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError("Correo inválido");

    // Unir productos repetidos (evita saltarse la validación de stock enviando el mismo producto dos veces)
    const wanted = new Map<string, number>();
    for (const i of items) {
      const id = String(i?.productId ?? "");
      const q = Number(i?.quantity);
      if (!id || !Number.isInteger(q) || q < 1) throw new HttpError("Producto inválido");
      wanted.set(id, (wanted.get(id) ?? 0) + q);
    }

    // Los precios SIEMPRE se leen de la BD, nunca del cliente
    const products = await prisma.product.findMany({ where: { id: { in: [...wanted.keys()] } } });
    const lines = [...wanted.entries()].map(([id, q]) => {
      const p = products.find((x) => x.id === id);
      if (!p) throw new HttpError("Producto inválido");
      if (p.stock < q) throw new HttpError(`Sin stock suficiente de ${p.name}`, 409);
      return { p, q };
    });
    const total = lines.reduce((s, l) => s + l.p.price * l.q, 0);

    // Compra como invitado => contraseña aleatoria
    const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10);

    // Usuario + pedido en una sola transacción
    const order = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: { name, address, city },
        create: { name, email, address, city, passwordHash },
      });
      return tx.order.create({
        data: {
          userId: user.id,
          total,
          status: "PENDING",
          // Copia de los datos de ESTE pedido
          customerName: name,
          customerEmail: email,
          shippingAddress: address,
          shippingCity: city,
          items: {
            create: lines.map((l) => ({ productId: l.p.id, quantity: l.q, precioUnitario: l.p.price })),
          },
        },
      });
    });

    return NextResponse.json({ orderId: order.id, paymentUrl: `/pago/${order.id}` });
  } catch (e: any) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}