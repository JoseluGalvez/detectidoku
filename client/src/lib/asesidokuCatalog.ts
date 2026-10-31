export type AsesidokuThemeMeta = {
  id: string;
  name: string;
  tagline: string;
  adjacencyMode?: "diagonal8" | "knight";
  visualAsset?: string;
};

/** Catálogo ligero derivado de Asesidoku; el motor completo se carga bajo demanda. */
export const ASESIDOKU_THEME_CATALOG: AsesidokuThemeMeta[] = [
  { id: "clasico", name: "La Primera Noche", tagline: "El caso ideal para aprender las reglas de Asesidoku.", visualAsset: "/manus-storage/clasico_230b91f6.webp" },
  { id: "sendero", name: "El Sendero Perdido", tagline: "Un grupo de excursionistas... uno no volvió del sendero." },
  { id: "faro", name: "El Faro Encantado", tagline: "Dicen que el farero nunca se fue... y ahora hay un cuerpo más." },
  { id: "cena", name: "La Cena que Terminó Mal", tagline: "Ocho invitados, una mesa larga... y un plato que nadie terminó." },
  { id: "futbol", name: "El Once Titular", tagline: "El árbitro pitó el final... y encontraron a alguien tendido en el campo.", visualAsset: "/manus-storage/futbol_f7d14460.webp" },
  { id: "vecindario", name: "Vigilancia Vecinal", tagline: "En esta calle nunca pasaba nada... hasta anoche." },
  { id: "estrella", name: "Noche de Estrellas", tagline: "Regla especial: aquí 'junto a' también cuenta en diagonal.", adjacencyMode: "diagonal8", visualAsset: "/manus-storage/estrella_e8961d8c.webp" },
  { id: "oficina", name: "El Edificio de Oficinas", tagline: "Todos se quedaron hasta tarde. Solo uno no llegó a fichar la salida.", visualAsset: "/manus-storage/oficina_2284c26a.webp" },
  { id: "hockey", name: "Sudden Death", tagline: "El partido se fue a la prórroga. Alguien no vio el final." },
  { id: "pirata", name: "El Motín del Marea Negra", tagline: "Un tesoro, una tripulación... y un capitán que no vio el amanecer." },
  { id: "doble_a", name: "Doble Crimen — Planta Baja", tagline: "Dos crímenes, dos plantas, una sola noche." },
  { id: "batalla_estrellas", name: "Batalla de Estrellas", tagline: "Las casillas marcadas con ✦ nunca pueden ocuparse." },
  { id: "caballeros", name: "El Torneo de los Caballeros", tagline: "Regla especial: 'junto a' se mueve como el caballo del ajedrez.", adjacencyMode: "knight" },
  { id: "asedio", name: "El Asedio", tagline: "El castillo resistió el asedio... pero algo pasó dentro de sus muros.", visualAsset: "/manus-storage/asedio_846d73fa.webp" },
  { id: "formula1", name: "Gran Premio Nocturno", tagline: "El equipo celebraba la pole position. La fiesta terminó en tragedia.", visualAsset: "/manus-storage/formula1_f9508b4b.webp" },
];
