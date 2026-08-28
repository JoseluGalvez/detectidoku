import { describe, expect, it } from "vitest";
import { canChangeNarrativeOnly, validateUniqueAssignment } from "../shared/murdokuLogic";

describe("murdoku logic invariants", () => {
  it("accepts exactly one assignment", () => {
    const result = validateUniqueAssignment([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(result.valid).toBe(true);
    expect(result.solutionCount).toBe(1);
    expect(result.solution).toEqual([0, 1, 2]);
  });

  it("rejects a matrix with no solution", () => {
    const result = validateUniqueAssignment([
      [1, 0],
      [1, 0],
    ]);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("no_solution");
  });

  it("rejects a matrix with multiple solutions", () => {
    const result = validateUniqueAssignment([
      [1, 1],
      [1, 1],
    ]);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("multiple_solutions");
  });

  it("only permits narrative edits when the logic matrix is identical", () => {
    const matrix = [[1, 0], [0, 1]];
    expect(canChangeNarrativeOnly(matrix, [[1, 0], [0, 1]])).toBe(true);
    expect(canChangeNarrativeOnly(matrix, [[0, 1], [1, 0]])).toBe(false);
  });
});
