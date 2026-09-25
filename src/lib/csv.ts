export type CsvValue = string | number | boolean | null | undefined;

function escapeCell(value: CsvValue): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(rows: Record<string, CsvValue>[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]);
  const lines = [cols.join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => escapeCell(row[c])).join(","));
  }
  return lines.join("\n");
}

export function downloadCSV(filename: string, rows: Record<string, CsvValue>[], columns?: string[]) {
  const csv = toCSV(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
