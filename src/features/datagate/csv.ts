import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";

const HEADERS = [
  "id",
  "date",
  "date_time",
  "created_at",
  "rating",
  "emotions",
  "tags",
  "note",
  "sleep_quality",
];

const escapeCell = (value: string) => {
  // Quoting alone does not prevent spreadsheet formulas. Keep user text inert.
  // https://community.owasp.org/attacks/CSV_Injection
  const needsPrefix =
    /^[=+@-]/u.test(value.trimStart()) || /^[\t\r\n]/u.test(value);
  const text = needsPrefix ? `'${value}` : value;
  return `"${text.replaceAll('"', '""')}"`;
};

/**
 * One row per entry, with stored rating/emotion keys and current tag names.
 * CSV is for spreadsheets; JSON remains the lossless, importable backup.
 * UTF-8 BOM preserves Unicode in Excel. Cells follow RFC 4180 quoting:
 * https://www.rfc-editor.org/rfc/rfc4180#section-2
 */
export const createCsv = ({
  items,
  tags,
}: {
  items: LogItem[];
  tags: Tag[];
}) => {
  const tagNames = new Map(tags.map((tag) => [tag.id, tag.title]));
  const rows = items.map((item) =>
    [
      item.id,
      item.date,
      item.dateTime,
      item.createdAt,
      item.rating,
      item.emotions.join("; "),
      item.tags.map((tag) => tagNames.get(tag.id) ?? tag.id).join("; "),
      item.message ?? "",
      item.sleep?.quality ?? "",
    ]
      .map(escapeCell)
      .join(",")
  );
  return `\uFEFF${[HEADERS.map(escapeCell).join(","), ...rows].join("\r\n")}\r\n`;
};
