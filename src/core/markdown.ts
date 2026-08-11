export interface Section { title: string; body: string }

export interface MarkdownTable { columns: string[]; rows: string[][] }

export function headingKey(value: string): string {
  return value.replace(/^#{1,6}\s+/, "").replace(/^\d+(?:\.\d+)*[.)]?\s*/, "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function sections(body: string): Section[] {
  const matches = [...body.matchAll(/^##\s+(.+)$/gm)];
  return matches.map((match, index) => ({
    title: match[1]!.trim(),
    body: body.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? body.length).trim()
  }));
}

export function allSections(body: string): Section[] {
  const matches = [...body.matchAll(/^#{2,6}\s+(.+)$/gm)];
  return matches.map((match, index) => ({
    title: match[1]!.trim(),
    body: body.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? body.length).trim()
  }));
}

export function markdownTables(section: string): MarkdownTable[] {
  const lines = section.split("\n");
  const tables: MarkdownTable[] = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!/^\s*\|.*\|\s*$/.test(lines[index]!) || !/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(lines[index + 1]!)) continue;
    const split = (line: string) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
    const rows: string[][] = [];
    let cursor = index + 2;
    while (cursor < lines.length && /^\s*\|.*\|\s*$/.test(lines[cursor]!)) rows.push(split(lines[cursor++]!));
    tables.push({ columns: split(lines[index]!), rows });
    index = cursor - 1;
  }
  return tables;
}

/**
 * A row an author actually filled in.
 *
 * Content validation, specification sizing and ledger parsing all need the same
 * answer to "is this row real", and they must agree: a row that counts as
 * completed for one and as noise for another would report contradictory facts
 * about the same table.
 */
export function completedRows(table: MarkdownTable): string[][] {
  return table.rows.filter(completedRow);
}

export function meaningful(value: string): boolean {
  const stripped = value.replace(/<!--[\s\S]*?-->/g, "").replace(/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/gm, "").trim();
  return stripped.length > 0;
}

export function sectionBody(body: string, heading: string): string | null {
  return allSections(body).find((candidate) => headingKey(candidate.title) === headingKey(heading))?.body ?? null;
}

/**
 * Every pipe row in a section, header rows included, dividers dropped.
 *
 * Authors write long tables in blocks separated by blank lines, and often
 * without repeating the header. Markdown renders that as one table and a reader
 * counts it as one table, but a strict header-then-divider parser sees only the
 * first block and silently reports a fraction of the rows. Anything measuring a
 * section — how many cases it holds, which questions it lists — has to read the
 * whole section, not the first well-formed table in it.
 */
export function dataRows(section: string): string[][] {
  return section.split("\n")
    .filter((line) => /^\s*\|.*\|\s*$/.test(line) && !/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(line))
    .map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()));
}

export function completedRow(row: string[]): boolean {
  return row.some((cell) => meaningful(cell)) && !row.some((cell) => /\{\{|<PLACEHOLDER|\bTBD\b|\[TODO/i.test(cell));
}
