import { emptyBoard, dropPiece, hasWon, isBoardFull } from '../src/utils/board';

describe('Connect Four board rules', () => {
  test('detects a horizontal win', () => {
    const board = emptyBoard();
    [0, 1, 2, 3].forEach((column) => dropPiece(board, column, 'R'));
    expect(hasWon(board, 'R')).toBe(true);
  });

  test('detects a vertical win', () => {
    const board = emptyBoard();
    for (let i = 0; i < 4; i += 1) dropPiece(board, 2, 'Y');
    expect(hasWon(board, 'Y')).toBe(true);
  });

  test('rejects invalid columns and full columns', () => {
    const board = emptyBoard();
    expect(dropPiece(board, 7, 'R')).toBe(-1);
    for (let i = 0; i < 6; i += 1) dropPiece(board, 0, 'R');
    expect(dropPiece(board, 0, 'Y')).toBe(-1);
  });

  test('detects a full board', () => {
    const board = Array.from({ length: 6 }, () => Array.from({ length: 7 }, () => 'R' as const));
    expect(isBoardFull(board)).toBe(true);
  });
});
