import type { DcconEntry } from "../types";

export function parseDcconList(raw: string): DcconEntry[] {
  try {
    const fn = new Function(raw + "\nreturn dcConsData;");
    const data: unknown[] = fn();
    return data
      .filter(
        (d): d is { name: string; keywords: string[]; tags: string[] } =>
          typeof d === "object" &&
          d !== null &&
          "name" in d &&
          "keywords" in d &&
          "tags" in d
      )
      .map((d) => ({
        name: String(d.name),
        keywords: d.keywords.map(String),
        tags: d.tags.map(String),
      }));
  } catch {
    return parseFallback(raw);
  }
}

function parseFallback(raw: string): DcconEntry[] {
  const entries: DcconEntry[] = [];
  const entryPattern =
    /\{\s*"?name"?\s*:\s*"([^"]+)"\s*,\s*"?keywords"?\s*:\s*\[([^\]]*)\]\s*,\s*"?tags"?\s*:\s*\[([^\]]*)\]\s*\}/g;

  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(raw)) !== null) {
    entries.push({
      name: match[1],
      keywords: parseStringArray(match[2]),
      tags: parseStringArray(match[3]),
    });
  }
  return entries;
}

function parseStringArray(raw: string): string[] {
  const items: string[] = [];
  const strPattern = /"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = strPattern.exec(raw)) !== null) {
    items.push(m[1]);
  }
  return items;
}

export function serializeDcconList(entries: DcconEntry[]): string {
  const lines = entries.map((e) => {
    const kw = e.keywords.map((k) => `"${k}"`).join(",");
    const tg = e.tags.map((t) => `"${t}"`).join(",");
    return `\t{name:"${e.name}",\tkeywords:[${kw}],\t\t\ttags:[${tg}]}`;
  });
  return `dcConsData = [\n\n${lines.join(",\n")},\n\n];`;
}
