declare module 'connect4-ai' {
  export type Difficulty = 'easy' | 'medium' | 'hard';
  export class Connect4 {
    constructor();
    canPlay(column: number): boolean;
    play(column: number): unknown;
    gameStatus(): { gameOver: boolean; winner?: number | null };
    ascii: string;
  }
  export class Connect4AI {
    constructor();
    canPlay(column: number): boolean;
    play(column: number): unknown;
    playAI(difficulty: Difficulty): number | void;
    gameStatus(): { gameOver: boolean; winner?: number | null };
    plays?: number[];
    ascii(): string;
  }
}
