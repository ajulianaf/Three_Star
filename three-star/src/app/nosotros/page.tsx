import Image from "next/image";

/* Imágenes: guárdalas en /public/nosotros/ (o cambia las rutas aquí) */
const SAPOS = "/nosotros/sapos.png"; // los tres sapos
const LOGO = "/nosotros/logo-three-star.png"; // logo "Three Star"

const INTRO =
  "Three Star es un estudio de videojuegos formado por tres amigos, desarrolladores e ingenieros multimedia, unidos por la pasión de crear mundos jugables. Nuestro nombre y nuestro logo nacen de algo muy nuestro: tres sapos, cada uno representando a un integrante del equipo con su color favorito.";

const TEAM = [
  {
    avatar: "/nosotros/integrante-1.png",
    alt: "Ilustración de la integrante 1, con lentes y cabello largo",
    bio: "Estudiante de Ingeniería en Multimedia con interés en UX/UI, diseño digital y desarrollo de experiencias interactivas. Combina creatividad, pensamiento centrado en el usuario y habilidades de desarrollo para transformar necesidades en soluciones funcionales, intuitivas y atractivas.",
  },
  {
    avatar: "/nosotros/integrante-2.png",
    alt: "Ilustración del integrante 2, con gorra",
    bio: "Estudiante de Ingeniería en Multimedia enfocado en Dirección Audiovisual y Guionismo. Combina creatividad narrativa y base técnica para conceptualizar universos, escribir guiones y dirigir experiencias interactivas y transmedia.",
  },
  {
    avatar: "/nosotros/integrante-3.png",
    alt: "Ilustración de la integrante 3, con sombrero de pescador",
    bio: "Estudiante de Ingeniería en Multimedia enfocado en Modelado 3D y Animación. Combina criterio artístico y optimización técnica para conceptualizar, esculpir y dar vida a personajes, props y entornos listos para videojuegos, cine y experiencias interactivas.",
  },
];

export default function Nosotros() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 p-6 text-white">
      {/* ---------- Presentación ---------- */}
      <header className="flex flex-col items-center gap-6">
        <Image src={SAPOS} alt="Los tres sapos de Three Star" width={420} height={190} priority className="h-auto w-64 sm:w-80" />
        <Image src={LOGO} alt="Three Star" width={460} height={150} priority className="h-auto w-72 sm:w-96" />
        <p className="text-justify text-sm leading-relaxed sm:text-base">{INTRO}</p>
      </header>

      {/* ---------- Integrantes ---------- */}
      <section className="flex flex-col gap-12">
        {TEAM.map((m, i) => (
          <article
            key={m.avatar}
            className={`flex flex-col items-center gap-6 md:flex-row md:gap-8 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
          >
            <Image src={m.avatar} alt={m.alt} width={160} height={160} className="h-32 w-32 shrink-0 object-contain sm:h-40 sm:w-40" />
            <p className="text-justify text-sm leading-relaxed sm:text-base">{m.bio}</p>
          </article>
        ))}
      </section>
    </div>
  );
}