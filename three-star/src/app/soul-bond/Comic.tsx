"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as RPointerEvent } from "react";

/* ============ CONFIGURACIÓN ============
   Coloca las imágenes en /public/comic/ con estos nombres:
   pagina-01.jpg (portada), pagina-02.jpg ... pagina-20.jpg (contraportada)
   y el PDF en /public/comic/soul-bond.pdf
   Si tus imágenes son .png o .webp, cambia EXT. */
const TOTAL = 20; // portada + páginas interiores + contraportada (debe ser par)
const EXT = "png";
const CARPETA = "/comic";
const PDF = "/comic/soul-bond.pdf";
const PAGE_W = 210; // proporción de una página (ancho : alto). A4 = 210 x 297
const PAGE_H = 297;
const FLIP_MS = 900; // duración del giro de página (debe coincidir con .9s del CSS)

const pagePath = (n: number) => `${CARPETA}/pagina-${String(n).padStart(2, "0")}.${EXT}`;
const pageLabel = (n: number) => (n === 1 ? "Portada" : n === TOTAL ? "Contraportada" : `Página ${n}`);

/* ============ ESTILOS (prefijo "cm-" para no chocar con el resto del sitio) ============ */
const CSS = `
.cm-wrap { --c: #FF3B4E; --rgb: 255,59,78; padding: 0; }
.cm-wrap *, .cm-wrap *::before, .cm-wrap *::after { box-sizing: border-box; }

.cm-pdf, .cm-mode {
  padding: .55rem 1rem; border-radius: 999px; text-decoration: none; font: inherit; font-size: .85rem; cursor: pointer; white-space: nowrap;
  color: #fff; background: var(--c); border: 1px solid var(--c); box-shadow: 0 0 14px rgba(var(--rgb), .55); transition: transform .2s, box-shadow .2s;
}
.cm-pdf:hover, .cm-pdf:focus-visible, .cm-mode:hover, .cm-mode:focus-visible { transform: translateY(-1px); box-shadow: 0 0 24px rgba(var(--rgb), .9); outline: none; }
.cm-mode { background: transparent; color: var(--c); }

/* ---- Libro 3D ---- */
.cm-stage { perspective: 2600px; padding: .25rem 0 .75rem; touch-action: pan-y; user-select: none; cursor: pointer; }
.cm-book {
  /* El libro se ajusta al alto de la pantalla (--off = espacio reservado para menú y controles) para verse completo al entrar */
  position: relative; margin: 0 auto; aspect-ratio: var(--ar);
  width: min(100%, max(240px, min(1100px, calc((100vh - var(--off)) * var(--r)))));
  width: min(100%, max(240px, min(1100px, calc((100svh - var(--off)) * var(--r)))));
  transform-style: preserve-3d; transition: transform .9s cubic-bezier(.2,.7,.2,1);
}
.cm-leaf {
  position: absolute; top: 0; left: 50%; width: 50%; height: 100%;
  transform-origin: left center; transform-style: preserve-3d;
  transition: transform .9s cubic-bezier(.45,.05,.25,1), z-index 0s .45s;
}
.cm-flipped { transform: rotateY(-180deg); }

.cm-face {
  position: absolute; inset: 0; overflow: hidden; background: #15151a;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
}
.cm-front { border-radius: 0 6px 6px 0; }
.cm-back { transform: rotateY(180deg); border-radius: 6px 0 0 6px; }

/* Sombra del lomo (cerca del centro del libro) */
.cm-front::after, .cm-back::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
.cm-front::after { background: linear-gradient(to right, rgba(0,0,0,.4), transparent 12%); }
.cm-back::after { background: linear-gradient(to left, rgba(0,0,0,.4), transparent 12%); }

/* Mientras la hoja gira, se oscurece a mitad del giro, como si le cambiara la luz */
.cm-turn .cm-face::before {
  content: ""; position: absolute; inset: 0; z-index: 2; pointer-events: none; background: #000; opacity: 0;
  animation: cm-shade .9s ease-in-out;
}
@keyframes cm-shade { 0%, 100% { opacity: 0; } 50% { opacity: .55; } }

.cm-img { position: absolute; inset: 0; }
.cm-img img { width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; -webkit-user-drag: none; }

/* La portada brilla con el neón del sitio */
.cm-leaf:first-child .cm-front { box-shadow: 0 0 34px rgba(var(--rgb), .45), 0 0 4px rgba(var(--rgb), .8); }
.cm-book::before {
  content: ""; position: absolute; left: 10%; right: 10%; bottom: -18px; height: 26px; border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(var(--rgb), .35), transparent 70%); filter: blur(6px);
}

/* Modo una sola página (celular): la hoja gira y desaparece al pasar */
.cm-single .cm-leaf { left: 0; width: 100%; }
.cm-single .cm-front { border-radius: 6px; }
.cm-single .cm-front::after { background: linear-gradient(to right, rgba(0,0,0,.35), transparent 8%); }

/* ---- Controles ---- */
.cm-controls { display: flex; align-items: center; justify-content: center; gap: .75rem; margin-top: .25rem; flex-wrap: wrap; }
.cm-top {
  /* Va en el espacio vacío que deja el padding superior de la sección: no le quita alto al libro */
  display: flex; justify-content: flex-end; align-items: center; gap: .6rem; height: 2.1rem; margin: -2.3rem 0 .2rem;
}
.cm-btn {
  padding: .6rem 1.1rem; border-radius: 999px; cursor: pointer; font: inherit; font-size: .85rem;
  color: var(--c); background: transparent; border: 1px solid var(--c); transition: background .2s, box-shadow .2s, opacity .2s;
}
.cm-btn:hover:not(:disabled), .cm-btn:focus-visible { background: rgba(var(--rgb), .18); box-shadow: 0 0 16px rgba(var(--rgb), .6); outline: none; }
.cm-btn:disabled { opacity: .3; cursor: default; }
.cm-label { min-width: 9rem; text-align: center; font-size: .85rem; color: rgba(255,255,255,.75); }

/* ---- Lectura vertical (opcional en celular) ---- */
.cm-scroll { display: grid; gap: 1rem; max-width: 520px; margin: 0 auto; }
.cm-page { margin: 0; background: #15151a; border-radius: 6px; overflow: hidden; }
.cm-page img { display: block; width: 100%; height: auto; }
.cm-page:first-child { box-shadow: 0 0 28px rgba(var(--rgb), .4); }
.cm-skeleton { height: 60vh; }

@media (prefers-reduced-motion: reduce) {
  .cm-book, .cm-leaf { transition-duration: .01s; }
  .cm-turn .cm-face::before { animation: none; }
}
`;

/* ============ LIBRO 3D ============
   single = false: libro abierto con dos páginas (pantallas anchas)
   single = true:  una página a la vez, con el mismo giro de hoja (celular) */
function Book({ single }: { single: boolean }) {
  const leaves = single ? TOTAL : TOTAL / 2; // hojas del libro
  const max = single ? TOTAL - 1 : leaves; // cuántas hojas se pueden voltear
  const [current, setCurrent] = useState(0); // hojas ya volteadas
  const [turning, setTurning] = useState<number | null>(null); // hoja que está girando ahora
  const reach = useRef(2); // hasta qué hoja se han cargado imágenes
  const timer = useRef<number | undefined>(undefined);
  const down = useRef<{ x: number; y: number } | null>(null);
  reach.current = Math.max(reach.current, current + 2);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = useCallback((delta: 1 | -1) => {
    setCurrent((c) => {
      const n = Math.min(Math.max(c + delta, 0), max);
      if (n === c) return c;
      setTurning(delta === 1 ? n - 1 : n); // la hoja que se mueve
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setTurning(null), FLIP_MS);
      return n;
    });
  }, [max]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Arrastrar o deslizar el dedo pasa la página; un toque pasa hacia el lado tocado
  const onDown = (e: RPointerEvent<HTMLDivElement>) => { down.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - d.y)) return go(dx < 0 ? 1 : -1);
    if (Math.abs(dx) > 10) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const right = e.clientX > rect.left + rect.width / 2;
    if (!single && current === 0) return go(1); // portada cerrada: abre
    if (!single && current === max) return go(-1); // contraportada: cierra hacia atrás
    go(right ? 1 : -1);
  };

  // Con el libro cerrado se centra: portada a la derecha, contraportada a la izquierda
  const shift = single ? 0 : current === 0 ? -25 : current === max ? 25 : 0;
  const label = single
    ? `${pageLabel(current + 1)} · ${current + 1} de ${TOTAL}`
    : current === 0 ? "Portada" : current === max ? "Contraportada" : `Páginas ${2 * current} y ${2 * current + 1}`;
  const pages = single ? 1 : 2; // páginas visibles a la vez
  const style = {
    "--ar": `${PAGE_W * pages} / ${PAGE_H}`,
    "--r": ((PAGE_W * pages) / PAGE_H).toFixed(4),
    "--off": single ? "19rem" : "14rem", // alto reservado: menú del sitio, espacios y controles (así se ven al entrar)
  } as CSSProperties;

  return (
    <>
      <div className={`cm-stage${single ? " cm-single" : ""}`} style={style} onPointerDown={onDown} onPointerUp={onUp}>
        <div className="cm-book" style={{ transform: `translateX(${shift}%)` }}>
          {Array.from({ length: leaves }, (_, i) => {
            const flipped = i < current;
            const load = i <= reach.current;
            const front = single ? i + 1 : 2 * i + 1;
            const back = single ? null : 2 * i + 2;
            return (
              <div
                key={i}
                className={`cm-leaf${flipped ? " cm-flipped" : ""}${turning === i ? " cm-turn" : ""}`}
                style={{ zIndex: flipped ? i : leaves - i }}
              >
                <div className="cm-face cm-front">
                  <div className="cm-img">{load && <img src={pagePath(front)} alt={pageLabel(front)} draggable={false} />}</div>
                </div>
                {back && (
                  <div className="cm-face cm-back">
                    <div className="cm-img">{load && <img src={pagePath(back)} alt={pageLabel(back)} draggable={false} />}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="cm-controls">
        <button type="button" className="cm-btn" onClick={() => go(-1)} disabled={current === 0} aria-label="Página anterior">
          ‹ Anterior
        </button>
        <span className="cm-label" aria-live="polite">{label}</span>
        <button type="button" className="cm-btn" onClick={() => go(1)} disabled={current === max} aria-label="Página siguiente">
          Siguiente ›
        </button>
      </div>
    </>
  );
}

/* ============ LECTURA VERTICAL (opcional en celular) ============ */
function Scroll() {
  const style = { aspectRatio: `${PAGE_W} / ${PAGE_H}` } as CSSProperties;
  return (
    <div className="cm-scroll">
      {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => (
        <figure className="cm-page" key={n} style={style}>
          <img src={pagePath(n)} alt={pageLabel(n)} loading={n <= 2 ? "eager" : "lazy"} decoding="async" />
        </figure>
      ))}
    </div>
  );
}

/* ============ COMPONENTE PRINCIPAL ============ */
export default function Comic() {
  const [wide, setWide] = useState<boolean | null>(null);
  const [vertical, setVertical] = useState(false); // solo en celular: alternar libro / lectura vertical

  useEffect(() => {
    const mq = matchMedia("(min-width: 768px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div className="cm-wrap">
        {/* Esquina superior derecha: descarga del PDF (y, en celular, el cambio de modo de lectura) */}
        <div className="cm-top">
          {wide === false && (
            <button type="button" className="cm-mode" onClick={() => setVertical((v) => !v)}>
              {vertical ? "Modo libro" : "Lectura vertical"}
            </button>
          )}
          <a className="cm-pdf" href={PDF} download>Descargar PDF</a>
        </div>

        {wide === null ? <div className="cm-skeleton" /> : wide ? <Book single={false} /> : vertical ? <Scroll /> : <Book single />}
      </div>
    </>
  );
}