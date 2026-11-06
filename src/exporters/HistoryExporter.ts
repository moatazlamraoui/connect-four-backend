import type { Response } from 'express';

export interface HistoryRow {
  /** Position of the move inside the game (1 = first move), independent from any date filter. */
  moveNumber: number;
  player: string;
  symbol: 'R' | 'Y';
  column: number;
  isAi: boolean;
  at: Date;
}

export interface HistoryReport {
  gameId: number;
  mode: string;
  status: string;
  filter: { from?: string; to?: string; period?: string };
  generatedAt: Date;
  moves: HistoryRow[];
}

/**
 * Strategy Pattern: every output format is an interchangeable strategy that knows
 * how to write a HistoryReport to the HTTP response. HistoryService picks the
 * strategy from the "format" query parameter; adding CSV/XML would not touch it.
 */
export interface HistoryExporter {
  send(report: HistoryReport, response: Response): void;
}
