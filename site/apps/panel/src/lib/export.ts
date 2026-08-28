// Eksport danych do CSV i Excel (.xls) — bez zależności zewnętrznych.
// CSV: UTF-8 z BOM (Excel PL otwiera poprawnie). XLS: tabela HTML z nagłówkiem mso — Excel
// otwiera jako arkusz z pogrubionym nagłówkiem.

type Cell = string | number;
type Rows = Cell[][];

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Rows) {
  const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  triggerDownload(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

const esc = (x: Cell) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function downloadXls(filename: string, sheetName: string, rows: Rows) {
  const [head, ...body] = rows;
  const thead = head ? `<tr>${head.map((c) => `<th style="background:#1B4332;color:#fff;font-weight:700;padding:6px 10px;text-align:left">${esc(c)}</th>`).join('')}</tr>` : '';
  const tbody = body.map((r) => `<tr>${r.map((c) => `<td style="padding:5px 10px;border-bottom:1px solid #E5E7EB">${esc(c)}</td>`).join('')}</tr>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${esc(sheetName)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body><table>${thead}${tbody}</table></body></html>`;
  triggerDownload(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }), filename.endsWith('.xls') ? filename : `${filename}.xls`);
}
