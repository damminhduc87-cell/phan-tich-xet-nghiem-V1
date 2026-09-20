/**
 * Utility to repair and normalize Markdown tables and structure,
 * fixing common LLM streaming/formatting anomalies (e.g. `||` concatenations,
 * missing table header separators, missing newlines before/after tables).
 */
export function normalizeMarkdown(content: string): string {
  if (!content) return "";

  let text = content;

  // 1. Fix cases where multiple markdown table rows were generated on the same line with "||"
  // e.g. "| A | B || C | D |" -> "| A | B |\n| C | D |"
  text = text.replace(/\|\s*\|\s*\|/g, "|\n|");
  text = text.replace(/\|\s*\|(?!\s*\|)/g, "|\n|");

  // 2. Fix lines that have multiple pipes glued together like "|| BIL_U |" -> "\n| BIL_U |"
  text = text.replace(/\|\|\s*([a-zA-Z0-9_#])/g, "|\n| $1");

  // 3. Ensure every row that starts with "|" is on its own line if preceded by "|"
  text = text.replace(/\|\s+(\|[a-zA-Z0-9_])/g, "|\n$1");

  // 4. Look for table headers missing separator row (|---|---|...)
  const lines = text.split("\n");
  const fixedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i].trim();
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";

    fixedLines.push(lines[i]);

    // Detect if this line is a table header (e.g., starts and ends with |, has column keywords)
    const isHeaderLine =
      currentLine.startsWith("|") &&
      currentLine.endsWith("|") &&
      (currentLine.toLowerCase().includes("chỉ số") ||
        currentLine.toLowerCase().includes("kết quả") ||
        currentLine.toLowerCase().includes("tham chiếu") ||
        currentLine.toLowerCase().includes("đánh giá") ||
        currentLine.toLowerCase().includes("stt"));

    const hasSeparatorNext =
      nextLine.startsWith("|") && (nextLine.includes("---") || nextLine.includes(":---") || nextLine.includes("-|-"));

    if (isHeaderLine && !hasSeparatorNext) {
      // Calculate column count from header
      const columnCount = (currentLine.match(/\|/g) || []).length - 1;
      if (columnCount > 0) {
        const separator = "|" + Array(columnCount).fill(" :--- |").join("");
        fixedLines.push(separator);
      }
    }
  }

  // 5. Ensure proper blank line spacing before and after markdown tables
  const safeLines: string[] = [];
  for (let i = 0; i < fixedLines.length; i++) {
    const line = fixedLines[i];
    const trimmed = line.trim();
    const prevTrimmed = i > 0 ? fixedLines[i - 1].trim() : "";
    const nextTrimmed = i + 1 < fixedLines.length ? fixedLines[i + 1].trim() : "";

    const isTableRow = trimmed.startsWith("|") && trimmed.endsWith("|");
    const prevIsTableRow = prevTrimmed.startsWith("|") && prevTrimmed.endsWith("|");
    const nextIsTableRow = nextTrimmed.startsWith("|") && nextTrimmed.endsWith("|");

    if (isTableRow && !prevIsTableRow && prevTrimmed !== "" && safeLines.length > 0) {
      if (safeLines[safeLines.length - 1] !== "") {
        safeLines.push("");
      }
    }

    safeLines.push(line);

    if (isTableRow && !nextIsTableRow && nextTrimmed !== "") {
      safeLines.push("");
    }
  }

  return safeLines.join("\n");
}
