"use client";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { PRODUCTS, cop } from "@/lib/products";
import { useCart } from "@/context/CartContext";

export default function Checkout() {
  const { lines, add, remove } = useCart();
  const [f, setF] = useState({ name: "", email: "", address: "", city: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rows = lines.map((l) => ({ ...l, p: PRODUCTS.find((p) => p.id === l.id)! }));
  const total = rows.reduce((s, r) => s + r.p.price * r.quantity, 0);
  // Campo con etiqueta flotante: la etiqueta se achica y sube a la esquina al enfocar o escribir
  const input = "peer h-[60px] w-full rounded-lg bg-deep px-4 pt-5 text-white outline-none focus:ring-2 focus:ring-star";
  const label =
    "pointer-events-none absolute left-4 top-2 translate-y-0 text-xs text-white/60 transition-all duration-200 " +
    "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-white/50 " +
    "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-star";
  const labels = { name: "Nombre completo", email: "Correo", address: "Dirección", city: "Ciudad" };
  const stepBtn = "flex h-7 w-7 items-center justify-center rounded-full bg-deep text-white transition hover:brightness-125 disabled:opacity-40 disabled:hover:brightness-100";

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: f, items: lines.map((l) => ({ productId: l.id, quantity: l.quantity })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en el checkout");
      window.location.href = data.paymentUrl; // pantalla de pago (pasarela simulada)
    } catch (err: any) {
      setError(err.message); setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-2">
      <section className="rounded-2xl bg-card p-6 text-white">
        <h2 className="mb-4 text-xl font-black">Resumen de compra</h2>
        {rows.length === 0 && <p className="opacity-70">Tu carrito está vacío.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-b border-white/10 py-3">
            <span className="min-w-0 flex-1 truncate">{r.p.image} {r.p.name}</span>

            {/* Cantidad: − 2 + (mínimo 1, máximo el stock; para quitar el producto usa la ✕) */}
            <div className="flex items-center gap-2">
              <button aria-label="Quitar uno" disabled={r.quantity <= 1} onClick={() => add(r.id, -1)} className={stepBtn}>
                <Icon icon="lucide:minus" width={16} height={16} />
              </button>
              <span className="w-5 text-center font-bold">{r.quantity}</span>
              <button aria-label="Agregar uno" disabled={r.quantity >= r.p.stock} onClick={() => add(r.id, 1)} className={stepBtn}>
                <Icon icon="lucide:plus" width={16} height={16} />
              </button>
            </div>

            <span className="w-24 text-right">{cop(r.p.price * r.quantity)}</span>
            <button aria-label={`Quitar ${r.p.name}`} onClick={() => remove(r.id)} className="flex h-6 w-6 items-center justify-center text-blood">
              <Icon icon="lucide:x" width={16} height={16} />
            </button>
          </div>
        ))}
        <p className="mt-4 text-right text-2xl font-black text-star">Total: {cop(total)}</p>
      </section>

      <form onSubmit={pay} className="space-y-3 rounded-2xl bg-card p-6">
        <h2 className="text-xl font-black text-white">Datos de envío</h2>
        {(["name", "email", "address", "city"] as const).map((k) => (
          <div key={k} className="relative">
            {/* placeholder=" " (un espacio) es lo que permite saber si el campo está vacío */}
            <input id={`f-${k}`} required type={k === "email" ? "email" : "text"} className={input}
              placeholder=" " value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            <label htmlFor={`f-${k}`} className={label}>{labels[k]}</label>
          </div>
        ))}
        {error && <p className="text-sm text-star">{error}</p>}
        <button disabled={loading || !rows.length} className="w-full rounded-lg bg-lime py-3 font-bold text-black disabled:opacity-50">
          {loading ? "Procesando…" : "Ir a pagar"}
        </button>
      </form>
    </div>
  );
}