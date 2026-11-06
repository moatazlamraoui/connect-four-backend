import { Op } from 'sequelize';
import { Game } from '../models/Game';
import type { GameStatus } from '../models/Game';
import { User } from '../models/User';
import { aggregateStats, emptyStats } from './statsAggregator';
import type { UserStats } from './statsAggregator';

export type { GameStatsBucket, UserStats } from './statsAggregator';

const COMPLETED_STATUSES: GameStatus[] = ['FINISHED', 'ABANDONED', 'TIMEOUT', 'DRAW'];

export class LeaderboardService {
  static async getLeaderboard(order: 'asc' | 'desc' = 'desc'): Promise<Record<string, unknown>[]> {
    const users = await User.findAll({ attributes: ['id', 'username'] });
    const games = await Game.findAll({
      where: { status: { [Op.in]: COMPLETED_STATUSES } },
      attributes: ['status', 'mode', 'player1Id', 'player2Id', 'winnerSymbol']
    });
    const stats = aggregateStats(games);

    const rows = users.map((user) => ({ id: user.id, username: user.username, ...(stats.get(user.id) ?? emptyStats()) }));
    rows.sort((a, b) => {
      const difference = a.score - b.score;
      if (difference !== 0) return order === 'asc' ? difference : -difference;
      return a.username.localeCompare(b.username);
    });
    return rows;
  }

  static async getUserStats(userId: number): Promise<UserStats> {
    const games = await Game.findAll({
      where: {
        status: { [Op.in]: COMPLETED_STATUSES },
        [Op.or]: [{ player1Id: userId }, { player2Id: userId }]
      },
      attributes: ['status', 'mode', 'player1Id', 'player2Id', 'winnerSymbol']
    });
    return aggregateStats(games).get(userId) ?? emptyStats();
  }
}
