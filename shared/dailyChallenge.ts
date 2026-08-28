import { generateDeterministicMurdoku, type InterviewConfig, type GeneratedMurdoku } from "./murdokuGenerator";

export function utcChallengeDate(now = new Date()) { return now.toISOString().slice(0, 10); }
export function seedForDate(date: string) { return `murdoku-${date}`; }
export type RankedResult = { seed: string; elapsedSeconds: number; hintsUsed: number; displayName: string };
export function rankResultsBySeed(results: RankedResult[], seed: string) { return results.filter((result) => result.seed === seed).sort((a, b) => a.elapsedSeconds - b.elapsedSeconds || a.hintsUsed - b.hintsUsed); }

export function challengeFromSeed(seed: string): GeneratedMurdoku {
  let hash = 0; for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const themes = ["Taller mecánico", "Hospital", "Halloween", "Observatorio", "Hotel"], theme = themes[hash % themes.length];
  const config: InterviewConfig = { players: 1, ageRange: "Adultos", difficulty: ["Fácil", "Medio", "Difícil"][hash % 3] as InterviewConfig["difficulty"], theme, tone: "Misterioso", suspectCount: 6, locationCount: 6, objectCount: 6, twists: true, customNames: [], format: "Juego online", hints: true, timeLimit: false };
  return generateDeterministicMurdoku(config);
}
