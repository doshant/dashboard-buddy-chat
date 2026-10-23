// Turns the markdown tables in an assistant reply into downloadable Excel or CSV files.

export type ReplyTable = { headers: string[]; rows: string[][] };

const separatorCell = /^:?-{3,}:?$/;

function splitRow(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim().replace(/\*\*/g, ""));
}

export function tablesFromMarkdown(markdown: string): ReplyTable[] {
  const tables: ReplyTable[] = [];
  let block: string[][] = [];
  const flush = () => {
    const [headers, ...rest] = block.filter((row) => !row.every((cell) => separatorCell.test(cell)));
    if (headers && rest.length) tables.push({ headers, rows: rest });
    block = [];
  };
  for (const line of markdown.split("\n")) {
    if (line.trim().startsWith("|")) block.push(splitRow(line));
    else if (block.length) flush();
  }
  if (block.length) flush();
  return tables;
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Several tables share one CSV, separated by a blank line.
export function tablesToCsv(tables: ReplyTable[]) {
  return tables
    .map(({ headers, rows }) => [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n"))
    .join("\r\n\r\n");
}

// Plain counts become numbers in Excel; anything formatted ($24.5M, 94%, 17.4M) stays as shown.
export function excelValue(cell: string) {
  return /^-?\d+(\.\d+)?$/.test(cell) ? Number(cell) : cell;
}

// Excel sheet names: at most 31 characters, none of []:*?/\ and unique within the file.
export function sheetNames(tables: ReplyTable[]) {
  const used = new Set<string>();
  return tables.map(({ headers }, index) => {
    const base = (headers[0] || `Table ${index + 1}`).replace(/[[\]:*?/\\]/g, "-").slice(0, 28).trim();
    let name = base;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} ${n}`;
    used.add(name.toLowerCase());
    return name;
  });
}

// Files are named after what the tables show (e.g. "Payer mix"), minus characters file systems reject.
export function exportFileName(title: string) {
  const name = title
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  return name || "Dashboard Assistant";
}

export function downloadCsv(tables: ReplyTable[], fileName: string) {
  // The byte-order mark makes Excel read the file as UTF-8 (for characters like "–").
  const blob = new Blob(["﻿", tablesToCsv(tables)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: `${fileName}.csv` });
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadXlsx(tables: ReplyTable[], fileName: string) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const names = sheetNames(tables);
  const sheets = tables.map(({ headers, rows }, index) => ({
    sheet: names[index]!,
    stickyRowsCount: 1,
    columns: headers.map((_, column) => ({
      width: Math.min(48, Math.max(10, ...[headers, ...rows].map((row) => (row[column] ?? "").length + 2))),
    })),
    data: [
      headers.map((value) => ({ value, fontWeight: "bold" as const })),
      ...rows.map((row) => row.map((cell) => ({ value: excelValue(cell) }))),
    ],
  }));
  await writeXlsxFile(sheets).toFile(`${fileName}.xlsx`);
}
