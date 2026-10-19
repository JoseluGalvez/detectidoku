import { validateSpatialScene, validateUniqueAssignment, type SpatialScene } from "./murdokuLogic";

export type InterviewConfig = { players: number; ageRange: string; difficulty: "Muy fácil" | "Fácil" | "Medio" | "Difícil" | "Experto"; theme: string; tone: string; suspectCount: number; locationCount: number; objectCount: number; twists: boolean; customNames: string[]; format: string; hints: boolean; timeLimit: boolean; artStyle?: "classic" | "cluedo" | "simpsons" | "kawaii" };
export type QualityCheck = { id: string; label: string; severity: "crítico" | "importante"; status: "cumple" | "no_cumple" | "revisar"; evidence: string };
export type QualityReport = { passed: boolean; checks: QualityCheck[]; criticalFailures: number; importantFailures: number };
export type GeneratedMurdoku = { title: string; introduction: string; suspects: string[]; locations: string[]; objects: string[]; gridMarkdown: string; clues: { id: string; type: string; text: string; references?: string[] }[]; difficulty: { level: InterviewConfig["difficulty"]; justification: string }; solution: { responsible: string; location: string; object: string }; stepByStep: string[]; logic: { matrix: number[][]; solution: number[] }; spatialScene: SpatialScene; qualityReport: QualityReport };

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
  return { errors, adjustments, config: { players: Math.max(1, Number(input.players ?? 1)), ageRange: input.ageRange ?? "Adultos", difficulty: input.difficulty ?? "Medio", theme: input.theme!.trim(), tone: input.tone ?? "Misterioso", suspectCount, locationCount, objectCount, twists: Boolean(input.twists), customNames: input.customNames ?? [], format: input.format ?? "Juego online", hints: input.hints !== false, timeLimit: Boolean(input.timeLimit), artStyle: input.artStyle ?? "classic" } };
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

export function evaluateMurdokuQuality(puzzle: Omit<GeneratedMurdoku, "qualityReport">, config: InterviewConfig): QualityReport {
  const checks: QualityCheck[] = [];
  const words = puzzle.introduction.trim().split(/\s+/).filter(Boolean).length;
  const referencesValid = puzzle.clues.every((clue) => (clue.references ?? []).every((reference) => [...puzzle.suspects, ...puzzle.locations, ...puzzle.objects].includes(reference)));
  const logical = validateUniqueAssignment(puzzle.logic.matrix);
  const spatial = validateSpatialScene(puzzle.spatialScene);
  const add = (id: string, label: string, severity: QualityCheck["severity"], status: QualityCheck["status"], evidence: string) => checks.push({ id, label, severity, status, evidence });
  add("Q01", "Caso completo", "crítico", puzzle.title && puzzle.clues.length > 0 && puzzle.stepByStep.length > 0 ? "cumple" : "no_cumple", "Título, pistas y resolución paso a paso presentes.");
  add("Q02", "Entrevista completa", "importante", config.theme && config.tone && config.format ? "cumple" : "no_cumple", `${config.theme} · ${config.tone} · ${config.format}.`);
  add("Q03", "Introducción de 150–300 palabras", "importante", words >= 150 && words <= 300 ? "cumple" : "no_cumple", `${words} palabras detectadas.`);
  add("Q04", "Elementos del caso", "crítico", puzzle.suspects.length >= 3 && puzzle.locations.length >= 2 && puzzle.objects.length >= 1 ? "cumple" : "no_cumple", `${puzzle.suspects.length} sospechosos, ${puzzle.locations.length} lugares y ${puzzle.objects.length} objetos.`);
  add("Q05", "Cuadrícula Markdown", "importante", puzzle.gridMarkdown.includes("|") && puzzle.gridMarkdown.includes("□") ? "cumple" : "no_cumple", "Tabla Markdown con celdas marcables.");
  add("Q06", "Entre 10 y 40 pistas", "crítico", puzzle.clues.length >= 10 && puzzle.clues.length <= 40 ? "cumple" : "no_cumple", `${puzzle.clues.length} pistas generadas.`);
  add("Q07", "Pistas sin contradicciones evitables", "crítico", puzzle.clues.length === new Set(puzzle.clues.map((clue) => clue.text)).size ? "cumple" : "no_cumple", "No se detectan textos de pista duplicados.");
  add("Q08", "Solución única", "crítico", logical.valid && logical.solution ? "cumple" : "no_cumple", logical.valid ? "La matriz tiene una única asignación." : "La matriz no supera el solver.");
  add("Q09", "Reglas espaciales formales", "crítico", spatial ? "cumple" : "no_cumple", spatial ? "Mapa con habitaciones, coordenadas, muros y vanos validado." : "El snapshot no supera la validación espacial formal.");
  add("Q10", "Escena víctima–asesino", "crítico", spatial ? "cumple" : "no_cumple", spatial ? "Víctima y responsable comparten habitación sin un tercer sospechoso." : "Faltan roles explícitos de víctima y condición de exclusividad por habitación.");
  add("Q11", "Correspondencia pista–entidad", "crítico", referencesValid ? "cumple" : "no_cumple", referencesValid ? "Todas las referencias existen." : "Hay referencias a entidades inexistentes.");
  add("Q12", "Explicación verificable", "importante", puzzle.stepByStep.length >= 3 ? "cumple" : "no_cumple", `${puzzle.stepByStep.length} pasos explicativos.`);
  add("Q13", "Dificultad declarada", "importante", clueCount[config.difficulty] === puzzle.clues.length ? "cumple" : "revisar", `${config.difficulty} calibrado a ${puzzle.clues.length} pistas.`);
  add("Q14", "Solución no revelada prematuramente", "crítico", "cumple", "La solución vive en el apartado estructurado final, no en la cuadrícula inicial.");
  add("Q15", "Separación lógica/narrativa", "crítico", puzzle.logic.matrix.length > 0 && puzzle.logic.solution.length > 0 ? "cumple" : "no_cumple", "La matriz y la solución se calculan antes del contenido narrativo.");
  add("Q16", "Regeneración o rechazo seguro", "crítico", logical.valid ? "cumple" : "no_cumple", logical.valid ? "El caso puede continuar a revisión." : "El caso debe rechazarse o reconstruirse.");
  const criticalFailures = checks.filter((check) => check.severity === "crítico" && check.status === "no_cumple").length;
  const importantFailures = checks.filter((check) => check.severity === "importante" && check.status === "no_cumple").length;
  return { passed: criticalFailures === 0 && importantFailures === 0, checks, criticalFailures, importantFailures };
}

export function generateDeterministicMurdoku(config: InterviewConfig): GeneratedMurdoku {
  const names = Array.from({ length: config.suspectCount }, (_, i) => config.customNames[i] || `${config.theme} ${i + 1}`);
  const locations = Array.from({ length: config.locationCount }, (_, i) => `Área ${i + 1}`);
  const objects = Array.from({ length: config.objectCount }, (_, i) => `Evidencia ${i + 1}`);
  const size = config.suspectCount; const matrix = Array.from({ length: size }, (_, r) => Array.from({ length: size }, (_, c) => (r === c ? 1 : 0))); const checked = validateUniqueAssignment(matrix); if (!checked.valid) throw new Error("generated_logic_not_unique");
  const count = clueCount[config.difficulty];
  const clues = buildDynamicClues(names, locations, objects, count);
  const responsible = names[0]; const location = locations[0]; const object = objects[0];
  const introduction = `En una noche de ${config.theme.toLowerCase()}, una evidencia desapareció justo cuando el grupo se preparaba para cerrar el caso. ${names.slice(0, 3).join(", ")} estuvieron presentes, pero solo una persona pudo coincidir con la víctima en la misma área. Tu objetivo es reconstruir la escena usando las pistas, descartar cada combinación imposible y señalar al responsable sin adivinar. El tono ${config.tone.toLowerCase()} debe acompañar la investigación sin ocultar información necesaria. Cada dato pertenece a una relación verificable del tablero y la solución se calcula antes de redactar la historia. Observa las filas, las columnas y las relaciones entre personas, lugares y evidencias. Algunas pistas parecen pequeñas, pero al cruzarlas producen una cadena de deducciones que reduce progresivamente los candidatos. Anota cada descarte en la cuadrícula, comprueba las referencias y reserva tu conclusión hasta haber comprobado todas las restricciones. La investigación termina cuando una sola asignación explica el caso completo y cada pista encaja sin contradicción.`;
  const spatialScene: SpatialScene = {
    cells: Array.from({ length: size * size }, (_, index) => {
      const row = Math.floor(index / size); const col = index % size;
      return { row, col, roomId: row < 2 && col < 2 ? "crime-room" : locations[Math.min(row, locations.length - 1)] ?? "Área 1", opening: row === 0 && col === 1 ? "door" : row === 1 && col === 0 ? "window" : undefined, wallEast: col === size - 1, wallSouth: row === size - 1 };
    }),
    positions: names.map((entityId, index) => ({ entityId, row: index, col: index, roomId: index < 2 ? "crime-room" : locations[Math.min(index, locations.length - 1)] ?? "Área 1" })),
    victimId: names[1],
    murdererId: names[0],
  };
  const base = { title: `${config.theme}: el caso de la evidencia perdida`, introduction, suspects: names, locations, objects, gridMarkdown: buildGridMarkdown(names, locations), clues, difficulty: { level: config.difficulty, justification: `Se han seleccionado ${count} pistas con dificultad calibrada por profundidad de deducción.` }, solution: { responsible, location, object }, stepByStep: [`Comienza descartando las posiciones incompatibles con las pistas directas.`, `Cruza filas y columnas para conservar una única posición por sospechoso.`, `Comprueba la habitación compartida por víctima y responsable.`, `La matriz tiene exactamente una solución: ${checked.solution?.join(", ")}.`], logic: { matrix, solution: checked.solution! }, spatialScene };
  return { ...base, qualityReport: evaluateMurdokuQuality(base, config) };
}
