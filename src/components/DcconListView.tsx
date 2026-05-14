import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { DcconEntry, RepoInfo } from "../types";
import { imageUrl } from "../utils/github";
import { TagChips } from "./TagChips";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface Props {
  entries: DcconEntry[];
  imageFiles: string[];
  repo: RepoInfo;
  onChange: (entries: DcconEntry[]) => void;
  onSwitchToGrid: () => void;
}

const ROW_NORMAL = 80;
const ROW_COMPACT = 48;
const COLS_NORMAL = "grid-cols-[40px_80px_160px_1fr_1fr]";
const COLS_COMPACT = "grid-cols-[40px_48px_140px_1fr_1fr]";

export function DcconListView({ entries, imageFiles, repo, onChange, onSwitchToGrid }: Props) {
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [compact, setCompact] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fileSet = useMemo(() => new Set(imageFiles), [imageFiles]);
  const rowHeight = compact ? ROW_COMPACT : ROW_NORMAL;
  const cols = compact ? COLS_COMPACT : COLS_NORMAL;
  const thumbSize = compact ? 36 : 64;

  const allTags = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [entries]);

  const keywordIssues = useMemo(() => {
    const issues = new Map<number, string[]>();
    const owners = new Map<string, number[]>();
    entries.forEach((e, i) => {
      if (e.keywords.length === 0) issues.set(i, [...(issues.get(i) || []), "키워드 없음"]);
      e.keywords.forEach((k) => { if (!owners.has(k)) owners.set(k, []); owners.get(k)!.push(i); });
    });
    owners.forEach((idxs, kw) => {
      if (idxs.length > 1) idxs.forEach((i) => { const m = issues.get(i) || []; m.push(`"${kw}" 중복`); issues.set(i, m); });
    });
    return issues;
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries.map((e, i) => ({ entry: e, idx: i }));
    if (filterTag) result = result.filter(({ entry }) => entry.tags.includes(filterTag));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(({ entry }) =>
        entry.name.toLowerCase().includes(q) ||
        entry.keywords.some((k) => k.toLowerCase().includes(q)) ||
        entry.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, search, filterTag]);

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 15,
  });

  function updateEntry(index: number, updated: DcconEntry) {
    const next = [...entries];
    next[index] = updated;
    onChange(next);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 flex items-center gap-2 px-6 py-2 border-b border-border flex-wrap">
        <Input
          placeholder="검색 (파일명, 키워드, 태그)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] h-8"
        />
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="">모든 태그</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length}개</span>
        <Button
          variant={compact ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setCompact(!compact)}
        >
          {compact ? "기본" : "컴팩트"}
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs ml-auto" onClick={onSwitchToGrid}>그리드뷰</Button>
      </div>

      {/* Header */}
      <div className={`shrink-0 grid ${cols} items-center gap-0 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border`}>
        <div className="py-2 px-2 text-center">#</div>
        <div className="py-2 px-2">이미지</div>
        <div className="py-2 px-2">파일명</div>
        <div className="py-2 px-2">키워드</div>
        <div className="py-2 px-2">태그</div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0" ref={scrollRef}>
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vr) => {
            const { entry, idx } = filtered[vr.index];
            const warnings = keywordIssues.get(idx);
            return (
              <div
                key={idx}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vr.start}px)` }}
                className={`grid ${cols} items-center gap-0 border-b border-border hover:bg-accent/30`}
              >
                <div className="flex items-center justify-center py-1 text-xs text-muted-foreground tabular-nums">
                  {idx + 1}
                </div>
                <div className="flex items-center justify-center py-1 px-1">
                  <img
                    src={imageUrl(repo, entry.name)}
                    alt=""
                    className="object-contain rounded bg-white/5"
                    style={{ width: thumbSize, height: thumbSize }}
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <div className="px-2 py-1 text-xs truncate border-r border-border" title={entry.name}>
                  {entry.name}
                  {!fileSet.has(entry.name) && <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">파일없음</Badge>}
                </div>
                <div className="px-2 py-1 border-r border-border">
                  <TagChips values={entry.keywords} onChange={(keywords) => updateEntry(idx, { ...entry, keywords })} placeholder="키워드" variant="outline" />
                  {warnings && warnings.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {warnings.map((w, i) => <span key={i} className="text-[10px] text-destructive">{w}</span>)}
                    </div>
                  )}
                </div>
                <div className="px-2 py-1">
                  <TagChips values={entry.tags} onChange={(tags) => updateEntry(idx, { ...entry, tags })} placeholder="태그" variant="secondary" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
