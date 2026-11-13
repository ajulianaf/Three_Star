"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";

const TABS = [
  ["Inicio", "/"],
  ["Soul Bond", "/soul-bond"],
  ["Tienda", "/tienda"],
  ["Nosotros", "/nosotros"],
];

export default function Header() {
  const path = usePathname();
  const { count } = useCart();
  const isSoul = path.startsWith("/soul-bond");
  const [open, setOpen] = useState(false); // menú desplegable (solo en celular)

  // Al cambiar de página, el menú se cierra solo
  useEffect(() => setOpen(false), [path]);

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);

  // Colores del enlace según la página (Soul Bond usa rojo, el resto amarillo)
  const linkClass = (href: string) =>
    isActive(href)
      ? isSoul
        ? "text-[#E11D2E] underline decoration-2 underline-offset-4"
        : "text-[#232350] underline decoration-2 underline-offset-4"
      : isSoul
      ? "hover:text-white/70"
      : "hover:text-lime";

  return (
    <header className={`px-4 py-3 text-white md:px-6 ${isSoul ? "bg-[#130005]" : "bg-[#9B8EE0]"}`}>
      <div className="flex items-center justify-between gap-3">
        {/* Logo: más pequeño en celular */}
        {isSoul ? (
          <Link href="/soul-bond" className="block h-10 w-32 shrink-0 md:h-14 md:w-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/SoulBond_logo.png" alt="Soul Bond" className="h-full w-full object-contain object-left" />
          </Link>
        ) : (
          <Link href="/" className="block shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Three Star" className="h-10 w-auto md:h-14" />
          </Link>
        )}

        {/* Menú en línea: solo desde tablet (md) hacia arriba */}
        <nav className="hidden gap-6 text-lg md:flex">
          {TABS.map(([label, href]) => (
            <Link key={href} href={href} className={linkClass(href)}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/checkout" className="whitespace-nowrap rounded-full bg-star px-3 py-1 text-sm text-black md:px-4">
            🛒 <span className="hidden sm:inline">Carrito </span>({count})
          </Link>

          {/* Botón hamburguesa: solo en celular */}
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-lg md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú desplegado en celular */}
      {open && (
        <nav className="mt-3 flex flex-col border-t border-white/25 pt-2 text-lg md:hidden">
          {TABS.map(([label, href]) => (
            <Link key={href} href={href} className={`rounded-lg px-2 py-3 ${linkClass(href)}`}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
