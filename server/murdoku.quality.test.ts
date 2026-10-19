import { describe, expect, it } from "vitest";
import { evaluateMurdokuQuality, generateDeterministicMurdoku, type InterviewConfig } from "../shared/murdokuGenerator";

const config: InterviewConfig = { players: 1, ageRange: "Adultos", difficulty: "Medio", theme: "Mansión", tone: "Oscuro", suspectCount: 4, locationCount: 4, objectCount: 2, twists: false, customNames: ["Ada", "Bruno", "Celia", "Dario"], format: "Juego online", hints: true, timeLimit: false };

describe("Murdokeando quality checklist", () => {
  it("attaches a quality report to every generated case", () => {
    const puzzle = generateDeterministicMurdoku(config);
    expect(puzzle.qualityReport.checks).toHaveLength(16);
    expect(puzzle.qualityReport.checks.find((check) => check.id === "Q08")?.status).toBe("cumple");
    expect(puzzle.qualityReport.checks.find((check) => check.id === "Q09")?.status).toBe("cumple");
    expect(puzzle.qualityReport.checks.find((check) => check.id === "Q10")?.status).toBe("cumple");
    expect(puzzle.qualityReport.passed).toBe(true);
  });

  it("reports invalid entity references instead of silently accepting them", () => {
    const puzzle = generateDeterministicMurdoku(config);
    const report = evaluateMurdokuQuality({ ...puzzle, clues: [{ ...puzzle.clues[0]!, references: ["Entidad inexistente"] }, ...puzzle.clues.slice(1)] }, config);
    expect(report.checks.find((check) => check.id === "Q11")?.status).toBe("no_cumple");
  });
});
