import { aggregateStats } from '../src/services/statsAggregator';
import type { FinishedGameLike } from '../src/services/statsAggregator';

const game = (overrides: Partial<FinishedGameLike>): FinishedGameLike => ({
  status: 'FINISHED', mode: 'HUMAN_VS_HUMAN', player1Id: 1, player2Id: 2, winnerSymbol: 'R', ...overrides
});

describe('leaderboard statistics', () => {
  test('counts normal wins and losses, split by opponent type', () => {
    const stats = aggregateStats([
      game({ winnerSymbol: 'R' }),                                       // user 1 beats user 2
      game({ mode: 'HUMAN_VS_AI', player2Id: null, winnerSymbol: 'Y' })  // user 1 loses to the AI
    ]);
    expect(stats.get(1)?.human.wins).toBe(1);
    expect(stats.get(2)?.human.losses).toBe(1);
    expect(stats.get(1)?.ai.losses).toBe(1);
    expect(stats.get(1)?.ai.wins).toBe(0);
  });

  test('abandonment and timeout are counted "by abandonment"', () => {
    const stats = aggregateStats([
      game({ status: 'ABANDONED', winnerSymbol: 'Y' }),
      game({ status: 'TIMEOUT', winnerSymbol: 'R' })
    ]);
    expect(stats.get(2)?.human.winsByAbandonment).toBe(1);
    expect(stats.get(1)?.human.lossesByAbandonment).toBe(1);
    expect(stats.get(1)?.human.winsByAbandonment).toBe(1);
  });

  test('score = wins + wins by abandonment, draws do not score', () => {
    const stats = aggregateStats([
      game({ winnerSymbol: 'R' }),
      game({ status: 'ABANDONED', winnerSymbol: 'R' }),
      game({ status: 'DRAW', winnerSymbol: null })
    ]);
    expect(stats.get(1)?.score).toBe(2);
    expect(stats.get(1)?.total.draws).toBe(1);
    expect(stats.get(1)?.total.played).toBe(3);
    expect(stats.get(2)?.score).toBe(0);
  });
});
