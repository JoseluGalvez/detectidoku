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

import { isOrthogonallyBeside, isSouthOf, validateCrimeCondition, validateClueQuality } from "../shared/murdokuLogic";

describe("murdoku spatial rules", () => {
  it("requires same room and no wall for beside", () => {
    const cells = [{ row: 1, col: 1, roomId: "a", wallEast: true }, { row: 1, col: 2, roomId: "a" }, { row: 1, col: 3, roomId: "b" }];
    expect(isOrthogonallyBeside({ entityId: "x", row: 1, col: 1, roomId: "a" }, { entityId: "y", row: 1, col: 2, roomId: "a" }, cells)).toBe(false);
    expect(isOrthogonallyBeside({ entityId: "x", row: 1, col: 2, roomId: "a" }, { entityId: "y", row: 1, col: 3, roomId: "b" }, cells)).toBe(false);
  });
  it("uses absolute compass orientation and enforces the crime room", () => {
    expect(isSouthOf({ entityId: "a", row: 2, col: 1, roomId: "r" }, { entityId: "b", row: 1, col: 1, roomId: "r" })).toBe(true);
    expect(validateCrimeCondition([{ entityId: "victim", row: 1, col: 1, roomId: "crime" }, { entityId: "murderer", row: 1, col: 2, roomId: "crime" }, { entityId: "third", row: 2, col: 1, roomId: "other" }], "victim", "murderer")).toBe(true);
  });
  it("requires 10 to 40 non-empty unique clues", () => {
    expect(validateClueQuality(Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, text: "Pista", references: [] })))).toBe(true);
  });
});
