import type { Response } from 'express';
import { JsonHistoryExporter } from '../src/exporters/JsonHistoryExporter';
import { historyExporters } from '../src/exporters';
import type { HistoryReport } from '../src/exporters';

const report: HistoryReport = {
  gameId: 1,
  mode: 'HUMAN_VS_AI',
  status: 'FINISHED',
  filter: { period: '7d' },
  generatedAt: new Date('2026-06-10T12:00:00Z'),
  moves: [
    { moveNumber: 1, player: 'alice', symbol: 'R', column: 3, isAi: false, at: new Date('2026-06-10T11:00:00Z') },
    { moveNumber: 2, player: 'Computer', symbol: 'Y', column: 4, isAi: true, at: new Date('2026-06-10T11:00:01Z') }
  ]
};

describe('history exporters (Strategy pattern)', () => {
  test('JSON strategy writes the report with the move count', () => {
    const response = { json: jest.fn() } as unknown as Response;
    new JsonHistoryExporter().send(report, response);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ gameId: 1, totalMoves: 2 }));
  });

  test('both formats are registered as strategies', () => {
    expect(Object.keys(historyExporters).sort()).toEqual(['json', 'pdf']);
  });
});
