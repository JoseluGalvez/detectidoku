export type CandidateMatrix = number[][];

export type MurdokuClue = { id: string; text: string; references: string[] };
export type MurdokuTemplate = {
  id: string;
  title: string;
  size: number;
  entities: string[];
  attributes: string[];
  relations: string[];
  clues: MurdokuClue[];
  solution: number[];
  candidateMatrix: CandidateMatrix;
  narrative: { intro: string; setting: string; tone: string };
  metadata: { difficulty: "Fácil" | "Intermedio" | "Avanzado"; sourceIds: string[]; version: number };
};

export type LogicValidation = { valid: boolean; solutionCount: number; solution?: number[]; reason?: string };

export function validateUniqueAssignment(matrix: CandidateMatrix): LogicValidation {
  if (matrix.length === 0) return { valid: false, solutionCount: 0, reason: "empty_matrix" };
  const size = matrix.length;
  if (matrix.some((row) => row.length !== size || row.some((value) => value !== 0 && value !== 1))) return { valid: false, solutionCount: 0, reason: "matrix_must_be_square_binary" };
  let solutionCount = 0; let firstSolution: number[] | undefined;
  const used = new Set<number>(); const assignment: number[] = Array(size).fill(-1);
  const search = (row: number) => { if (solutionCount > 1) return; if (row === size) { solutionCount += 1; if (!firstSolution) firstSolution = [...assignment]; return; } for (let column = 0; column < size; column += 1) if (matrix[row][column] === 1 && !used.has(column)) { used.add(column); assignment[row] = column; search(row + 1); used.delete(column); assignment[row] = -1; } };
  search(0);
  return solutionCount === 1 ? { valid: true, solutionCount, solution: firstSolution } : { valid: false, solutionCount, reason: solutionCount === 0 ? "no_solution" : "multiple_solutions" };
}

export function validateMurdoku(template: MurdokuTemplate): LogicValidation {
  const structural = validateUniqueAssignment(template.candidateMatrix);
  if (!structural.valid) return structural;
  if (template.size !== template.entities.length || template.size !== template.attributes.length) return { valid: false, solutionCount: structural.solutionCount, reason: "size_mismatch" };
  const clueIds = new Set(template.clues.map((clue) => clue.id));
  if (template.clues.length === 0 || template.clues.some((clue) => !clue.id || !clue.text || clue.references.some((ref) => !clueIds.has(ref) && !template.attributes.includes(ref) && !template.entities.includes(ref)))) return { valid: false, solutionCount: structural.solutionCount, reason: "invalid_clue_reference" };
  if (JSON.stringify(template.solution) !== JSON.stringify(structural.solution)) return { valid: false, solutionCount: structural.solutionCount, reason: "solution_mismatch" };
  return structural;
}

export function canChangeNarrativeOnly(before: CandidateMatrix, after: CandidateMatrix) { return JSON.stringify(before) === JSON.stringify(after); }

export type SpatialCell = { row: number; col: number; roomId: string; objectId?: string; wallNorth?: boolean; wallSouth?: boolean; wallEast?: boolean; wallWest?: boolean };
export type SpatialPosition = { entityId: string; row: number; col: number; roomId: string };

export function isOrthogonallyBeside(a: SpatialPosition, b: SpatialPosition, cells: SpatialCell[]) {
  if (a.roomId !== b.roomId) return false;
  const distance = Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  if (distance !== 1) return false;
  const from = cells.find((cell) => cell.row === a.row && cell.col === a.col);
  const to = cells.find((cell) => cell.row === b.row && cell.col === b.col);
  if (!from || !to) return false;
  if (b.row < a.row && from.wallNorth) return false;
  if (b.row > a.row && from.wallSouth) return false;
  if (b.col < a.col && from.wallWest) return false;
  if (b.col > a.col && from.wallEast) return false;
  return true;
}

export function isSouthOf(a: SpatialPosition, b: SpatialPosition) { return a.row > b.row; }
export function isNorthOf(a: SpatialPosition, b: SpatialPosition) { return a.row < b.row; }
export function isEastOf(a: SpatialPosition, b: SpatialPosition) { return a.col > b.col; }
export function isWestOf(a: SpatialPosition, b: SpatialPosition) { return a.col < b.col; }

export function validateCrimeCondition(positions: SpatialPosition[], victimId: string, murdererId: string) {
  const victim = positions.find((p) => p.entityId === victimId); const murderer = positions.find((p) => p.entityId === murdererId);
  if (!victim || !murderer || victim.roomId !== murderer.roomId || victimId === murdererId) return false;
  return positions.filter((p) => p.roomId === victim.roomId).every((p) => p.entityId === victimId || p.entityId === murdererId);
}

export function validateClueQuality(clues: MurdokuClue[]) {
  const ids = clues.map((clue) => clue.id); const unique = new Set(ids).size === ids.length;
  return unique && clues.length >= 10 && clues.length <= 40 && clues.every((clue) => clue.text.trim().length > 0);
}
