// RFC 4180 CSV: quoted fields, embedded quotes/newlines. Cells that would start a spreadsheet formula are prefixed with '.
export function toCsv(rows: unknown[][]): string {
  const cell = (v: unknown) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^\uFEFF/, ''); const out: string[][] = []; let row: string[] = []; let f = ''; let q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; continue; }
    if (ch === '"' && f === '') { q = true; continue; }
    if (ch === ',') { row.push(f); f = ''; continue; }
    if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; continue; }
    f += ch;
  }
  if (f !== '' || row.length) { row.push(f); out.push(row); }
  return out.map((r) => r.map((x) => (x.startsWith("'") && /^'[=+\-@]/.test(x) ? x.slice(1) : x)));
}
