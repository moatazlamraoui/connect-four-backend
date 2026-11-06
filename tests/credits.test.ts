import { MOVE_COST, CREATE_AI_GAME_COST, CREATE_HUMAN_GAME_COST, readCredits, roundCredits } from '../src/utils/credits';

describe('credit helpers', () => {
  test('uses the tariffs of the specification', () => {
    expect(CREATE_HUMAN_GAME_COST).toBe(0.45);
    expect(CREATE_AI_GAME_COST).toBe(0.75);
    expect(MOVE_COST).toBe(0.05);
  });

  test('rounding avoids floating point drift', () => {
    expect(roundCredits(0.1 + 0.2)).toBe(0.3);
    expect(roundCredits(10 - 0.45 - 0.05 - 0.05)).toBe(9.45);
  });

  test('readCredits normalises strings and null', () => {
    expect(readCredits('9.55')).toBe(9.55);
    expect(readCredits(null)).toBe(0);
  });

  test('the balance may go below zero during a game', () => {
    expect(roundCredits(0.03 - MOVE_COST)).toBe(-0.02);
  });
});
