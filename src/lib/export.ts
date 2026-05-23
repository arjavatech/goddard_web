/** Escapes a value for safe CSV inclusion. */
export function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Triggers a CSV file download in the browser. */
export function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const csvContent = [
    'The Goddard School',
    '',
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Opens a print window with a styled HTML table for PDF export. */
export function printAsPDF(title: string, headers: string[], rows: string[][]): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const logoSrc = `${window.location.origin}/images/gs_logo_lynnwood.png`;
  const tableRows = rows
    .map(row => `<tr>${row.map(cell => `<td>${cell.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`)
    .join('');

  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; }
  .header { text-align: center; margin-bottom: 16px; }
  .logo { height: 60px; width: auto; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p { font-size: 12px; color: #666; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background-color: #f5f5f5; font-weight: 600; }
  tr:nth-child(even) { background-color: #fafafa; }
  @media print { body { margin: 0; } }
</style></head><body>
<div class="header">
  <img src="${logoSrc}" alt="The Goddard School" class="logo" />
  <h1>${title}</h1>
  <p>Exported on ${new Date().toLocaleDateString()} &bull; ${rows.length} records</p>
</div>
<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${tableRows}</tbody></table>
</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
