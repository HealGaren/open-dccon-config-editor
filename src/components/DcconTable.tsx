import { useMemo, useState } from "react";
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
import type { DcconEntry, RepoInfo } from "../types";
import { DcconRow } from "./DcconRow";
import { imageUrl } from "../utils/github";

type FilterMode = "all" | "unmapped" | "missing";

interface Props {
  entries: DcconEntry[];
  imageFiles: string[];
  repo: RepoInfo;
  branch: string;
  onChange: (entries: DcconEntry[]) => void;
}

export function DcconTable({ entries, imageFiles, repo, branch, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedTag, setSelectedTag] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const mappedNames = useMemo(() => new Set(entries.map((e) => e.name)), [entries]);
  const fileSet = useMemo(() => new Set(imageFiles), [imageFiles]);

  const unmappedFiles = useMemo(
    () => imageFiles.filter((f) => !mappedNames.has(f)),
    [imageFiles, mappedNames]
  );
  const missingFiles = useMemo(
    () => entries.filter((e) => !fileSet.has(e.name)),
    [entries, fileSet]
  );

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries.map((e, i) => ({ entry: e, originalIndex: i }));
    if (filterMode === "unmapped") return [];
    if (filterMode === "missing") {
      result = result.filter(({ entry }) => !fileSet.has(entry.name));
    }
    if (selectedTag) {
      result = result.filter(({ entry }) => entry.tags.includes(selectedTag));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        ({ entry }) =>
          entry.name.toLowerCase().includes(q) ||
          entry.keywords.some((k) => k.toLowerCase().includes(q)) ||
          entry.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, search, filterMode, selectedTag, fileSet]);

  function updateEntry(index: number, updated: DcconEntry) {
    const next = [...entries];
    next[index] = updated;
    onChange(next);
  }

  function deleteEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  function addUnmapped(filename: string) {
    const base = filename.replace(/\.\w+$/, "");
    onChange([...entries, { name: filename, keywords: [base], tags: [] }]);
  }

  function addAllUnmapped() {
    const newEntries = unmappedFiles.map((f) => ({
      name: f,
      keywords: [f.replace(/\.\w+$/, "")],
      tags: [],
    }));
    onChange([...entries, ...newEntries]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = entries.findIndex((_, i) => `row-${i}` === active.id);
    const newIndex = entries.findIndex((_, i) => `row-${i}` === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onChange(arrayMove(entries, oldIndex, newIndex));
    }
  }

  const isFiltering = search || filterMode !== "all" || selectedTag;

  return (
    <div className="dccon-table-wrapper">
      <div className="toolbar">
        <input
          type="text"
          className="search-input"
          placeholder="검색 (파일명, 키워드, 태그)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
          <option value="">모든 태그</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="filter-buttons">
          <button
            className={filterMode === "all" ? "active" : ""}
            onClick={() => setFilterMode("all")}
          >
            전체 ({entries.length})
          </button>
          <button
            className={`${filterMode === "unmapped" ? "active" : ""} ${unmappedFiles.length > 0 ? "has-issues" : ""}`}
            onClick={() => setFilterMode("unmapped")}
          >
            매핑 없음 ({unmappedFiles.length})
          </button>
          <button
            className={`${filterMode === "missing" ? "active" : ""} ${missingFiles.length > 0 ? "has-issues" : ""}`}
            onClick={() => setFilterMode("missing")}
          >
            파일 없음 ({missingFiles.length})
          </button>
        </div>
      </div>

      {filterMode === "unmapped" ? (
        <div className="unmapped-section">
          <div className="unmapped-header">
            <h3>이미지 폴더에 있지만 dccon_list.js에 없는 파일 ({unmappedFiles.length}개)</h3>
            {unmappedFiles.length > 0 && (
              <button className="btn-add-all" onClick={addAllUnmapped}>
                전체 추가
              </button>
            )}
          </div>
          {unmappedFiles.length === 0 ? (
            <p className="empty-message">모든 이미지가 매핑되어 있습니다.</p>
          ) : (
            <div className="unmapped-grid">
              {unmappedFiles.map((f) => (
                <div key={f} className="unmapped-card" onClick={() => addUnmapped(f)}>
                  <img
                    src={imageUrl(repo, f, branch)}
                    alt={f}
                    loading="lazy"
                  />
                  <span className="unmapped-name">{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="table-header">
            <div className="col-handle"></div>
            <div className="col-thumb">이미지</div>
            <div className="col-name">파일명</div>
            <div className="col-keywords">키워드</div>
            <div className="col-tags">태그</div>
            <div className="col-actions"></div>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredEntries.map(({ originalIndex }) => `row-${originalIndex}`)}
              strategy={verticalListSortingStrategy}
              disabled={!!isFiltering}
            >
              <div className="table-body">
                {filteredEntries.map(({ entry, originalIndex }) => (
                  <DcconRow
                    key={`row-${originalIndex}`}
                    id={`row-${originalIndex}`}
                    entry={entry}
                    repo={repo}
                    branch={branch}
                    isMissingFile={!fileSet.has(entry.name)}
                    onChange={(updated) => updateEntry(originalIndex, updated)}
                    onDelete={() => deleteEntry(originalIndex)}
                    sortDisabled={!!isFiltering}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {filteredEntries.length === 0 && (
            <p className="empty-message">
              {search || selectedTag ? "검색 결과가 없습니다." : "항목이 없습니다."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
