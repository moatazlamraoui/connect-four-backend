import type { PlayerSymbol } from '../models/Game';

export type Board = (PlayerSymbol | null)[][];

export function emptyBoard(): Board {
  return Array.from({ length: 6 }, () => Array<PlayerSymbol | null>(7).fill(null));
}

export function dropPiece(board: Board, column: number, symbol: PlayerSymbol): number {
  if (!Number.isInteger(column) || column < 0 || column > 6) return -1;
  for (let row = 5; row >= 0; row -= 1) {
    if (board[row][column] === null) {
      board[row][column] = symbol;
      return row;
    }
  }
  return -1;
}

export function hasWon(board: Board, symbol: PlayerSymbol): boolean {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]] as const;
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      if (board[row][column] !== symbol) continue;
      for (const [dr, dc] of directions) {
        let count = 1;
        for (let step = 1; step < 4; step += 1) {
          const nextRow = row + dr * step;
          const nextColumn = column + dc * step;
          if (nextRow < 0 || nextRow >= 6 || nextColumn < 0 || nextColumn >= 7) break;
          if (board[nextRow][nextColumn] !== symbol) break;
          count += 1;
        }
        if (count === 4) return true;
      }
    }
  }
  return false;
}

export function isBoardFull(board: Board): boolean {
  return board[0].every((cell) => cell !== null);
}
