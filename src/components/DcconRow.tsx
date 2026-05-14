import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DcconEntry, RepoInfo } from "../types";
import { imageUrl } from "../utils/github";
import { TagChips } from "./TagChips";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";

interface Props {
  id: string;
  entry: DcconEntry;
  repo: RepoInfo;
  compact: boolean;
  isMissingFile: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onChange: (entry: DcconEntry) => void;
  onDelete: () => void;
  sortDisabled: boolean;
}

export function DcconRow({
  id,
  entry,
  repo,
  compact,
  isMissingFile,
  isSelected,
  onToggleSelect,
  onChange,
  onDelete,
  sortDisabled,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id, disabled: sortDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : "none",
    opacity: isDragging ? 0.5 : 1,
  };

  const thumbSize = compact ? 40 : 80;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onToggleSelect}
      className={`
        group grid items-center gap-0 border-b border-border cursor-pointer transition-colors
        ${compact
          ? "grid-cols-[36px_28px_52px_140px_1fr_1fr_32px]"
          : "grid-cols-[36px_28px_92px_160px_1fr_1fr_32px]"}
        ${isMissingFile ? "bg-destructive/5" : ""}
        ${isSelected ? "bg-primary/5" : ""}
        hover:bg-accent/50
      `}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center h-full">
        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect()} />
      </div>

      {/* Drag handle */}
      <div
        className="flex items-center justify-center h-full text-muted-foreground text-xs cursor-grab select-none"
        {...attributes}
        {...listeners}
      >
        {sortDisabled ? "" : "⠿"}
      </div>

      {/* Thumbnail */}
      <div className="flex items-center justify-center py-1">
        {isMissingFile || imgError ? (
          <div
            className="flex items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 bg-muted/50 text-muted-foreground text-[10px] text-center p-1 leading-tight"
            style={{ width: thumbSize, height: thumbSize }}
          >
            {entry.name.replace(/\.\w+$/, "")}
          </div>
        ) : (
          <img
            src={imageUrl(repo, entry.name)}
            alt={entry.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="rounded object-contain bg-white/5"
            style={{ width: thumbSize, height: thumbSize }}
          />
        )}
      </div>

      {/* Filename */}
      <div className="px-2 py-1 text-xs truncate border-r border-border" title={entry.name}>
        <span className="text-foreground">{entry.name}</span>
        {isMissingFile && <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">파일 없음</Badge>}
      </div>

      {/* Keywords */}
      <div className="px-2 py-1 border-r border-border" onClick={(e) => e.stopPropagation()}>
        <TagChips
          values={entry.keywords}
          onChange={(keywords) => onChange({ ...entry, keywords })}
          placeholder="키워드"
          variant="outline"
        />
      </div>

      {/* Tags */}
      <div className="px-2 py-1 border-r border-border" onClick={(e) => e.stopPropagation()}>
        <TagChips
          values={entry.tags}
          onChange={(tags) => onChange({ ...entry, tags })}
          placeholder="태그"
          variant="secondary"
        />
      </div>

      {/* Delete */}
      <div className="flex items-center justify-center">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all text-lg"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
