import type { Response } from 'express';
import type { HistoryExporter, HistoryReport } from './HistoryExporter';

export class JsonHistoryExporter implements HistoryExporter {
  send(report: HistoryReport, response: Response): void {
    response.json({ ...report, totalMoves: report.moves.length });
  }
}
