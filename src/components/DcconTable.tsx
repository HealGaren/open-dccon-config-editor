import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { DcconEntry, RepoInfo } from "../types";
import { DcconRow } from "./DcconRow";
import { imageUrl } from "../utils/github";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";

type FilterMode = "all" | "unmapped" | "missing";

interface Props {
  entries: DcconEntry[];
  imageFiles: string[];
  repo: RepoInfo;
  branch: string;
  onChange: (entries: DcconEntry[]) => void;
}

const ROW_HEIGHT_NORMAL = 96;
const ROW_HEIGHT_COMPACT = 52;

export function DcconTable({ entries, imageFiles, repo, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastToggled, setLastToggled] = useState<number | null>(null);
  const [batchTag, setBatchTag] = useState("");
  const [compact, setCompact] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rowHeight = compact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_NORMAL;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const mappedNames = useMemo(() => new Set(entries.map((e) => e.name)), [entries]);
  const fileSet = useMemo(() => new Set(imageFiles), [imageFiles]);
  const unmappedFiles = useMemo(() => imageFiles.filter((f) => !mappedNames.has(f)), [imageFiles, mappedNames]);
  const missingFiles = useMemo(() => entries.filter((e) => !fileSet.has(e.name)), [entries, fileSet]);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries.map((e, i) => ({ entry: e, originalIndex: i }));
    if (filterMode === "unmapped") return [];
    if (filterMode === "missing") result = result.filter(({ entry }) => !fileSet.has(entry.name));
    if (selectedTag) result = result.filter(({ entry }) => entry.tags.includes(selectedTag));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(({ entry }) =>
        entry.name.toLowerCase().includes(q) ||
        entry.keywords.some((k) => k.toLowerCase().includes(q)) ||
        entry.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, search, filterMode, selectedTag, fileSet]);

  const virtualizer = useVirtualizer({
    count: filteredEntries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const previewEntry = lastToggled !== null && lastToggled < entries.length && selected.has(lastToggled)
    ? entries[lastToggled]
    : null;

  function updateEntry(index: number, updated: DcconEntry) {
    const next = [...entries];
    next[index] = updated;
    onChange(next);
  }

  function deleteEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
    setSelected((prev) => { const s = new Set(prev); s.delete(index); return s; });
    if (lastToggled === index) setLastToggled(null);
  }

  function addUnmapped(filename: string) {
    onChange([...entries, { name: filename, keywords: [filename.replace(/\.\w+$/, "")], tags: [] }]);
  }

  function addAllUnmapped() {
    onChange([...entries, ...unmappedFiles.map((f) => ({ name: f, keywords: [f.replace(/\.\w+$/, "")], tags: [] }))]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = entries.findIndex((_, i) => `row-${i}` === active.id);
    const newIndex = entries.findIndex((_, i) => `row-${i}` === over.id);
    if (oldIndex !== -1 && newIndex !== -1) onChange(arrayMove(entries, oldIndex, newIndex));
  }

  const toggleSelect = useCallback((index: number) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(index)) s.delete(index); else s.add(index);
      return s;
    });
    setLastToggled(index);
  }, []);

  const allFilteredSelected = filteredEntries.length > 0 && filteredEntries.every(({ originalIndex }) => selected.has(originalIndex));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected(new Set());
      setLastToggled(null);
    } else {
      const all = filteredEntries.map(({ originalIndex }) => originalIndex);
      setSelected(new Set(all));
      if (all.length > 0) setLastToggled(all[0]);
    }
  }

  function addBatchTag() {
    const tag = batchTag.trim();
    if (!tag || selected.size === 0) return;
    onChange(entries.map((e, i) => {
      if (!selected.has(i) || e.tags.includes(tag)) return e;
      return { ...e, tags: [...e.tags, tag] };
    }));
    setBatchTag("");
  }

  function removeBatchTag(tag: string) {
    if (selected.size === 0) return;
    if (!confirm(`선택된 ${selected.size}개 항목에서 "${tag}" 태그를 제거할까요?`)) return;
    onChange(entries.map((e, i) => {
      if (!selected.has(i)) return e;
      return { ...e, tags: e.tags.filter((t) => t !== tag) };
    }));
  }

  const selectedTags = useMemo(() => {
    if (selected.size === 0) return [];
    const m = new Map<string, number>();
    for (const i of selected) if (i < entries.length) for (const t of entries[i].tags) m.set(t, (m.get(t) || 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  }, [selected, entries]);

  const isFiltering = search || filterMode !== "all" || selectedTag;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-2 border-b border-border flex-wrap">
        <Input
          placeholder="검색 (파일명, 키워드, 태그)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] h-8"
        />
        <select
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="">모든 태그</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <div className="flex rounded-md border border-border overflow-hidden">
          {([["all", `전체 ${entries.length}`], ["unmapped", `매핑없음 ${unmappedFiles.length}`], ["missing", `파일없음 ${missingFiles.length}`]] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1 text-xs transition-colors ${filterMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"} ${mode !== "all" && ((mode === "unmapped" && unmappedFiles.length > 0) || (mode === "missing" && missingFiles.length > 0)) ? "text-amber-400" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        <Button
          variant={compact ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setCompact(!compact)}
        >
          {compact ? "기본" : "컴팩트"}
        </Button>
      </div>

      {/* Preview - always visible */}
      <div className="shrink-0 flex items-center gap-4 px-6 py-3 bg-card border-b border-border min-h-[136px]">
        {previewEntry ? (
          <>
            <img
              src={imageUrl(repo, previewEntry.name)}
              alt=""
              className="w-28 h-28 object-contain rounded-lg bg-white/5 shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <span className="text-sm font-semibold text-foreground">{previewEntry.name}</span>
              <div className="flex flex-wrap gap-1">
                {previewEntry.keywords.map((k, i) => <Badge key={i} variant="outline" className="text-xs font-normal">{k}</Badge>)}
              </div>
              <div className="flex flex-wrap gap-1">
                {previewEntry.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-xs font-normal">{t}</Badge>)}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center w-full text-sm text-muted-foreground">
            항목을 선택하면 상세 정보가 표시됩니다
          </div>
        )}
      </div>

      {/* Batch bar */}
      {filterMode !== "unmapped" && (
        <div className={`shrink-0 flex items-center gap-2 px-6 py-1.5 border-b border-border flex-wrap ${selected.size > 0 ? "bg-primary/5" : "bg-muted/30"}`}>
          <span className={`text-xs ${selected.size > 0 ? "font-semibold text-primary" : "text-muted-foreground"}`}>
            {selected.size > 0 ? `${selected.size}개 선택` : "항목을 선택하세요"}
          </span>
          <Input
            placeholder="태그 입력 후 Enter"
            value={batchTag}
            onChange={(e) => setBatchTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBatchTag(); } }}
            disabled={selected.size === 0}
            className="h-7 w-40 text-xs"
          />
          <Button size="sm" className="h-7 text-xs" onClick={addBatchTag} disabled={!batchTag.trim() || selected.size === 0}>추가</Button>
          {selectedTags.map(({ tag, count }) => (
            <Badge key={tag} variant="secondary" className="gap-1 text-xs font-normal cursor-default">
              {tag} ({count})
              <button onClick={() => removeBatchTag(tag)} className="hover:text-destructive">&times;</button>
            </Badge>
          ))}
          {selected.size > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => { setSelected(new Set()); setLastToggled(null); }}>해제</Button>
          )}
        </div>
      )}

      {/* Content */}
      {filterMode === "unmapped" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-amber-400">매핑 없는 이미지 ({unmappedFiles.length}개)</h3>
            {unmappedFiles.length > 0 && <Button size="sm" variant="outline" onClick={addAllUnmapped}>전체 추가</Button>}
          </div>
          {unmappedFiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">모든 이미지가 매핑되어 있습니다.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
              {unmappedFiles.map((f) => (
                <div
                  key={f}
                  className="flex flex-col items-center p-2 rounded-lg border border-dashed border-amber-400/40 bg-card cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => addUnmapped(f)}
                >
                  <img src={imageUrl(repo, f)} alt={f} loading="lazy" className="w-14 h-14 object-contain" />
                  <span className="text-[10px] text-muted-foreground mt-1 text-center break-all">{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className={`
            shrink-0 grid items-center gap-0 px-0 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 border-b border-border
            ${compact
              ? "grid-cols-[36px_28px_52px_140px_1fr_1fr_32px]"
              : "grid-cols-[36px_28px_92px_160px_1fr_1fr_32px]"}
          `}>
            <div className="flex items-center justify-center py-2" onClick={toggleSelectAll}>
              <Checkbox checked={allFilteredSelected} onCheckedChange={() => toggleSelectAll()} />
            </div>
            <div className="py-2"></div>
            <div className="py-2 px-2">이미지</div>
            <div className="py-2 px-2">파일명</div>
            <div className="py-2 px-2">키워드</div>
            <div className="py-2 px-2">태그</div>
            <div className="py-2"></div>
          </div>

          {/* Virtualized rows */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={filteredEntries.map(({ originalIndex }) => `row-${originalIndex}`)}
              strategy={verticalListSortingStrategy}
              disabled={!!isFiltering}
            >
              <div className="flex-1 overflow-y-auto min-h-0" ref={scrollRef}>
                <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const { entry, originalIndex } = filteredEntries[virtualRow.index];
                    return (
                      <div
                        key={`row-${originalIndex}`}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <DcconRow
                          id={`row-${originalIndex}`}
                          entry={entry}
                          repo={repo}
                          compact={compact}
                          isMissingFile={!fileSet.has(entry.name)}
                          isSelected={selected.has(originalIndex)}
                          onToggleSelect={() => toggleSelect(originalIndex)}
                          onChange={(updated) => updateEntry(originalIndex, updated)}
                          onDelete={() => deleteEntry(originalIndex)}
                          sortDisabled={!!isFiltering}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </SortableContext>
          </DndContext>
          {filteredEntries.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {search || selectedTag ? "검색 결과가 없습니다." : "항목이 없습니다."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
