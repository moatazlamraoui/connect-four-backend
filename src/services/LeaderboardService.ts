import { Op } from 'sequelize';
import { Game } from '../models/Game';
import type { GameStatus } from '../models/Game';
import { User } from '../models/User';

export interface GameStatsBucket {
  played: number;
  wins: number;
  winsByAbandonment: number;
  losses: number;
  lossesByAbandonment: number;
  draws: number;
}

export interface UserStats {
  human: GameStatsBucket;
  ai: GameStatsBucket;
  total: GameStatsBucket;
  score: number;
}

function emptyBucket(): GameStatsBucket {
  return { played: 0, wins: 0, winsByAbandonment: 0, losses: 0, lossesByAbandonment: 0, draws: 0 };
}

function addToBucket(bucket: GameStatsBucket, game: Game, userId: number, userSymbol: 'R' | 'Y'): void {
  bucket.played += 1;
  if (game.status === 'DRAW') {
    bucket.draws += 1;
    return;
  }
  if (game.status === 'ABANDONED') {
    if (game.winnerId === userId || (game.winnerId === null && game.winnerSymbol === userSymbol)) {
      bucket.winsByAbandonment += 1;
    } else {
      bucket.lossesByAbandonment += 1;
    }
    return;
  }
  if (game.winnerId === userId || (game.winnerId === null && game.winnerSymbol === userSymbol)) {
    bucket.wins += 1;
  } else {
    bucket.losses += 1;
  }
}

function aggregateForUser(userId: number, games: Game[]): UserStats {
  const human = emptyBucket();
  const ai = emptyBucket();
  for (const game of games) {
    let symbol: 'R' | 'Y' | null = null;
    if (game.player1Id === userId) symbol = 'R';
    else if (game.player2Id === userId) symbol = 'Y';
    if (!symbol) continue;
    addToBucket(game.mode === 'HUMAN_VS_AI' ? ai : human, game, userId, symbol);
  }
  const total: GameStatsBucket = emptyBucket();
  for (const key of Object.keys(total) as (keyof GameStatsBucket)[]) total[key] = human[key] + ai[key];
  return { human, ai, total, score: total.wins + total.winsByAbandonment };
}

export class LeaderboardService {
  static async getLeaderboard(order: 'asc' | 'desc' = 'desc'): Promise<Record<string, unknown>[]> {
    const users = await User.findAll({ attributes: ['id', 'username'] });
    const completedStatuses: GameStatus[] = ['FINISHED', 'ABANDONED', 'TIMEOUT', 'DRAW'];
    const games = await Game.findAll({ where: { status: { [Op.in]: completedStatuses } } });
    const rows = users.map((user) => ({
      id: user.id,
      username: user.username,
      ...aggregateForUser(user.id, games)
    }));
    rows.sort((a, b) => {
      const difference = Number(a.score) - Number(b.score);
      if (difference !== 0) return order === 'asc' ? difference : -difference;
      return String(a.username).localeCompare(String(b.username));
    });
    return rows;
  }

  static async getUserStats(userId: number): Promise<UserStats> {
    const completedStatuses: GameStatus[] = ['FINISHED', 'ABANDONED', 'TIMEOUT', 'DRAW'];
    const games = await Game.findAll({ where: { status: { [Op.in]: completedStatuses } } });
    return aggregateForUser(userId, games);
  }
}
