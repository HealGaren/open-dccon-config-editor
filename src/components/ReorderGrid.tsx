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
  useSortable,
} from "@dnd-kit/sortable";
import type { DcconEntry, RepoInfo } from "../types";
import { imageUrl } from "../utils/github";

interface Props {
  entries: DcconEntry[];
  repo: RepoInfo;
  onChange: (entries: DcconEntry[]) => void;
  onClose: () => void;
}

function GridItem({
  id,
  entry,
  repo,
  isSelected,
  onClick,
  isDragOverlay,
  selectedCount,
}: {
  id: string;
  entry: DcconEntry;
  repo: RepoInfo;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  isDragOverlay?: boolean;
  selectedCount?: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, animateLayoutChanges: () => false });

  const style = isDragOverlay
    ? {}
    : {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        opacity: isDragging ? 0.3 : 1,
      };

  const keyword = entry.keywords[0] || entry.name.replace(/\.\w+$/, "");

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      className={`
        flex flex-col items-center p-2 rounded-lg border cursor-grab select-none transition-colors relative
        ${isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/50"}
        ${isDragOverlay ? "shadow-xl ring-2 ring-primary" : ""}
      `}
      onClick={onClick}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
    >
      {isDragOverlay && selectedCount && selectedCount > 1 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
          {selectedCount}
        </div>
      )}
      <img
        src={imageUrl(repo, entry.name)}
        alt={entry.name}
        className="w-16 h-16 object-contain rounded"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className="text-[10px] text-muted-foreground mt-1 text-center truncate w-full">{keyword}</span>
    </div>
  );
}

export function ReorderGrid({ entries, repo, onChange, onClose }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const lastClickIndex = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const ids = useMemo(() => entries.map((_, i) => `grid-${i}`), [entries.length]);

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
    } else {
      setSelected((prev) => {
        if (prev.size === 1 && prev.has(index)) return new Set();
        return new Set([index]);
      });
    }
    lastClickIndex.current = index;
  }, []);

  function handleDragStart(event: DragStartEvent) {
    const idx = ids.indexOf(String(event.active.id));
    setDraggingIndex(idx);
    if (idx !== -1 && !selected.has(idx)) {
      setSelected(new Set([idx]));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingIndex(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(String(active.id));
    const overIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || overIndex === -1) return;

    if (selected.size <= 1) {
      onChange(arrayMove(entries, oldIndex, overIndex));
      setSelected(new Set([overIndex]));
      return;
    }

    const selectedIndices = Array.from(selected).sort((a, b) => a - b);
    const movedEntries = selectedIndices.map((i) => entries[i]);
    const remaining = entries.filter((_, i) => !selected.has(i));

    let insertAt = remaining.findIndex((_, i) => {
      let originalIdx = 0;
      let count = 0;
      for (let j = 0; j < entries.length; j++) {
        if (!selected.has(j)) {
          if (count === i) { originalIdx = j; break; }
          count++;
        }
      }
      return originalIdx >= overIndex;
    });
    if (insertAt === -1) insertAt = remaining.length;

    const result = [...remaining.slice(0, insertAt), ...movedEntries, ...remaining.slice(insertAt)];
    onChange(result);

    const newSelected = new Set<number>();
    for (let i = insertAt; i < insertAt + movedEntries.length; i++) newSelected.add(i);
    setSelected(newSelected);
  }

  const draggingEntry = draggingIndex !== null ? entries[draggingIndex] : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-border">
        <h3 className="text-sm font-semibold">순서 변경</h3>
        <span className="text-xs text-muted-foreground">
          드래그로 이동 · Ctrl+클릭 멀티선택 · Shift+클릭 범위선택
        </span>
        {selected.size > 0 && (
          <span className="text-xs text-primary font-medium">{selected.size}개 선택</span>
        )}
        <button
          onClick={() => setSelected(new Set())}
          className="text-xs text-muted-foreground hover:text-foreground ml-auto"
        >
          선택 해제
        </button>
        <button
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground px-2"
        >
          닫기
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
              {entries.map((entry, i) => (
                <GridItem
                  key={ids[i]}
                  id={ids[i]}
                  entry={entry}
                  repo={repo}
                  isSelected={selected.has(i)}
                  onClick={(e) => handleClick(i, e)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {draggingEntry && (
              <GridItem
                id="overlay"
                entry={draggingEntry}
                repo={repo}
                isSelected={true}
                onClick={() => {}}
                isDragOverlay
                selectedCount={selected.size}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
