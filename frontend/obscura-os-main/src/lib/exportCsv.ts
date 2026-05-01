/**
 * exportCsv — utility for Phase C2.
 *
 * Generates a CSV string from a list of objects and triggers a browser
 * download. Used to export receipts, invoices, streams, and stealth
 * inbox history for accounting / reconciliation.
 */

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? value : String(value);
  // Always quote — it's the safest. Escape quotes by doubling.
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    s = s.replace(/"/g, '""');
  }
  return `"${s}"`;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: readonly T[],
  columns: readonly { key: keyof T & string; label: string }[]
): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","))
    .join("\n");
  return body.length > 0 ? `${header}\n${body}\n` : `${header}\n`;
}

export function downloadCsv(filename: string, csvContent: string) {
  if (typeof document === "undefined") return;
  // Prepend BOM so Excel reads UTF-8 correctly.
  const blob = new Blob(["\ufeff", csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
