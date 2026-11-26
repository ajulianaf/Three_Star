"use client";
import { usePathname } from "next/navigation";

type IconProps = { size?: number };

function YouTube({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5v5l4.5-2.5z" />
    </svg>
  );
}

function Instagram({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function TikTok({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.3 2.4 1.9 4 4.5 4.2" />
    </svg>
  );
}

/* Mismo contenido en todo el sitio; solo cambia el color de fondo en Soul Bond */
export default function Footer() {
  const path = usePathname();
  const bg = path.startsWith("/soul-bond") ? "bg-[#2B2B2B]" : "bg-deep";

  return (
    <footer className={`${bg} px-4 py-6 text-center text-white`}>
      
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Three Star" className="mx-auto h-8 w-auto brightness-0 invert" />
      <p className="mt-2 text-xs text-white/80">
        © 2026 Three Star Studio. Todos los derechos reservados.
      </p>
    </footer>
  );
}