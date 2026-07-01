/**
 * Safely escapes a value for CSV fields.
 *
 * Spreadsheet applications may interpret cells beginning with =, +, -, @,
 * tab, or carriage return as formulas. User-controlled strings are prefixed
 * with an apostrophe so exported admin reports remain data-only when opened in
 * Excel, Google Sheets, or similar tools.
 */
export function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";

  let str = String(val);

  if (typeof val === "string" && /^[\t\r ]*[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }

  return str;
}
