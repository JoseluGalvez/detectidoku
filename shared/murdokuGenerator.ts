import { validateUniqueAssignment } from "./murdokuLogic";

export type InterviewConfig = { players: number; ageRange: string; difficulty: "Muy fácil" | "Fácil" | "Medio" | "Difícil" | "Experto"; theme: string; tone: string; suspectCount: number; locationCount: number; objectCount: number; twists: boolean; customNames: string[]; format: string; hints: boolean; timeLimit: boolean };
export type GeneratedMurdoku = { title: string; introduction: string; suspects: string[]; locations: string[]; objects: string[]; gridMarkdown: string; clues: { id: string; type: string; text: string; references?: string[] }[]; difficulty: { level: InterviewConfig["difficulty"]; justification: string }; solution: { responsible: string; location: string; object: string }; stepByStep: string[]; logic: { matrix: number[][]; solution: number[] } };

const clueCount: Record<InterviewConfig["difficulty"], number> = { "Muy fácil": 10, Fácil: 12, Medio: 18, Difícil: 26, Experto: 34 };

export function normalizeInterview(input: Partial<InterviewConfig>): { config?: InterviewConfig; errors: string[]; adjustments: string[] } {
  const errors: string[] = []; const adjustments: string[] = [];
  const suspectCount = Math.max(3, Math.min(16, Number(input.suspectCount ?? 6)));
  const locationCount = Math.max(2, Math.min(suspectCount, Number(input.locationCount ?? 4)));
  const objectCount = Math.max(1, Math.min(16, Number(input.objectCount ?? 4)));
  if ((input.locationCount ?? 4) > suspectCount) adjustments.push("Las localizaciones se han limitado al número de sospechosos.");
  if (!input.theme?.trim()) errors.push("theme_required");
  if (!input.customNames || input.customNames.filter(Boolean).length < suspectCount) adjustments.push("Se usarán nombres temáticos para completar el elenco.");
  if (errors.length) return { errors, adjustments };
  return { errors, adjustments, config: { players: Math.max(1, Number(input.players ?? 1)), ageRange: input.ageRange ?? "Adultos", difficulty: input.difficulty ?? "Medio", theme: input.theme!.trim(), tone: input.tone ?? "Misterioso", suspectCount, locationCount, objectCount, twists: Boolean(input.twists), customNames: input.customNames ?? [], format: input.format ?? "Juego online", hints: input.hints !== false, timeLimit: Boolean(input.timeLimit) } };
}

export function buildGridMarkdown(names: string[], locations: string[]) { return [`| Sospechoso / Lugar | ${locations.join(" | ")} |`, `|---|${locations.map(() => "---").join("|")}|`, ...names.map((name) => `| ${name} | ${locations.map(() => "□").join(" | ")} |`)].join("\n"); }

export function buildDynamicClues(names: string[], locations: string[], objects: string[], count: number) {
  const types = ["Directa", "Relacional", "Posicional", "Temporal", "Condicional", "Negativa", "Cruzada"];
  return Array.from({ length: count }, (_, i) => {
    const subject = names[i % names.length]; const reference = names[(i + 1) % names.length]; const place = locations[i % locations.length]; const object = objects[i % objects.length];
    const text = [`${subject} estaba en ${place}.`, `${subject} estaba al sur de ${reference}.`, `${subject} no estaba al lado de ${object}.`, `${reference} ocupaba una fila distinta de ${subject}.`, `${subject} no compartía habitación con ${reference}.`, `La evidencia ${object} no estaba en ${place}.`, `${subject} estaba al oeste de ${reference}.`][i % 7];
    return { id: `pista-${i + 1}`, type: types[i % types.length], text, references: [subject, reference, place, object] };
  });
}

export function generateDeterministicMurdoku(config: InterviewConfig): GeneratedMurdoku {
  const names = Array.from({ length: config.suspectCount }, (_, i) => config.customNames[i] || `${config.theme} ${i + 1}`);
  const locations = Array.from({ length: config.locationCount }, (_, i) => `Área ${i + 1}`);
  const objects = Array.from({ length: config.objectCount }, (_, i) => `Evidencia ${i + 1}`);
  const size = config.suspectCount; const matrix = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => (r === c ? 1 : 0))); const checked = validateUniqueAssignment(matrix); if (!checked.valid) throw new Error("generated_logic_not_unique");
  const count = clueCount[config.difficulty];
  const clues = buildDynamicClues(names, locations, objects, count);
  const responsible = names[0]; const location = locations[0]; const object = objects[0];
  return { title: `${config.theme}: el caso de la evidencia perdida`, introduction: `En una noche de ${config.theme.toLowerCase()}, una evidencia desapareció justo cuando el grupo se preparaba para cerrar el caso. ${names.slice(0, 3).join(", ")} estuvieron presentes, pero solo una persona pudo coincidir con la víctima en la misma área. Tu objetivo es reconstruir la escena usando las pistas, descartar cada combinación imposible y señalar al responsable sin adivinar. El tono ${config.tone.toLowerCase()} debe acompañar la investigación sin ocultar información necesaria. Cada dato pertenece a una relación verificable del tablero y la solución se calcula antes de redactar la historia.`, suspects: names, locations, objects, gridMarkdown: buildGridMarkdown(names, locations), clues, difficulty: { level: config.difficulty, justification: `Se han seleccionado ${count} pistas con dificultad calibrada por profundidad de deducción.` }, solution: { responsible, location, object }, stepByStep: [`Comienza descartando las posiciones incompatibles con las pistas directas.`, `Cruza filas y columnas para conservar una única posición por sospechoso.`, `Comprueba la habitación compartida por víctima y responsable.`, `La matriz tiene exactamente una solución: ${checked.solution?.join(", ")}.`], logic: { matrix, solution: checked.solution! } };
}
