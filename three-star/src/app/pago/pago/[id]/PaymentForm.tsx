"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { cop } from "@/lib/products";
import { useCart } from "@/context/CartContext";
import { ProductGlyph } from "@/components/ProductIcon";
import { Method, PSE_BANKS, PERSON_TYPES, DOC_TYPES, NEQUI_OK, NEQUI_DECLINED } from "@/lib/payments";

type Line = { id: string; name: string; quantity: number; subtotal: number };
type Result = { paymentId: string; method: Method; detail: string };

/* ============ MEDIOS DE PAGO ACEPTADOS (se muestran siempre; el detectado se ilumina solo) ============ */
const ACCEPTED = [
  { key: "Visa", icon: "lucide:credit-card" },
  { key: "Mastercard", icon: "lucide:credit-card" },
  { key: "American Express", icon: "lucide:credit-card" },
  { key: "Nequi", icon: "lucide:smartphone" },
  { key: "PSE", icon: "lucide:landmark" },
] as const;

// Tarjetas de prueba (solo para la demo)
const TEST_CARDS = [
  { label: "Aprobada", number: "4242424242424242" },
  { label: "Rechazada", number: "4000000000000002" },
  { label: "Sin fondos", number: "4000000000009995" },
];

const digits = (v: string) => v.replace(/\D/g, "");

/* DETECCIÓN AUTOMÁTICA según lo que escribe la persona en el primer campo:
   · empieza por 30, 31, 32, 35 o 39  → celular de Nequi (los celulares colombianos empiezan por 3)
   · 34 o 37 → American Express · 4 → Visa · 51–55 o 22–27 → Mastercard
   (PSE no se puede detectar por un número: se elige con el botón PSE) */
function detect(raw: string): { method: Method; brand: string } {
  if (/^3[01259]/.test(raw)) return { method: "nequi", brand: "Nequi" };
  if (/^3[47]/.test(raw)) return { method: "card", brand: "American Express" };
  if (/^4/.test(raw)) return { method: "card", brand: "Visa" };
  if (/^(5[1-5]|2[2-7])/.test(raw)) return { method: "card", brand: "Mastercard" };
  return { method: "card", brand: "" };
}

const cardFmt = (v: string) => digits(v).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const phoneFmt = (v: string) => {
  const d = digits(v).slice(0, 10);
  return d.length > 6 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)} ${d.slice(3)}` : d;
};
const expiryFmt = (v: string) => {
  const d = digits(v).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

// Campo con etiqueta flotante (igual que en el checkout)
const field = "peer h-[60px] w-full rounded-lg bg-deep px-4 pt-5 text-white outline-none focus:ring-2 focus:ring-star";
const label =
  "pointer-events-none absolute left-4 top-2 translate-y-0 text-xs text-white/60 transition-all duration-200 " +
  "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-white/50 " +
  "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-star";
// Lista desplegable con la etiqueta siempre arriba
const select = "h-[60px] w-full appearance-none rounded-lg bg-deep px-4 pt-5 text-white outline-none focus:ring-2 focus:ring-star";
const selectLabel = "pointer-events-none absolute left-4 top-2 text-xs text-white/60";
const chip = "rounded-full bg-white/15 px-3 py-1 hover:bg-white/25";

export default function PaymentForm({ orderId, total, paid, lines }: { orderId: string; total: number; paid: boolean; lines: Line[] }) {
  const cart = useCart() as unknown as {
    clear?: () => void;
    lines?: { id: string }[];
    remove?: (id: string) => void;
  };

  const [mode, setMode] = useState<"auto" | "pse">("auto");          // auto = detecta tarjeta o Nequi · pse = formulario del banco
  const [num, setNum] = useState("");                                  // tarjeta o celular (mismo campo)
  const [card, setCard] = useState({ name: "", expiry: "", cvc: "" });
  const [pse, setPse] = useState({ bank: "", personType: "Natural", docType: "CC", docNumber: "" });
  const [status, setStatus] = useState<"form" | "processing" | "ok">(paid ? "ok" : "form");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const raw = digits(num);
  const det = detect(raw);
  const method: Method = mode === "pse" ? "pse" : det.method;
  const activeBrand = mode === "pse" ? "PSE" : det.brand;

  function onNumber(v: string) {
    const d = detect(digits(v));
    setNum(d.method === "nequi" ? phoneFmt(v) : cardFmt(v));
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setStatus("processing");
    setError("");
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, method, card: { number: raw, ...card }, nequi: { phone: raw }, pse }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo procesar el pago");
      setResult(data);
      setStatus("ok");
      // Vacía el carrito: usa clear() si existe; si no, quita cada producto con remove()
      if (cart.clear) cart.clear();
      else cart.lines?.forEach((l) => cart.remove?.(l.id));
    } catch (err: any) {
      setError(err.message);
      setStatus("form");
    }
  }

  // ---------- Pago aprobado ----------
  if (status === "ok") {
    return (
      <div className="mx-auto max-w-md p-6">
        <div className="rounded-2xl bg-card p-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lime text-3xl font-black text-black">✓</div>
          <h1 className="text-2xl font-black">¡Pago aprobado!</h1>
          <p className="mt-2 opacity-80">Pedido #{orderId} · {cop(total)}</p>
          {result && (
            <p className="mt-1 text-sm opacity-70">
              {result.detail} · Ref. {result.paymentId}
            </p>
          )}
          <p className="mt-4 text-sm opacity-80">Te enviaremos la confirmación al correo registrado.</p>
          <Link href="/tienda" className="mt-6 inline-block rounded-lg bg-star px-6 py-3 font-bold text-black hover:brightness-110">
            Volver a la tienda
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Formulario de pago ----------
  const busy = status === "processing";
  const busyText = method === "nequi" ? "Esperando aprobación en Nequi…" : method === "pse" ? "Conectando con tu banco…" : "Procesando pago…";
  const title = method === "nequi" ? "Pago con Nequi" : method === "pse" ? "Pago con PSE" : "Pago con tarjeta";

  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-2">
      <section className="rounded-2xl bg-card p-6 text-white">
        <h2 className="mb-4 text-xl font-black">Pedido #{orderId}</h2>
        {lines.map((l, i) => (
          <div key={i} className="flex items-center justify-between gap-3 border-b border-white/10 py-2">
            <span className="flex min-w-0 items-center gap-2">
              <ProductGlyph product={{ id: l.id, name: l.name }} className="h-5 w-5 shrink-0" />
              <span className="truncate">{l.name} × {l.quantity}</span>
            </span>
            <span>{cop(l.subtotal)}</span>
          </div>
        ))}
        <p className="mt-4 text-right text-2xl font-black text-star">Total: {cop(total)}</p>
      </section>

      <form onSubmit={pay} className="space-y-3 rounded-2xl bg-card p-6">
        <h2 className="text-xl font-black text-white">{title}</h2>

        {/* Medios aceptados: el que se detecta se ilumina solo; PSE se activa tocándolo */}
        <div aria-label="Medios de pago aceptados" className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-white/60">Aceptamos:</span>
          {ACCEPTED.map((a) => {
            const on = activeBrand === a.key;
            const cls = `flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-bold transition ${
              on ? "border-star bg-deep text-star" : "border-transparent bg-deep/60 text-white/70"
            }`;
            const inner = (<><Icon icon={a.icon} width={15} height={15} />{a.key}</>);
            return a.key === "PSE" ? (
              <button type="button" key={a.key} disabled={busy} aria-pressed={on} title="Pagar con tu banco (PSE)"
                onClick={() => { setMode(mode === "pse" ? "auto" : "pse"); setError(""); }}
                className={`${cls} hover:text-white disabled:opacity-60`}>{inner}</button>
            ) : (
              <span key={a.key} className={cls}>{inner}</span>
            );
          })}
        </div>
        <p className="text-xs text-white/60">
          {mode === "pse"
            ? "Pagarás desde tu banco."
            : "Escribe tu número de tarjeta o tu celular de Nequi y detectamos el medio de pago solo. Para pagar con tu banco, toca PSE."}
        </p>

        <p className="rounded-lg bg-deep/70 p-3 text-xs text-white/80">
          🧪 Pasarela de pruebas: no se hace ningún cobro real.
          {mode === "pse" ? (
            <span className="mt-1 block">Elige “Banco que aprueba” o “Banco que rechaza” para probar los dos resultados.</span>
          ) : (
            <>
              <span className="mt-2 block">Tarjeta de prueba (cualquier fecha futura y CVC):</span>
              <span className="mt-1 flex flex-wrap gap-2">
                {TEST_CARDS.map((t) => (
                  <button type="button" key={t.number} onClick={() => onNumber(t.number)} className={chip}>{t.label}</button>
                ))}
              </span>
              <span className="mt-2 block">Nequi de prueba:</span>
              <span className="mt-1 flex flex-wrap gap-2">
                <button type="button" onClick={() => onNumber(NEQUI_OK)} className={chip}>Aprobado</button>
                <button type="button" onClick={() => onNumber(NEQUI_DECLINED)} className={chip}>Rechazado</button>
              </span>
            </>
          )}
        </p>

        {/* ---------- TARJETA o NEQUI (mismo campo, se detecta solo) ---------- */}
        {mode === "auto" && (
          <>
            <div className="relative">
              <input id="c-number" required inputMode="numeric" placeholder=" " className={field}
                autoComplete={det.method === "nequi" ? "tel-national" : "cc-number"}
                value={num} onChange={(e) => onNumber(e.target.value)} />
              <label htmlFor="c-number" className={label}>Número de tarjeta o celular Nequi</label>
              {det.brand && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/70">{det.brand}</span>}
            </div>

            {method === "card" && (
              <>
                <div className="relative">
                  <input id="c-name" required autoComplete="cc-name" placeholder=" " className={field}
                    value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                  <label htmlFor="c-name" className={label}>Nombre en la tarjeta</label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input id="c-exp" required inputMode="numeric" autoComplete="cc-exp" placeholder=" " className={field}
                      value={card.expiry} onChange={(e) => setCard({ ...card, expiry: expiryFmt(e.target.value) })} />
                    <label htmlFor="c-exp" className={label}>Vence (MM/AA)</label>
                  </div>
                  <div className="relative">
                    <input id="c-cvc" required inputMode="numeric" autoComplete="cc-csc" placeholder=" " className={field}
                      value={card.cvc} onChange={(e) => setCard({ ...card, cvc: digits(e.target.value).slice(0, 4) })} />
                    <label htmlFor="c-cvc" className={label}>CVC</label>
                  </div>
                </div>
              </>
            )}

            {method === "nequi" && (
              <p className="rounded-lg bg-deep/60 p-3 text-sm text-white/80">
                Detectamos un celular de Nequi. Al pagar te enviaremos una notificación a tu app para que apruebes el pago.
              </p>
            )}
          </>
        )}

        {/* ---------- PSE ---------- */}
        {mode === "pse" && (
          <>
            <div className="relative">
              <select id="p-bank" required className={select} value={pse.bank} onChange={(e) => setPse({ ...pse, bank: e.target.value })}>
                <option value="" disabled>Selecciona tu banco</option>
                {PSE_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <label htmlFor="p-bank" className={selectLabel}>Banco</label>
              <Icon icon="lucide:chevron-down" width={18} height={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/60" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <select id="p-person" className={select} value={pse.personType} onChange={(e) => setPse({ ...pse, personType: e.target.value })}>
                  {PERSON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <label htmlFor="p-person" className={selectLabel}>Tipo de persona</label>
                <Icon icon="lucide:chevron-down" width={18} height={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/60" />
              </div>
              <div className="relative">
                <select id="p-doctype" className={select} value={pse.docType} onChange={(e) => setPse({ ...pse, docType: e.target.value })}>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <label htmlFor="p-doctype" className={selectLabel}>Documento</label>
                <Icon icon="lucide:chevron-down" width={18} height={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/60" />
              </div>
            </div>

            <div className="relative">
              <input id="p-doc" required inputMode="numeric" placeholder=" " className={field}
                value={pse.docNumber} onChange={(e) => setPse({ ...pse, docNumber: digits(e.target.value).slice(0, 12) })} />
              <label htmlFor="p-doc" className={label}>Número de documento</label>
            </div>

            <button type="button" disabled={busy} onClick={() => setMode("auto")} className="text-sm text-white/70 hover:text-white">
              ← Pagar con tarjeta o Nequi
            </button>
          </>
        )}

        {error && <p className="rounded-lg bg-black/20 p-3 text-sm text-star">⚠ {error}</p>}

        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-lime py-3 font-bold text-black disabled:opacity-60">
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />}
          {busy ? busyText : `Pagar ${cop(total)}`}
        </button>
        <Link href="/checkout" className="block text-center text-sm text-white/70 hover:text-white">← Volver al carrito</Link>
      </form>
    </div>
  );
}