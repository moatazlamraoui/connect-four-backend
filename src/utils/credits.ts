export const CREATE_HUMAN_GAME_COST = 0.45;
export const CREATE_AI_GAME_COST = 0.75;
export const MOVE_COST = 0.05;

/** Rounds to cents to avoid floating point drift (0.1 + 0.2 !== 0.3). */
export function roundCredits(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** DECIMAL columns may come back from SQLite as strings: normalise to number. */
export function readCredits(value: number | string | null | undefined): number {
  return roundCredits(Number(value ?? 0));
}
