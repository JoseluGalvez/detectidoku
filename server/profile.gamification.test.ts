import { describe, expect, it } from "vitest";
import { generateDeterministicMurdoku } from "../shared/murdokuGenerator";

describe("profile and competition contracts", () => {
  it("requires every assignment in the generated solution to be considered complete", () => {
    const puzzle = generateDeterministicMurdoku({ players: 1, ageRange: "Adultos", difficulty: "Medio", theme: "Taller", tone: "Misterioso", suspectCount: 3, locationCount: 3, objectCount: 2, twists: false, customNames: ["Ana", "Beto", "Cora"], format: "Juego online", hints: true, timeLimit: false });
    expect(puzzle.logic.solution).toHaveLength(3);
    expect(puzzle.solution.responsible).toBe(puzzle.suspects[0]);
    expect(puzzle.solution.location).toBe(puzzle.locations[puzzle.logic.solution[0]!]);
  });

  it("keeps style choices outside the logical snapshot", () => {
    const puzzle = generateDeterministicMurdoku({ players: 1, ageRange: "Adultos", difficulty: "Fácil", theme: "Hospital", tone: "Ligero", suspectCount: 3, locationCount: 2, objectCount: 1, twists: false, customNames: ["A", "B", "C"], format: "Juego online", hints: true, timeLimit: false, artStyle: "kawaii" });
    expect(puzzle.logic).toEqual(expect.objectContaining({ matrix: expect.any(Array), solution: expect.any(Array) }));
    expect(puzzle.logic).not.toHaveProperty("artStyle");
  });
});
