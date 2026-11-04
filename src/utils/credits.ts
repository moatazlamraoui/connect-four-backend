export const CREATE_HUMAN_GAME_COST = 0.45;
export const CREATE_AI_GAME_COST = 0.75;
export const MOVE_COST = 0.05;

export function roundCredits(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function readCredits(value: number | string | null | undefined): number {
  return roundCredits(Number(value ?? 0));
}
