import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import type { DcconEntry, RepoInfo } from "../types";
import { imageUrl } from "../utils/github";
import { Checkbox } from "./ui/checkbox";

interface Props {
  id: string;
  entry: DcconEntry;
  repo: RepoInfo;
  isSelected: boolean;
  hasWarning: boolean;
  onClick: (e: React.MouseEvent) => void;
  onRenameKeyword?: (value: string) => void;
  isDragOverlay?: boolean;
  selectedCount?: number;
}

export function GridCard({
  id,
  entry,
  repo,
  isSelected,
  hasWarning,
  onClick,
  onRenameKeyword,
  isDragOverlay,
  selectedCount,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, animateLayoutChanges: () => false });

  const [imgError, setImgError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const style = isDragOverlay
    ? {}
    : {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        opacity: isDragging ? 0.3 : 1,
      };

  const keyword = entry.keywords[0] || entry.name.replace(/\.\w+$/, "");

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditValue(keyword);
    setEditing(true);
  }

  function commitEdit() {
    const v = editValue.trim();
    if (v && v !== keyword && onRenameKeyword) onRenameKeyword(v);
    setEditing(false);
  }

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      className={`
        flex flex-col items-center p-2 rounded-lg border cursor-pointer select-none transition-colors relative
        ${isSelected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent/50"}
        ${hasWarning ? "ring-1 ring-destructive/50" : ""}
        ${isDragOverlay ? "shadow-xl ring-2 ring-primary" : ""}
      `}
      onClick={onClick}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
    >
      {isDragOverlay && selectedCount && selectedCount > 1 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center z-10">
          {selectedCount}
        </div>
      )}
      {isSelected && !isDragOverlay && (
        <div className="absolute top-1 right-1">
          <Checkbox checked={true} />
        </div>
      )}
      <div className="w-16 h-16 flex items-center justify-center">
        {imgError ? (
          <div className="w-14 h-14 flex items-center justify-center rounded border border-dashed border-muted-foreground/30 bg-muted/50 text-muted-foreground text-[9px] text-center p-1 leading-tight">
            {entry.name.replace(/\.\w+$/, "")}
          </div>
        ) : (
          <img
            src={imageUrl(repo, entry.name)}
            alt={entry.name}
            className="max-w-16 max-h-16 object-contain rounded"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] mt-1 text-center w-full bg-transparent border-b border-primary outline-none text-foreground"
        />
      ) : (
        <span
          className="text-[10px] text-muted-foreground mt-1 text-center truncate w-full hover:text-foreground"
          onClick={startEdit}
          title="클릭하여 대표 키워드 편집"
        >
          {keyword}
        </span>
      )}
    </div>
  );
}
