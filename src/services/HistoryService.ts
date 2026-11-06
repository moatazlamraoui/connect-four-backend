import type { Response } from 'express';
import { Game } from '../models/Game';
import { Move } from '../models/Move';
import { User } from '../models/User';
import { historyExporters } from '../exporters';
import type { HistoryReport } from '../exporters';
import { ErrorFactory } from '../utils/ErrorFactory';
import { isWithinRange, resolveDateRange } from '../utils/dateRange';
import type { DateRangeFilter } from '../utils/dateRange';

export interface HistoryFilter extends DateRangeFilter {
  format: 'json' | 'pdf';
}

export class HistoryService {
  /** Builds the report of the moves of one game, filtered by the requested time window. */
  static async buildReport(gameId: number, userId: number, filter: HistoryFilter): Promise<HistoryReport> {
    const game = await Game.findByPk(gameId);
    if (!game) throw ErrorFactory.notFound('Game not found.');
    if (game.player1Id !== userId && game.player2Id !== userId) throw ErrorFactory.forbidden('You are not a participant in this game.');

    // Number ALL moves first, then filter: move #5 stays #5 even when only the last hour is requested.
    const allMoves = await Move.findAll({ where: { gameId }, order: [['id', 'ASC']] });
    const range = resolveDateRange(filter);

    const playerIds = [...new Set(allMoves.map((move) => move.playerId).filter((id): id is number => id !== null))];
    const players = playerIds.length ? await User.findAll({ where: { id: playerIds }, attributes: ['id', 'username'] }) : [];
    const names = new Map<number, string>(players.map((player): [number, string] => [player.id, player.username]));

    const moves = allMoves
      .map((move, index) => ({
        moveNumber: index + 1,
        player: (move.playerId !== null ? names.get(move.playerId) : undefined) ?? (move.isAi ? 'Computer' : 'Unknown'),
        symbol: move.playerSymbol,
        column: move.column,
        isAi: move.isAi,
        at: move.createdAt
      }))
      .filter((row) => isWithinRange(row.at, range));

    return {
      gameId,
      mode: game.mode,
      status: game.status,
      filter: { ...(filter.from ? { from: filter.from } : {}), ...(filter.to ? { to: filter.to } : {}), ...(filter.period ? { period: filter.period } : {}) },
      generatedAt: new Date(),
      moves
    };
  }

  static async export(gameId: number, userId: number, filter: HistoryFilter, response: Response): Promise<void> {
    const report = await this.buildReport(gameId, userId, filter);
    historyExporters[filter.format].send(report, response);
  }
}
