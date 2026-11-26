"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/* ============ TIPOS ============ */
type ModelType = "nico" | "leo" | "evangeline";
type Vec3 = [number, number, number];

interface Character {
  id: string;
  name: string;
  color: string; // color neón en hex
  rgb: string; // el mismo color en "r,g,b" para transparencias en CSS
  model: ModelType;
  role: string;
  bio: string;
  twine?: string; // solo Evangeline: enlace a su historia en Twine
  glb?: string; // ruta del modelo 3D en /public (opcional). Si falta o falla, se usa el modelo de prueba
}

interface HoloMaterials {
  body: THREE.MeshStandardMaterial;
  rim: THREE.ShaderMaterial;
  line: THREE.LineBasicMaterial;
}

/* ============ DATOS DE LOS PERSONAJES ============
   Edita aquí nombre, color, resumen y estadísticas. "model" elige el modelo 3D procedural. */
const CHARACTERS: Character[] = [
  { id: "nico", name: "Nico", color: "#FF3366", rgb: "255,51,102", model: "nico", glb: "/modelos/Nico.glb",
    role: "El buscador",
    bio: "Nico, un joven campesino de la Italia medieval, emprende la búsqueda de su hermano Leo tras su misteriosa desaparición. Pero en las sombras descubre un antiguo **Linaje** que los une a una **venganza** olvidada, una que podría condenarlos a no encontrarse jamás." },
  { id: "leo", name: "Leo", color: "#00FF88", rgb: "0,255,136", model: "leo", glb: "/modelos/Leo.glb",
    role: "El desaparecido",
    bio: "Leo, el hermano menor de Nico, desaparece sin dejar rastro, arrastrado hacia las sombras por una fuerza que desconoce. Sin saberlo, su sangre guarda el vínculo con un antiguo **Linaje** y un destino marcado por una **venganza** que nunca le perteneció." },
  { id: "evangeline", name: "Evangeline", color: "#A855F7", rgb: "168,85,247", model: "evangeline", glb: "/modelos/Evangeline.glb",
    role: "La desterrada",
    bio: "Evangeline, una antigua guardiana desterrada al Infierno, aguarda entre las sombras desde hace siglos. El **Linaje** es la llave de su poder y el camino para consumar una **venganza** que aún clama por sangre.",
    twine: "/twine/evangeline.html" },
];

/* ============ ESTILOS (todas las clases llevan el prefijo "sb-" para no chocar con el resto del sitio) ============ */
const CSS = `
/* Responsive: 1 columna en celular y tablet, 2 en pantallas medianas (la tercera centrada) y 3 en pantallas grandes */
.sb-wrap { padding: 1.5rem .5rem; }
.sb-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; justify-items: center; }
@media (min-width: 900px) {
  .sb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sb-grid > .sb-card:last-child:nth-child(odd) { grid-column: 1 / -1; width: calc(50% - .75rem); }
}
@media (min-width: 1200px) {
  .sb-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sb-grid > .sb-card:last-child:nth-child(odd) { grid-column: auto; width: 100%; }
}
.sb-grid *, .sb-grid *::before, .sb-grid *::after { box-sizing: border-box; }

.sb-card { --c: #fff; --rgb: 255,255,255; width: 100%; max-width: 420px; height: 520px; perspective: 1200px; }
.sb-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .8s cubic-bezier(.2,.7,.2,1); }
.sb-face {
  position: absolute; inset: 0; border-radius: 18px; overflow: hidden;
  background: linear-gradient(160deg, #16161d, #0d0d11); border: 1px solid rgba(255,255,255,.1);
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
  transition: border-color .4s, box-shadow .4s;
}
.sb-card:hover .sb-face, .sb-card:focus-within .sb-face {
  border-color: rgba(var(--rgb), .7);
  box-shadow: 0 0 28px rgba(var(--rgb), .25), inset 0 0 22px rgba(var(--rgb), .08);
}

/* Hover = volteo 3D de 180° (en táctil, un toque). Con el holograma activo la tarjeta se queda de frente. */
.sb-card:not(.sb-holo):is(:hover, :focus-within, .sb-flipped) .sb-inner { transform: rotateY(180deg); }

/* Cara frontal */
.sb-front { display: flex; flex-direction: column; }
.sb-portrait { flex: 1; display: flex; align-items: center; justify-content: center; transition: opacity .4s, transform .4s; }
.sb-portrait svg, .sb-portrait img { width: 78%; filter: drop-shadow(0 0 14px rgba(var(--rgb), .55)); }
.sb-nameplate {
  padding: .9rem 1.2rem 1.2rem; text-align: center; text-transform: uppercase; letter-spacing: .3em;
  font-size: .95rem; color: var(--c); text-shadow: 0 0 10px rgba(var(--rgb), .7);
}

/* Cara trasera: cabecera, historia y acciones, con aire entre bloques */
.sb-back { transform: rotateY(180deg); padding: 1.7rem 1.6rem 1.5rem; display: flex; flex-direction: column; gap: 1.4rem; }
.sb-head { text-align: center; }
.sb-back h2 { margin: 0; font-size: 1.3rem; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: var(--c); text-shadow: 0 0 12px rgba(var(--rgb), .6); }
.sb-role { display: block; margin-top: .55rem; font-size: .72rem; letter-spacing: .28em; text-transform: uppercase; color: #8a8f98; }
.sb-head::after { content: ""; display: block; width: 44px; height: 2px; margin: 1rem auto 0; border-radius: 2px; background: var(--c); box-shadow: 0 0 10px rgba(var(--rgb), .8); }
.sb-bio { margin: 0; font-size: .9rem; line-height: 1.7; color: #c4c7cd; text-align: left; }
.sb-bio em { font-style: normal; font-weight: 600; color: var(--c); text-shadow: 0 0 8px rgba(var(--rgb), .55); }

.sb-actions { margin-top: auto; display: grid; gap: .65rem; }

.sb-holo-btn {
  padding: .85rem 1rem; border: 0; border-radius: 10px; cursor: pointer;
  font: inherit; font-weight: 700; letter-spacing: .18em; font-size: .8rem; color: #0a0a0c;
  background: var(--c); box-shadow: 0 0 18px rgba(var(--rgb), .6); transition: transform .2s, box-shadow .2s;
  animation: sb-pulse 2.2s ease-in-out infinite;
}
.sb-holo-btn:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(var(--rgb), .95); }
@keyframes sb-pulse { 50% { box-shadow: 0 0 30px rgba(var(--rgb), .95); } }

/* Enlace a la historia en Twine */
.sb-twine-btn {
  display: block; padding: .7rem 1rem; border-radius: 10px; text-align: center; text-decoration: none;
  font-weight: 700; letter-spacing: .18em; font-size: .75rem; color: var(--c);
  background: transparent; border: 1px solid var(--c); transition: background .2s, box-shadow .2s;
}
.sb-twine-btn:hover, .sb-twine-btn:focus-visible { background: rgba(var(--rgb), .18); box-shadow: 0 0 18px rgba(var(--rgb), .6); outline: none; }

/* Proyección holográfica */
.sb-stage { position: absolute; inset: 0 0 54px 0; opacity: 0; visibility: hidden; transition: opacity .3s, visibility 0s .3s; }
.sb-card.sb-holo .sb-stage { opacity: 1; visibility: visible; transition: opacity .6s .45s, visibility 0s; }
.sb-card.sb-holo .sb-portrait { opacity: 0; transform: scale(.9); }

.sb-view { position: absolute; inset: 0; }
.sb-view canvas { width: 100%; height: 100%; display: block; }
.sb-msg { position: absolute; inset: 0; display: grid; place-items: center; padding: 1rem; text-align: center; font-size: .8rem; color: #9a9ea6; }

.sb-beam {
  position: absolute; left: 50%; bottom: 52px; width: 74%; height: 78%; transform: translateX(-50%);
  clip-path: polygon(0 0, 100% 0, 82% 100%, 18% 100%);
  background: linear-gradient(to top, rgba(var(--rgb), .38), rgba(var(--rgb), .06) 65%, transparent);
}
.sb-base {
  position: absolute; left: 50%; bottom: 36px; width: 78%; height: 34px; transform: translateX(-50%);
  border-radius: 50%; border: 1px solid var(--c);
  background: radial-gradient(ellipse at center, rgba(var(--rgb), .55), rgba(var(--rgb), .05) 70%);
  box-shadow: 0 0 26px var(--c), inset 0 0 18px rgba(var(--rgb), .7);
}
.sb-base::after { content: ""; position: absolute; inset: 7px 18%; border-radius: 50%; border: 1px solid rgba(var(--rgb), .8); animation: sb-ring 2s ease-in-out infinite; }
@keyframes sb-ring { 50% { opacity: .25; transform: scale(1.12); } }

/* El haz y la base van encima del canvas: no deben bloquear el arrastre */
.sb-beam, .sb-base { pointer-events: none; }

.sb-scan {
  position: absolute; inset: 0; pointer-events: none; mix-blend-mode: screen;
  background: repeating-linear-gradient(to bottom, transparent 0 2px, rgba(var(--rgb), .14) 2px 3px);
  animation: sb-lines 5s linear infinite;
}
@keyframes sb-lines { to { background-position: 0 24px; } }
.sb-sweep { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.sb-sweep::before {
  content: ""; position: absolute; left: 0; right: 0; height: 22%;
  background: linear-gradient(to bottom, transparent, rgba(var(--rgb), .22), transparent);
  animation: sb-sweep 3.2s linear infinite;
}
@keyframes sb-sweep { from { top: -25%; } to { top: 100%; } }

.sb-close {
  position: absolute; top: 12px; right: 12px; z-index: 6; opacity: 0; pointer-events: none;
  padding: .4rem .7rem; border-radius: 8px; cursor: pointer; font: inherit; font-size: .65rem; letter-spacing: .15em;
  color: var(--c); background: rgba(0,0,0,.55); border: 1px solid var(--c); transition: opacity .4s .5s, background .2s;
}
.sb-card.sb-holo .sb-close { opacity: 1; pointer-events: auto; }
.sb-close:hover { background: rgba(var(--rgb), .25); }

@media (prefers-reduced-motion: reduce) {
  .sb-inner { transition-duration: .01s; }
  .sb-scan, .sb-sweep::before, .sb-holo-btn, .sb-base::after { animation: none; }
}
`;

/* ============ IMAGEN 2D DE LA CARA FRONTAL ============
   Ahora es una silueta de ejemplo. Para usar tu imagen real: <img src="/personajes/nico.png" alt={c.name} /> */
function Portrait({ c }: { c: Character }) {
  const gid = `g-${c.id}`;
  return (
    <svg viewBox="0 0 200 240" fill="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.color} stopOpacity={0.95} />
          <stop offset="1" stopColor={c.color} stopOpacity={0.25} />
        </linearGradient>
      </defs>
      <circle cx="100" cy="82" r="44" fill={`url(#${gid})`} />
      <path d="M24 232c0-52 33-86 76-86s76 34 76 86z" fill={`url(#${gid})`} />
    </svg>
  );
}

/* Convierte **palabra** en <em> para resaltarla con el color del personaje */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((t, i) =>
        t.startsWith("**") ? <em key={i}>{t.slice(2, -2)}</em> : t
      )}
    </>
  );
}

/* ============ HOLOGRAMA 3D (Three.js) ============ */

/* Una pieza = malla translúcida + "cáscara" fresnel (rim light neón) + aristas luminosas */
function part(geo: THREE.BufferGeometry, mats: HoloMaterials, pos: Vec3 = [0, 0, 0], rot: Vec3 = [0, 0, 0]): THREE.Group {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.set(...rot);
  g.add(new THREE.Mesh(geo, mats.body));
  const shell = new THREE.Mesh(geo, mats.rim);
  shell.scale.setScalar(1.05);
  g.add(shell);
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), mats.line));
  return g;
}

/* Modelo low-poly procedural (se muestra mientras carga el .glb) */
function buildModel(type: ModelType, mats: HoloMaterials): THREE.Group {
  const m = new THREE.Group();
  m.add(part(new THREE.IcosahedronGeometry(0.55, 0), mats, [0, 1.55, 0])); // cabeza
  m.add(part(new THREE.CylinderGeometry(0.45, 0.6, 1.2, 6), mats, [0, 0.55, 0])); // torso
  m.add(part(new THREE.CylinderGeometry(0.4, 0.28, 1, 6), mats, [0, -0.55, 0])); // piernas
  m.add(part(new THREE.BoxGeometry(0.25, 0.9, 0.25), mats, [-0.72, 0.6, 0], [0, 0, 0.15])); // brazo izq.
  m.add(part(new THREE.BoxGeometry(0.25, 0.9, 0.25), mats, [0.72, 0.6, 0], [0, 0, -0.15])); // brazo der.

  if (type === "nico") { // pelo de picos + espada a la espalda
    for (let i = 0; i < 7; i++) {
      const a = (i / 6 - 0.5) * Math.PI * 1.1;
      m.add(part(new THREE.ConeGeometry(0.15, 0.55, 4), mats, [Math.sin(a) * 0.5, 2.05 + Math.cos(a) * 0.1, -0.1], [0, 0, -a]));
    }
    m.add(part(new THREE.BoxGeometry(0.1, 1.7, 0.06), mats, [0.35, 0.8, -0.55], [0, 0, 0.5]));
  }
  if (type === "leo") { // melena de picos alrededor de la cabeza + orejas
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      m.add(part(new THREE.ConeGeometry(0.13, 0.5, 4), mats, [Math.cos(a) * 0.72, 1.55 + Math.sin(a) * 0.72, -0.1], [0, 0, a - Math.PI / 2]));
    }
    m.add(part(new THREE.ConeGeometry(0.16, 0.3, 4), mats, [-0.3, 2.12, 0.1]));
    m.add(part(new THREE.ConeGeometry(0.16, 0.3, 4), mats, [0.3, 2.12, 0.1]));
  }
  if (type === "evangeline") { // cuernos + dos cristales que orbitan
    m.add(part(new THREE.ConeGeometry(0.14, 0.75, 5), mats, [-0.4, 2.05, 0], [0, 0, 0.5]));
    m.add(part(new THREE.ConeGeometry(0.14, 0.75, 5), mats, [0.4, 2.05, 0], [0, 0, -0.5]));
    const orbit = new THREE.Group();
    orbit.add(part(new THREE.OctahedronGeometry(0.2, 0), mats, [1.3, 1.1, 0]));
    orbit.add(part(new THREE.OctahedronGeometry(0.2, 0), mats, [-1.3, 0.4, 0]));
    m.add(orbit);
    m.userData.orbit = orbit;
  }
  return m;
}

/* ---- Cómo se ve tu modelo 3D (.glb) ---- */
const HOLOGRAFICO = false;  // false: conserva los colores y texturas originales del modelo. true: efecto holograma (translúcido + neón)
const ALTURA_MODELO = 3.1;  // alto del modelo en la escena (el modelo de prueba mide unos 3.15)
const PIES_Y = -1.05;       // altura de los pies sobre la peana (el centro de la escena es y = 0.5)
const OCULTAR_CONTORNO = true; // true: oculta el contorno negro (material "Contornos"). false: lo muestra
const REPRODUCIR_ANIMACION = true; // si un modelo se ve mal por su animación, ponlo en false

class Hologram {
  private host: HTMLElement;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  private renderer: THREE.WebGLRenderer;
  private mats: HoloMaterials;
  private model: THREE.Group;
  private ro: ResizeObserver;
  private raf = 0;
  private last = 0;
  private loop: (now: number) => void;
  private destroyed = false;
  private mixer?: THREE.AnimationMixer; // animaciones del modelo, si trae
  private note?: HTMLDivElement; // aviso "Cargando modelo…" / error
  private id: string;

  // --- interacción ---
  private dragging = false;
  private velY = 0; // velocidad angular por inercia (rad/s)
  private lastX = 0;
  private lastY = 0;
  private lastT = 0;
  private cleanupPointer: () => void = () => {};

  constructor(host: HTMLElement, c: Character) {
    this.host = host;
    this.id = c.name;
    const accent = new THREE.Color(c.color);

    // Cámara y renderizador con fondo transparente (se ve la tarjeta detrás)
    this.camera.position.set(0, 0.5, 6.5);
    this.camera.lookAt(0, 0.5, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping; // sin tone mapping: los colores salen tal cual están en la textura
    host.appendChild(this.renderer.domElement);

    // Materiales: cuerpo translúcido, rim light fresnel y aristas de neón
    this.mats = {
      body: new THREE.MeshStandardMaterial({
        color: accent.clone().multiplyScalar(0.35), emissive: accent, emissiveIntensity: 0.35,
        flatShading: true, transparent: true, opacity: 0.85, roughness: 0.4, metalness: 0.2,
      }),
      rim: new THREE.ShaderMaterial({
        uniforms: { color: { value: accent } },
        vertexShader: `varying vec3 vN; varying vec3 vV;
          void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 color; varying vec3 vN; varying vec3 vV;
          void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); gl_FragColor = vec4(color, f * 0.9); }`,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }),
      line: new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.55 }),
    };

    // Luces. En modo holograma: ambiente de color + frontal + contraluz neón.
    // En modo colores originales: luz blanca/neutra para no teñir el modelo, más una luz hemisférica.
    if (HOLOGRAFICO) {
      this.scene.add(new THREE.AmbientLight(accent, 0.6));
    } else {
      // Luz suave: antes había demasiada y los colores se "quemaban" hasta quedar blancos
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 0.6));
      const fill = new THREE.DirectionalLight(0xffffff, 1.0);
      fill.position.set(2, 3, 4);
      this.scene.add(fill);
    }
    if (HOLOGRAFICO) {
      const key = new THREE.PointLight(0xffffff, 0.8);
      key.position.set(2, 3, 4);
      this.scene.add(key);
      const rimLight = new THREE.PointLight(accent, 1.2);
      rimLight.position.set(-3, 1, -2);
      this.scene.add(rimLight);
    }

    this.model = buildModel(c.model, this.mats);
    this.scene.add(this.model);
    if (c.glb) {
      // Aviso pequeño sobre el holograma: muestra el progreso de carga o si falló
      this.note = document.createElement("div");
      this.note.style.cssText = `position:absolute;left:12px;top:46px;z-index:3;pointer-events:none;font-size:11px;letter-spacing:.08em;color:${c.color}`;
      this.note.textContent = "Cargando modelo…";
      host.appendChild(this.note);
      this.loadGlb(c.glb); // mientras carga se ve el modelo de prueba
    }

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();

    // Arrastrar para girar el modelo (ratón y táctil)
    const el = this.renderer.domElement;
    const MAX_TILT = 0.6;

    const onDown = (e: PointerEvent) => {
      this.dragging = true;
      this.velY = 0;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.lastT = e.timeStamp;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      const dt = Math.max((e.timeStamp - this.lastT) / 1000, 0.008);
      this.model.rotation.y += dx * 0.01;
      this.model.rotation.x = THREE.MathUtils.clamp(this.model.rotation.x + dy * 0.01, -MAX_TILT, MAX_TILT);
      this.velY = THREE.MathUtils.clamp((dx * 0.01) / dt, -8, 8);
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.lastT = e.timeStamp;
    };
    const onUp = (e: PointerEvent) => {
      this.dragging = false;
      el.style.cursor = "grab";
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    el.style.cursor = "grab";
    el.style.touchAction = "none"; // evita que el dedo haga scroll mientras giras
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    this.cleanupPointer = () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };

    // Bucle: giro suave + inercia + flotación + cristales orbitando
    const speed = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.25 : 0.9;
    this.loop = (now: number) => {
      this.raf = requestAnimationFrame(this.loop);
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      if (!this.dragging) {
        // la inercia se apaga poco a poco y queda el giro automático
        this.velY *= Math.exp(-dt * 3);
        this.model.rotation.y += (speed + this.velY) * dt;
        // la inclinación vuelve suavemente a 0
        this.model.rotation.x *= Math.exp(-dt * 2.5);
      }
      this.model.position.y = Math.sin(now / 650) * 0.06;
      const orbit = this.model.userData.orbit as THREE.Group | undefined;
      if (orbit) {
        orbit.rotation.y -= dt * 1.6;
        orbit.position.y = Math.sin(now / 500) * 0.12;
      }
      this.mixer?.update(dt);
      this.renderer.render(this.scene, this.camera);
    };
  }

  /* Carga un .glb / .gltf y reemplaza el modelo de prueba */
  private async loadGlb(url: string) {
    // Soporta modelos comprimidos con Draco, Meshopt o texturas KTX2
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
    const ktx2 = new KTX2Loader()
      .setTranscoderPath(`https://unpkg.com/three@0.${THREE.REVISION}.0/examples/jsm/libs/basis/`)
      .detectSupport(this.renderer);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.setKTX2Loader(ktx2);
    loader.setMeshoptDecoder(MeshoptDecoder);
    try {
      const gltf = await loader.loadAsync(url, (e) => {
        if (this.note && e.total) this.note.textContent = `Cargando modelo… ${Math.round((e.loaded / e.total) * 100)}%`;
      });
      if (this.destroyed) return; // se cerró el holograma mientras cargaba
      const obj = gltf.scene;

      // Evita que el modelo desaparezca por un mal cálculo de la caja de recorte (típico en mallas con esqueleto)
      obj.traverse((o) => { o.frustumCulled = false; });
      obj.updateMatrixWorld(true);

      // 1) Escalar a ALTURA_MODELO, centrar en X/Z y apoyar los pies en PIES_Y
      const box = new THREE.Box3().setFromObject(obj, true);
      const size = box.getSize(new THREE.Vector3());
      const alto = size.y > 1e-6 ? size.y : Math.max(size.x, size.z, 1e-6); // por si el modelo es plano
      obj.scale.multiplyScalar(ALTURA_MODELO / alto);
      obj.updateMatrixWorld(true);
      box.setFromObject(obj, true);
      const center = box.getCenter(new THREE.Vector3());
      obj.position.set(-center.x, PIES_Y - box.min.y, -center.z);

      // 2) Materiales
      if (HOLOGRAFICO) {
        // Efecto holograma: material translúcido + rim light + aristas de neón
        this.mats.body.flatShading = false; // el modelo real es suave, no facetado
        this.mats.body.needsUpdate = true;
        obj.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.material = this.mats.body;
          if (!(mesh as THREE.SkinnedMesh).isSkinnedMesh) { // las mallas con esqueleto se dejan sin cáscara
            const shell = new THREE.Mesh(mesh.geometry, this.mats.rim);
            shell.scale.setScalar(1.03);
            mesh.add(shell);
            mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), this.mats.line));
          }
        });
      } else {
        // Colores originales: se conservan materiales y texturas; solo se asegura que se vean bien
        obj.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const fixed = list.map((m) => {
            let mm = m as THREE.MeshStandardMaterial;
            // Diagnóstico: mira en la consola qué trae cada material
            console.log(`[${this.id}] material "${mm.name}"`, {
              type: mm.type, color: mm.color?.getHexString(), map: !!mm.map,
              vertexColors: mm.vertexColors, emissive: mm.emissive?.getHexString(),
              emissiveIntensity: mm.emissiveIntensity, emissiveMap: !!mm.emissiveMap,
              attrColor: !!mesh.geometry.getAttribute("color"),
            });
            // Material "sin luz" (KHR_materials_unlit): se pasa a uno normal para que tenga sombreado
            if ((mm as unknown as THREE.Material).type === "MeshBasicMaterial") {
              const basic = m as THREE.MeshBasicMaterial;
              mm = new THREE.MeshStandardMaterial({
                color: basic.color, map: basic.map, transparent: basic.transparent,
                opacity: basic.opacity, alphaTest: basic.alphaTest, roughness: 0.8, metalness: 0,
              });
              mm.name = basic.name;
            }
            // Un emisivo blanco deja el modelo plano y blanco: se apaga
            if (mm.emissive) { mm.emissive.set(0x000000); mm.emissiveIntensity = 0; mm.emissiveMap = null; }
            if (mm.map) mm.map.colorSpace = THREE.SRGBColorSpace;
            mm.metalness = Math.min(mm.metalness ?? 0, 0.3); // un metal sin entorno se ve negro/plano
            // OJO: no se fuerza DoubleSide; el contorno (Solidify con normales invertidas) necesita FrontSide
            // El contorno negro (Solidify) puede verse como manchas negras en brazos u orejas: se oculta
            // Solo se oculta si es de contorno Y casi negro, para no esconder piezas de color (p. ej. las botas)
            const c = mm.color;
            const oscuro = !!c && c.r < 0.08 && c.g < 0.08 && c.b < 0.08;
            if (OCULTAR_CONTORNO && /contorn/i.test(mm.name) && oscuro) mm.visible = false;
            mm.needsUpdate = true;
            return mm;
          });
          mesh.material = Array.isArray(mesh.material) ? fixed : fixed[0];
        });
      }

      // 3) Si el modelo trae animación, reproduce la primera
      if (REPRODUCIR_ANIMACION && gltf.animations.length) {
        this.mixer = new THREE.AnimationMixer(obj);
        this.mixer.clipAction(gltf.animations[0]).play();
      }

      // 4) Reemplazar el modelo de prueba (conserva el giro actual) y liberar el anterior
      const holder = new THREE.Group();
      holder.rotation.copy(this.model.rotation);
      holder.add(obj);
      this.model.traverse((o) => {
        const geo = (o as THREE.Mesh).geometry;
        if (geo) geo.dispose();
      });
      this.scene.remove(this.model);
      this.model = holder;
      this.scene.add(holder);
      this.note?.remove();
    } catch (err) {
      console.warn(`No se pudo cargar ${url} (${this.id}). Se queda el modelo de prueba.`, err);
      if (this.note) this.note.textContent = "⚠ El modelo no cargó (mira la consola, F12)";
    } finally {
      draco.dispose();
      ktx2.dispose();
    }
  }

  private resize() {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() { // libera la GPU al desactivar
    this.destroyed = true;
    this.note?.remove();
    this.cleanupPointer();
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    const own = Object.values(this.mats) as THREE.Material[];
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      // materiales y texturas originales del .glb (si no se reemplazaron por los del holograma)
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      mats.forEach((m) => { if (!own.includes(m)) m.dispose(); });
    });
    Object.values(this.mats).forEach((m) => m.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/* Contenedor React del holograma: crea la escena al montarse y la libera al desmontarse */
function HologramView({ character }: { character: Character }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let holo: Hologram | null = null;
    try {
      holo = new Hologram(host, character);
      holo.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "WebGL no disponible en este navegador.");
    }
    return () => holo?.destroy();
  }, [character]);

  return (
    <div className="sb-view" ref={hostRef}>
      {error && <div className="sb-msg">{error}</div>}
    </div>
  );
}

/* ============ TARJETA E INTERACCIÓN ============ */
type CardStyle = CSSProperties & { "--c": string; "--rgb": string };

function CharacterCard({ c }: { c: Character }) {
  const [flipped, setFlipped] = useState(false); // volteo en pantallas táctiles
  const [holo, setHolo] = useState(false); // clase .sb-holo (animaciones CSS)
  const [mounted, setMounted] = useState(false); // escena Three.js viva (se mantiene 600 ms tras cerrar)
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const activate = () => {
    window.clearTimeout(timer.current);
    setMounted(true);
    setHolo(true);
    setFlipped(false);
  };

  const deactivate = () => {
    setHolo(false);
    timer.current = window.setTimeout(() => setMounted(false), 600);
  };

  // En pantallas táctiles (sin hover) un toque voltea la tarjeta
  const onCardClick = (e: MouseEvent<HTMLElement>) => {
    if (holo) return; // con el holograma activo no se voltea
    if (matchMedia("(hover: none)").matches && !(e.target as HTMLElement).closest("button, a")) {
      setFlipped((f) => !f);
    }
  };

  const style: CardStyle = { "--c": c.color, "--rgb": c.rgb };
  const className = ["sb-card", holo && "sb-holo", flipped && "sb-flipped"].filter(Boolean).join(" ");

  return (
    <article className={className} style={style} onClick={onCardClick}>
      <div className="sb-inner">
        <div className="sb-face sb-front">
          <div className="sb-portrait"><Portrait c={c} /></div>
          <div className="sb-stage">
            <div className="sb-beam" />
            {mounted && <HologramView character={c} />}
            <div className="sb-scan" />
            <div className="sb-sweep" />
            <div className="sb-base" />
          </div>
          <div className="sb-nameplate">{c.name}</div>
          <button
            type="button" className="sb-close" aria-label="Desactivar holograma"
            onClick={(e) => { e.currentTarget.blur(); deactivate(); }}
          >
            ✕ DESACTIVAR
          </button>
        </div>

        <div className="sb-face sb-back">
          <header className="sb-head">
            <h2>{c.name}</h2>
            <span className="sb-role">{c.role}</span>
          </header>

          <p className="sb-bio"><Rich text={c.bio} /></p>

          <div className="sb-actions">
            <button
              type="button" className="sb-holo-btn"
              onClick={(e) => { e.currentTarget.blur(); activate(); }}
            >
              ACTIVAR HOLOGRAMA
            </button>
            {c.twine && (
              <a className="sb-twine-btn" href={c.twine} target="_blank" rel="noopener noreferrer">
                CONOCE MIS SECRETOS
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Personajes() {
  return (
    <>
      <style>{CSS}</style>
      <div className="sb-wrap">
        <div className="sb-grid">
          {CHARACTERS.map((c) => <CharacterCard key={c.id} c={c} />)}
        </div>
      </div>
    </>
  );
}