import { Connect4, Connect4AI } from 'connect4-ai';
import type { AiDifficulty } from '../models/Game';
import { ErrorFactory } from '../utils/ErrorFactory';

/** The contract the application depends on (the "target" interface of the Adapter). */
export interface GameEnginePort {
  validateColumn(history: number[], column: number): void;
  chooseAiColumn(history: number[], difficulty: AiDifficulty): number;
}

/**
 * Adapter Pattern: the application talks to GameEnginePort, while this class
 * translates the calls to the third-party `connect4-ai` package. The engine is
 * stateless on our side: it is rebuilt from the list of played columns every time,
 * so the database remains the single source of truth.
 */
export class ConnectFourEngineAdapter implements GameEnginePort {
  public validateColumn(history: number[], column: number): void {
    const engine = new Connect4();
    for (const previousColumn of history) engine.play(previousColumn);
    if (!engine.canPlay(column)) throw ErrorFactory.conflict('The selected column is full or the move is not legal.');
  }

  public chooseAiColumn(history: number[], difficulty: AiDifficulty): number {
    const engine = new Connect4AI();
    for (const previousColumn of history) engine.play(previousColumn);

    const returnedColumn = engine.playAI(difficulty);
    if (typeof returnedColumn === 'number' && Number.isInteger(returnedColumn) && returnedColumn >= 0 && returnedColumn <= 6) {
      return returnedColumn;
    }

    // Some published builds expose the selected move through the plays array.
    const plays = engine.plays;
    if (Array.isArray(plays) && plays.length > history.length) {
      const last = plays[plays.length - 1];
      if (Number.isInteger(last) && last >= 0 && last <= 6) return last;
    }

    // Fail loudly instead of silently replacing the requested AI with another algorithm.
    throw ErrorFactory.internal('connect4-ai did not return the AI column. Check the installed package version.');
  }
}
