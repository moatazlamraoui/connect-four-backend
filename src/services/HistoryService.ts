import PDFDocument from 'pdfkit';
import { Op, WhereOptions } from 'sequelize';
import type { Response } from 'express';
import { Game } from '../models/Game';
import { Move } from '../models/Move';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';

export interface HistoryFilter {
  format: 'json' | 'pdf';
  from?: string;
  to?: string;
  period?: '24h' | '7d' | '30d';
}

function getDateRange(filter: HistoryFilter): { from?: Date; to?: Date } {
  if (filter.period) {
    const duration = filter.period === '24h' ? 24 * 60 * 60 * 1000
      : filter.period === '7d' ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
    return { from: new Date(Date.now() - duration), to: new Date() };
  }
  return {
    ...(filter.from ? { from: new Date(filter.from) } : {}),
    ...(filter.to ? { to: new Date(filter.to) } : {})
  };
}

export class HistoryService {
  static async export(gameId: number, userId: number, filter: HistoryFilter, response: Response): Promise<void> {
    const game = await Game.findByPk(gameId);
    if (!game) throw new AppError(404, 'Game not found.');
    if (game.player1Id !== userId && game.player2Id !== userId) throw new AppError(403, 'You are not a participant in this game.');

    const range = getDateRange(filter);
    const createdAt: any = {};
    if (range.from) createdAt[Op.gte] = range.from;
    if (range.to) createdAt[Op.lte] = range.to;
    const where: WhereOptions = { gameId, ...(Object.getOwnPropertySymbols(createdAt).length ? { createdAt } : {}) };
    const moves = await Move.findAll({ where, order: [['createdAt', 'ASC']] });

    const playerIds = [...new Set(moves.map((move) => move.playerId).filter((id): id is number => id !== null))];
    const players = playerIds.length ? await User.findAll({ where: { id: playerIds } }) : [];
    const names = new Map<number, string>(players.map((player): [number, string] => [player.id, player.username]));
    const rows = moves.map((move) => ({
      moveNumber: move.id,
      player: names.get(move.playerId ?? -1) ?? (move.isAi ? 'Computer' : 'Unknown'),
      symbol: move.playerSymbol,
      column: move.column,
      isAi: move.isAi,
      at: move.createdAt
    }));

    if (filter.format === 'json') {
      response.json({ gameId, mode: game.mode, filter, moves: rows });
      return;
    }

    response.status(200);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="connect-four-game-${gameId}-history.pdf"`);
    const pdf = new PDFDocument({ margin: 48, size: 'A4' });
    pdf.pipe(response);
    pdf.fontSize(20).text(`Connect Four - Game ${gameId}`);
    pdf.moveDown(0.5).fontSize(11).text(`Mode: ${game.mode}`);
    pdf.text(`Status: ${game.status}`);
    pdf.text(`Generated: ${new Date().toISOString()}`);
    pdf.moveDown().fontSize(13).text('Move history');
    pdf.moveDown(0.4).fontSize(10);
    if (!rows.length) pdf.text('No moves found for the selected period.');
    for (const row of rows) {
      pdf.text(`#${row.moveNumber} | ${row.player} (${row.symbol}) | column ${row.column} | ${row.at.toISOString()}${row.isAi ? ' | AI' : ''}`);
      if (pdf.y > 730) pdf.addPage();
    }
    pdf.end();
  }
}
