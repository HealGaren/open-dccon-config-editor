import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { DcconEntry, RepoInfo } from "../types";
import { GridCard } from "./GridCard";
import { SingleDetail, BatchDetail } from "./DetailPanel";
import { TagMultiSelect } from "./TagMultiSelect";
import { imageUrl } from "../utils/github";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

type FilterMode = "all" | "unmapped" | "missing" | "issues";
type SelectMode = "single" | "multi";

interface Props {
  entries: DcconEntry[];
  imageFiles: string[];
  repo: RepoInfo;
  onChange: (entries: DcconEntry[]) => void;
  onSwitchToList: () => void;
}

export function DcconGrid({ entries, imageFiles, repo, onChange, onSwitchToList }: Props) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterTag, setFilterTag] = useState("");
  const [selectMode, setSelectMode] = useState<SelectMode>("single");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [unmappedTags, setUnmappedTags] = useState<Set<string>>(new Set());
  const lastClickIndex = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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

  const filteredEntries = useMemo(() => {
    let result = entries.map((e, i) => ({ entry: e, idx: i }));
    if (filterMode === "missing") result = result.filter(({ entry }) => !fileSet.has(entry.name));
    if (filterMode === "issues") result = result.filter(({ idx }) => keywordIssues.has(idx));
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
  }, [entries, search, filterMode, filterTag, fileSet, keywordIssues]);

  const ids = useMemo(() => filteredEntries.map(({ idx }) => `g-${idx}`), [filteredEntries]);

  const handleClick = useCallback((index: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickIndex.current !== null) {
      const from = Math.min(lastClickIndex.current, index);
      const to = Math.max(lastClickIndex.current, index);
      setSelected((prev) => {
        const s = new Set(prev);
        for (let i = from; i <= to; i++) s.add(i);
        return s;
      });
    } else if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => {
        const s = new Set(prev);
        if (s.has(index)) s.delete(index); else s.add(index);
        return s;
      });
    } else if (selectMode === "multi") {
      setSelected((prev) => {
        const s = new Set(prev);
        if (s.has(index)) s.delete(index); else s.add(index);
        return s;
      });
    } else {
      setSelected((prev) => {
        if (prev.size === 1 && prev.has(index)) return new Set();
        return new Set([index]);
      });
    }
    lastClickIndex.current = index;
  }, [selectMode]);

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const fe = filteredEntries.find(({ idx }) => `g-${idx}` === id);
    if (!fe) return;
    setDraggingIndex(fe.idx);
    if (!selected.has(fe.idx)) setSelected(new Set([fe.idx]));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingIndex(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromFe = filteredEntries.find(({ idx }) => `g-${idx}` === String(active.id));
    const toFe = filteredEntries.find(({ idx }) => `g-${idx}` === String(over.id));
    if (!fromFe || !toFe) return;

    if (selected.size <= 1) {
      onChange(arrayMove(entries, fromFe.idx, toFe.idx));
      setSelected(new Set([toFe.idx > fromFe.idx ? toFe.idx : toFe.idx]));
      return;
    }

    const selArr = Array.from(selected).sort((a, b) => a - b);
    const moved = selArr.map((i) => entries[i]);
    const remaining = entries.filter((_, i) => !selected.has(i));
    const overOrigIdx = toFe.idx;
    let insertAt = 0;
    let count = 0;
    for (let j = 0; j < entries.length; j++) {
      if (!selected.has(j)) {
        if (j >= overOrigIdx) { insertAt = count; break; }
        count++;
        insertAt = count;
      }
    }
    const result = [...remaining.slice(0, insertAt), ...moved, ...remaining.slice(insertAt)];
    onChange(result);
    const newSel = new Set<number>();
    for (let i = insertAt; i < insertAt + moved.length; i++) newSel.add(i);
    setSelected(newSel);
  }

  function updateEntry(index: number, updated: DcconEntry) {
    const next = [...entries];
    next[index] = updated;
    onChange(next);
  }

  function deleteEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
    setSelected((prev) => { const s = new Set(prev); s.delete(index); return s; });
  }

  function addUnmappedBatch(files: string[]) {
    const tags = Array.from(unmappedTags);
    onChange([...entries, ...files.map((f) => ({ name: f, keywords: [f.replace(/\.\w+$/, "")], tags: [...tags] }))]);
  }

  // unmapped selection
  const [unmappedSelected, setUnmappedSelected] = useState<Set<string>>(new Set());
  function toggleUnmapped(f: string, e: React.MouseEvent) {
    if (e.ctrlKey || e.metaKey || selectMode === "multi") {
      setUnmappedSelected((prev) => { const s = new Set(prev); if (s.has(f)) s.delete(f); else s.add(f); return s; });
    } else {
      setUnmappedSelected((prev) => prev.size === 1 && prev.has(f) ? new Set() : new Set([f]));
    }
  }

  const draggingEntry = draggingIndex !== null ? entries[draggingIndex] : null;
  const singleSelected = selected.size === 1 ? entries[Array.from(selected)[0]] : null;
  const singleSelectedIdx = selected.size === 1 ? Array.from(selected)[0] : null;
  const isFiltering = !!search || !!filterTag || filterMode === "missing";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-2 border-b border-border flex-wrap">
        {/* Left: tabs, modes, view switch */}
        <div className="flex rounded-md border border-border overflow-hidden">
          {([["all", `전체 ${entries.length}`], ["unmapped", `매핑없음 ${unmappedFiles.length}`], ["missing", `파일없음 ${missingFiles.length}`]] as const).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => { setFilterMode(mode); setSelected(new Set()); setUnmappedSelected(new Set()); }}
              className={`px-3 py-1 text-xs transition-colors ${filterMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"} ${mode !== "all" && ((mode === "unmapped" && unmappedFiles.length > 0) || (mode === "missing" && missingFiles.length > 0)) ? "text-amber-400" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0">
          <span className="text-[11px] text-muted-foreground mr-1">클릭</span>
          <div className="flex rounded-md border border-border overflow-hidden">
            <button onClick={() => setSelectMode("single")} className={`px-3 py-1 text-xs ${selectMode === "single" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>단일</button>
            <button onClick={() => setSelectMode("multi")} className={`px-3 py-1 text-xs ${selectMode === "multi" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>다중</button>
          </div>
        </div>

        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onSwitchToList}>리스트뷰</Button>

        {keywordIssues.size > 0 && (
          <Badge
            variant={filterMode === "issues" ? "default" : "destructive"}
            className="text-xs cursor-pointer"
            onClick={() => setFilterMode(filterMode === "issues" ? "all" : "issues")}
            title={Array.from(new Set(Array.from(keywordIssues.values()).flat())).join(", ")}
          >
            {filterMode === "issues" ? "전체 보기" : `키워드 문제 ${keywordIssues.size}건`}
          </Badge>
        )}

        {/* Right: search, tag filter */}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">모든 태그</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input
            placeholder="검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-8"
          />
        </div>
      </div>

      {/* Grid area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4">
        {filterMode === "unmapped" ? (
          <>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {unmappedSelected.size > 0 ? `${unmappedSelected.size}개 선택` : `${unmappedFiles.length}개`}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <TagMultiSelect allTags={allTags} selected={unmappedTags} onChange={setUnmappedTags} />
                <Button
                  size="sm" variant="outline"
                  onClick={() => { addUnmappedBatch(unmappedSelected.size > 0 ? Array.from(unmappedSelected) : unmappedFiles); setUnmappedSelected(new Set()); }}
                  disabled={unmappedFiles.length === 0}
                >
                  {unmappedSelected.size > 0 ? `선택 추가` : "전체 추가"}
                </Button>
              </div>
            </div>
            {unmappedFiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">모든 이미지가 매핑되어 있습니다.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
                {unmappedFiles.map((f) => (
                  <div
                    key={f}
                    className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer transition-colors relative
                      ${unmappedSelected.has(f) ? "border-primary bg-primary/10" : "border-dashed border-amber-400/40 bg-card hover:bg-accent/50"}`}
                    onClick={(e) => toggleUnmapped(f, e)}
                  >
                    {unmappedSelected.has(f) && <div className="absolute top-1 right-1"><Badge variant="default" className="text-[9px] px-1 py-0">✓</Badge></div>}
                    <img src={imageUrl(repo, f)} alt={f} loading="lazy" className="w-14 h-14 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <span className="text-[10px] text-muted-foreground mt-1 text-center break-all">{f}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={rectSortingStrategy} disabled={isFiltering}>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
                {filteredEntries.map(({ entry, idx }) => (
                  <GridCard
                    key={`g-${idx}`}
                    id={`g-${idx}`}
                    entry={entry}
                    repo={repo}
                    isSelected={selected.has(idx)}
                    hasWarning={keywordIssues.has(idx)}
                    warningTexts={keywordIssues.get(idx)}
                    hiddenByGroupDrag={draggingIndex !== null && selected.size > 1 && selected.has(idx) && idx !== draggingIndex}
                    onClick={(e) => handleClick(idx, e)}
                    onRenameKeyword={(v) => {
                      const kws = [...entry.keywords];
                      if (kws.length === 0) kws.push(v); else kws[0] = v;
                      updateEntry(idx, { ...entry, keywords: kws });
                    }}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {draggingEntry && (
                <GridCard
                  id="overlay"
                  entry={draggingEntry}
                  repo={repo}
                  isSelected={true}
                  hasWarning={false}
                  onClick={() => {}}
                  isDragOverlay
                  selectedCount={selected.size}
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Bottom detail panel */}
      {(selected.size > 0 || unmappedSelected.size === 1) && filterMode !== "unmapped" && (
        <div className="shrink-0 border-t border-border bg-card px-6 py-3">
          {selected.size === 1 && singleSelected && singleSelectedIdx !== null ? (
            <SingleDetail
              entry={singleSelected}
              repo={repo}
              onChange={(updated) => updateEntry(singleSelectedIdx, updated)}
              onDelete={() => deleteEntry(singleSelectedIdx)}
            />
          ) : selected.size > 1 ? (
            <BatchDetail
              count={selected.size}
              entries={Array.from(selected).map((i) => entries[i])}
              selectedIndices={selected}
              allEntries={entries}
              onChange={onChange}
              onDelete={() => { onChange(entries.filter((_, i) => !selected.has(i))); setSelected(new Set()); }}
              onClearSelection={() => setSelected(new Set())}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
