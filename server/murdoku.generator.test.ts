import { describe, expect, it } from "vitest";
import { generateDeterministicMurdoku, normalizeInterview } from "../shared/murdokuGenerator";

describe("custom Murdoku generation", () => {
  it("normalizes unsafe structural parameters instead of accepting contradictions", () => {
    const result = normalizeInterview({ theme: "Halloween", suspectCount: 4, locationCount: 9, customNames: ["A", "B"] });
    expect(result.config?.locationCount).toBe(4);
    expect(result.adjustments.length).toBeGreaterThan(0);
  });
  it("generates the complete contract with calibrated clue count and one solution", () => {
    const result = generateDeterministicMurdoku({ players: 1, ageRange: "Adultos", difficulty: "Difícil", theme: "Hospital", tone: "Serio", suspectCount: 6, locationCount: 4, objectCount: 4, twists: true, customNames: ["Ana", "Beto", "Cora", "Dani", "Eva", "Félix"], format: "Juego online", hints: true, timeLimit: false });
    expect(result.introduction.length).toBeGreaterThan(150);
    expect(result.clues).toHaveLength(26);
    expect(result.gridMarkdown).toContain("Sospechoso");
    expect(result.stepByStep.length).toBeGreaterThan(2);
    expect(result.logic.solution).toHaveLength(6);
  });
});
