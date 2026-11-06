import type { HistoryExporter } from './HistoryExporter';
import { JsonHistoryExporter } from './JsonHistoryExporter';
import { PdfHistoryExporter } from './PdfHistoryExporter';

export * from './HistoryExporter';

/** Registry of the available strategies, keyed by the "format" query value. */
export const historyExporters: Record<'json' | 'pdf', HistoryExporter> = {
  json: new JsonHistoryExporter(),
  pdf: new PdfHistoryExporter()
};
