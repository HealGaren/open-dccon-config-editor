import type { DcconEntry, RepoInfo } from "../types";
import { imageUrl } from "../utils/github";
import { TagChips } from "./TagChips";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState } from "react";

interface SingleProps {
  entry: DcconEntry;
  repo: RepoInfo;
  onChange: (entry: DcconEntry) => void;
  onDelete: () => void;
}

export function SingleDetail({ entry, repo, onChange, onDelete }: SingleProps) {
  return (
    <div className="flex items-start gap-5">
      <img
        src={imageUrl(repo, entry.name)}
        alt=""
        className="w-40 h-40 object-contain rounded-lg bg-white/5 shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-foreground">{entry.name}</span>
          <button onClick={onDelete} className="text-xs text-muted-foreground hover:text-destructive ml-auto">삭제</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0 w-12">키워드</span>
          <TagChips values={entry.keywords} onChange={(keywords) => onChange({ ...entry, keywords })} placeholder="키워드" variant="outline" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0 w-12">태그</span>
          <TagChips values={entry.tags} onChange={(tags) => onChange({ ...entry, tags })} placeholder="태그" variant="secondary" />
        </div>
      </div>
    </div>
  );
}

interface BatchProps {
  count: number;
  entries: DcconEntry[];
  selectedIndices: Set<number>;
  allEntries: DcconEntry[];
  onChange: (entries: DcconEntry[]) => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function BatchDetail({ count, entries: _entries, selectedIndices, allEntries, onChange, onDelete, onClearSelection }: BatchProps) {
  const [batchTag, setBatchTag] = useState("");

  const tagCounts = new Map<string, number>();
  for (const i of selectedIndices) {
    if (i < allEntries.length) {
      for (const t of allEntries[i].tags) {
        tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
      }
    }
  }
  const tags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);

  function addTag() {
    const tag = batchTag.trim();
    if (!tag) return;
    onChange(allEntries.map((e, i) => {
      if (!selectedIndices.has(i) || e.tags.includes(tag)) return e;
      return { ...e, tags: [...e.tags, tag] };
    }));
    setBatchTag("");
  }

  function removeTag(tag: string) {
    if (!confirm(`선택된 ${count}개 항목에서 "${tag}" 태그를 제거할까요?`)) return;
    onChange(allEntries.map((e, i) => {
      if (!selectedIndices.has(i)) return e;
      return { ...e, tags: e.tags.filter((t) => t !== tag) };
    }));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-primary shrink-0">{count}개 선택</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={onClearSelection}>해제</Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => { if (confirm(`선택된 ${count}개 항목을 삭제할까요?`)) onDelete(); }}
        >
          삭제
        </Button>
        <div className="w-px h-5 bg-border shrink-0" />
        <Input
          placeholder="태그 추가 (Enter)"
          value={batchTag}
          onChange={(e) => setBatchTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          className="h-7 w-40 text-xs"
        />
        <Button size="sm" className="h-7 text-xs" onClick={addTag} disabled={!batchTag.trim()}>추가</Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {tags.map(([tag, c]) => (
            <Badge key={tag} variant="secondary" className="gap-1 text-xs font-normal cursor-pointer hover:bg-destructive/20" onClick={() => removeTag(tag)}>
              {tag} ({c}/{count}) <span className="text-muted-foreground hover:text-destructive">&times;</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
