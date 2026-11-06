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

  test('detects a diagonal win', () => {
    const board = emptyBoard();
    // R pieces on (5,0) (4,1) (3,2) (2,3): bottom-left to top-right diagonal
    dropPiece(board, 0, 'R');
    dropPiece(board, 1, 'Y'); dropPiece(board, 1, 'R');
    dropPiece(board, 2, 'Y'); dropPiece(board, 2, 'Y'); dropPiece(board, 2, 'R');
    dropPiece(board, 3, 'Y'); dropPiece(board, 3, 'Y'); dropPiece(board, 3, 'Y'); dropPiece(board, 3, 'R');
    expect(hasWon(board, 'R')).toBe(true);
  });

  test('does not report a win for three in a row', () => {
    const board = emptyBoard();
    [0, 1, 2].forEach((column) => dropPiece(board, column, 'R'));
    expect(hasWon(board, 'R')).toBe(false);
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
