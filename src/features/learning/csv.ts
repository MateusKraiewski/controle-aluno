/** RFC 4180 field: quoted when needed, and a leading =,+,-,@ is neutralised against spreadsheet formula injection. */
export function csvField(value: string | null | undefined) {
  let text = value ?? "";
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n;]/.test(text) || text !== text.trim() ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

export function toCsv(header: string[], rows: (string | null | undefined)[][]) {
  // BOM so spreadsheet apps read UTF-8 accents correctly; CRLF per RFC 4180.
  return "﻿" + [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}
