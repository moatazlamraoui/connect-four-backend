import { Connect4, Connect4AI } from 'connect4-ai';
import type { AiDifficulty, PlayerSymbol } from '../models/Game';
import { AppError } from '../utils/AppError';

/**
 * Adapter Pattern: the application talks to this stable interface, while this
 * class translates calls to the third-party connect4-ai package.
 */
export class ConnectFourEngineAdapter {
  public validateColumn(history: number[], column: number): void {
    const engine = new Connect4();
    for (const previousColumn of history) engine.play(previousColumn);
    if (!engine.canPlay(column)) throw new AppError(409, 'The selected column is full or the move is not legal.');
  }

  public chooseAiColumn(history: number[], difficulty: AiDifficulty): number {
    const engine = new Connect4AI();
    for (const previousColumn of history) engine.play(previousColumn);

    const returnedColumn = engine.playAI(difficulty);
    if (typeof returnedColumn === 'number' && Number.isInteger(returnedColumn) && returnedColumn >= 0 && returnedColumn <= 6) {
      return returnedColumn as number;
    }

    // Some published builds expose the selected move through the plays array.
    const plays = engine.plays;
    if (Array.isArray(plays) && plays.length > history.length) {
      const last = plays[plays.length - 1];
      if (Number.isInteger(last) && last >= 0 && last <= 6) return last;
    }

    // Fail loudly instead of silently replacing the requested AI with another algorithm.
    throw new AppError(500, 'connect4-ai did not return the AI column. Check the installed package version.');
  }

  public static nextSymbol(symbol: PlayerSymbol): PlayerSymbol {
    return symbol === 'R' ? 'Y' : 'R';
  }
}
