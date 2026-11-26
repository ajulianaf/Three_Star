"use client";
import { useEffect, useRef, useState } from "react";

/* ============ AJUSTES ============ */
const SHOW_MS = 2200;        // cuánto dura la animación antes de desvanecerse
const FADE_MS = 600;         // duración del desvanecido
const SONIDO = true;         // false = sin sonido
const VOLUMEN = 0.35;        // 0 a 1
const SONIDO_ARCHIVO = "";   // opcional: tu propio audio, ej. "/sonidos/soul-bond.mp3". Si está vacío, se genera un latido + zumbido de neón
const LOGO = "/SoulBond_logo.png";
const PRIMERA_CARGA_MS = 3000; // si la página se abre directo (la pantalla de carga del sitio ya está visible), no se muestra

/* ============ SONIDO ============
   Los navegadores solo dejan sonar audio si la persona ya tocó la página. Al llegar desde el menú o desde el
   botón del carrusel eso se cumple. Si entra escribiendo la dirección, el sonido simplemente no suena. */
function playSound(): () => void {
  try {
    if (SONIDO_ARCHIVO) {
      const a = new Audio(SONIDO_ARCHIVO);
      a.volume = VOLUMEN;
      a.play().catch(() => {});
      return () => a.pause();
    }
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = VOLUMEN;
    out.connect(ctx.destination);

    // Dos latidos graves ("thump-thump")
    const thump = (t: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(95, t0 + t);
      o.frequency.exponentialRampToValueAtTime(38, t0 + t + 0.2);
      g.gain.setValueAtTime(0.0001, t0 + t);
      g.gain.exponentialRampToValueAtTime(1, t0 + t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + 0.32);
      o.connect(g).connect(out);
      o.start(t0 + t);
      o.stop(t0 + t + 0.35);
    };
    thump(0.05);
    thump(0.33);

    // Zumbido de neón que parpadea al encenderse (sincronizado con el logo)
    const buzz = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const bg = ctx.createGain();
    buzz.type = "sawtooth";
    buzz.frequency.value = 100;
    lp.type = "lowpass";
    lp.frequency.value = 700;
    bg.gain.setValueAtTime(0, t0);
    [[0.2, 0.35], [0.26, 0], [0.31, 0.3], [0.37, 0], [0.43, 0.5]].forEach(([t, v]) => bg.gain.setValueAtTime(v, t0 + t));
    bg.gain.linearRampToValueAtTime(0.12, t0 + 1.2);
    bg.gain.linearRampToValueAtTime(0, t0 + 2);
    buzz.connect(lp).connect(bg).connect(out);
    buzz.start(t0);
    buzz.stop(t0 + 2.1);

    return () => { ctx.close().catch(() => {}); };
  } catch {
    return () => {};
  }
}

/* ============ ANIMACIÓN DE ENTRADA ============ */
const CSS = `
.sbi { position: fixed; inset: 0; z-index: 90; display: flex; align-items: center; justify-content: center;
  background: #130005; cursor: pointer; transition: opacity ${FADE_MS}ms ease; }
.sbi.sbi-out { opacity: 0; pointer-events: none; }
.sbi-box { width: min(70vw, 520px); display: flex; flex-direction: column; align-items: center; gap: 1.4rem; }
.sbi-logo { width: 100%; height: auto; opacity: 0; animation: sbi-flicker 1.4s steps(1, end) .15s forwards; }
@keyframes sbi-flicker {
  0%   { opacity: 0; }
  8%   { opacity: .9; filter: drop-shadow(0 0 6px #ff2942); }
  10%  { opacity: .05; }
  14%  { opacity: .8; }
  18%  { opacity: .1; }
  24%  { opacity: 1; filter: drop-shadow(0 0 8px #FF2E45) drop-shadow(0 0 22px rgba(225,29,72,.9)); }
  100% { opacity: 1; filter: drop-shadow(0 0 10px #FF2E45) drop-shadow(0 0 30px rgba(225,29,72,.9)); }
}
.sbi-line { height: 3px; width: 0; border-radius: 3px; background: #FF3B4E;
  box-shadow: 0 0 10px #FF2E45, 0 0 24px rgba(225,29,72,.9);
  animation: sbi-line .8s cubic-bezier(.2,.7,.2,1) .9s forwards; }
@keyframes sbi-line { to { width: 100%; } }
.sbi-hint { position: absolute; bottom: 1.5rem; font-size: .7rem; letter-spacing: .25em; text-transform: uppercase; color: rgba(255,255,255,.35); }
@media (prefers-reduced-motion: reduce) {
  .sbi-logo { animation: none; opacity: 1; }
  .sbi-line { animation: none; width: 100%; }
}
`;

export default function SoulBondIntro() {
  const [phase, setPhase] = useState<"on" | "out" | "gone">("on");
  const stopSound = useRef<() => void>(() => {});

  useEffect(() => {
    // Si la página se abrió directo, la pantalla de carga del sitio ya hace de entrada: no se repite
    if (performance.now() < PRIMERA_CARGA_MS) { setPhase("gone"); return; }

    if (SONIDO) stopSound.current = playSound();
    const t1 = setTimeout(() => setPhase("out"), SHOW_MS);
    const t2 = setTimeout(() => setPhase("gone"), SHOW_MS + FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); stopSound.current(); };
  }, []);

  // Un toque o la tecla Esc saltan la animación
  const skip = () => { stopSound.current(); setPhase("out"); setTimeout(() => setPhase("gone"), FADE_MS); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") skip(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (phase === "gone") return null;

  return (
    <>
      <style>{CSS}</style>
      <div className={`sbi ${phase === "out" ? "sbi-out" : ""}`} onClick={skip} role="presentation">
        <div className="sbi-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sbi-logo" src={LOGO} alt="Soul Bond" />
          <div className="sbi-line" />
        </div>
        <span className="sbi-hint">Toca para saltar</span>
      </div>
    </>
  );
}