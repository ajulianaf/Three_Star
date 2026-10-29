import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PaymentForm from "./PaymentForm";

export const dynamic = "force-dynamic"; // siempre lee el pedido actual

// Next.js 14: params es un objeto normal (no una promesa)
export default async function Pago({ params }: { params: { id: string } }) {
  const { id } = params;
  if (!/^\d+$/.test(id)) notFound();

  const order = await prisma.order.findUnique({ where: { id: Number(id) }, include: { items: true } });
  if (!order) notFound();

  const products = await prisma.product.findMany({ where: { id: { in: order.items.map((i) => i.productId) } } });
  const lines = order.items.map((i) => ({
    name: products.find((p) => p.id === i.productId)?.name ?? "Producto",
    quantity: i.quantity,
    subtotal: i.precioUnitario * i.quantity,
  }));

  return <PaymentForm orderId={String(order.id)} total={order.total} paid={order.status === "PAID"} lines={lines} />;
}