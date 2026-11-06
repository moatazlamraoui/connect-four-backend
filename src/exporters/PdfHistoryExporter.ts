import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import type { HistoryExporter, HistoryReport } from './HistoryExporter';

export class PdfHistoryExporter implements HistoryExporter {
  send(report: HistoryReport, response: Response): void {
    response.status(200);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="connect-four-game-${report.gameId}-history.pdf"`);

    const pdf = new PDFDocument({ margin: 48, size: 'A4' });
    pdf.pipe(response);
    pdf.fontSize(20).text(`Connect Four - Game ${report.gameId}`);
    pdf.moveDown(0.5).fontSize(11).text(`Mode: ${report.mode}`);
    pdf.text(`Status: ${report.status}`);
    pdf.text(`Generated: ${report.generatedAt.toISOString()}`);
    const { from, to, period } = report.filter;
    if (period) pdf.text(`Period: last ${period}`);
    if (from) pdf.text(`From: ${from}`);
    if (to) pdf.text(`To: ${to}`);
    pdf.moveDown().fontSize(13).text('Move history');
    pdf.moveDown(0.4).fontSize(10);
    if (!report.moves.length) pdf.text('No moves found for the selected period.');
    // PDFKit adds new pages automatically when the text reaches the bottom margin.
    for (const row of report.moves) {
      pdf.text(`#${row.moveNumber} | ${row.player} (${row.symbol}) | column ${row.column} | ${row.at.toISOString()}${row.isAi ? ' | AI' : ''}`);
    }
    pdf.end();
  }
}
