/**
 * Pure statistics logic (no database access) so that it can be unit-tested.
 *
 * Rules:
 *  - a win/loss caused by the opponent leaving (ABANDONED) or by the turn timer
 *    running out (TIMEOUT) is counted as "by abandonment";
 *  - a DRAW is counted separately;
 *  - the score is wins + winsByAbandonment;
 *  - HUMAN_VS_AI games are reported separately from games against real users.
 */
export interface FinishedGameLike {
  status: string;
  mode: 'HUMAN_VS_HUMAN' | 'HUMAN_VS_AI';
  player1Id: number;
  player2Id: number | null;
  winnerSymbol: 'R' | 'Y' | null;
}

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

export function emptyBucket(): GameStatsBucket {
  return { played: 0, wins: 0, winsByAbandonment: 0, losses: 0, lossesByAbandonment: 0, draws: 0 };
}

export function emptyStats(): UserStats {
  return { human: emptyBucket(), ai: emptyBucket(), total: emptyBucket(), score: 0 };
}

const ABANDON_LIKE = new Set(['ABANDONED', 'TIMEOUT']);

function record(stats: UserStats, game: FinishedGameLike, symbol: 'R' | 'Y'): void {
  const bucket = game.mode === 'HUMAN_VS_AI' ? stats.ai : stats.human;
  for (const target of [bucket, stats.total]) {
    target.played += 1;
    if (game.status === 'DRAW') {
      target.draws += 1;
    } else if (game.winnerSymbol === symbol) {
      if (ABANDON_LIKE.has(game.status)) target.winsByAbandonment += 1;
      else target.wins += 1;
    } else if (ABANDON_LIKE.has(game.status)) {
      target.lossesByAbandonment += 1;
    } else {
      target.losses += 1;
    }
  }
  stats.score = stats.total.wins + stats.total.winsByAbandonment;
}

/** Single pass over the games: O(games), independent from the number of users. */
export function aggregateStats(games: FinishedGameLike[]): Map<number, UserStats> {
  const result = new Map<number, UserStats>();
  const get = (id: number): UserStats => {
    let stats = result.get(id);
    if (!stats) {
      stats = emptyStats();
      result.set(id, stats);
    }
    return stats;
  };
  for (const game of games) {
    record(get(game.player1Id), game, 'R');
    if (game.player2Id !== null) record(get(game.player2Id), game, 'Y');
  }
  return result;
}
