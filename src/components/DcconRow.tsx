import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DcconEntry, RepoInfo } from "../types";
import { imageUrl } from "../utils/github";
import { TagChips } from "./TagChips";

interface Props {
  id: string;
  entry: DcconEntry;
  repo: RepoInfo;
  branch: string;
  isMissingFile: boolean;
  onChange: (entry: DcconEntry) => void;
  onDelete: () => void;
  sortDisabled: boolean;
}

export function DcconRow({
  id,
  entry,
  repo,
  branch,
  isMissingFile,
  onChange,
  onDelete,
  sortDisabled,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: sortDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`table-row ${isMissingFile ? "row-missing" : ""}`}
    >
      <div className="col-handle" {...attributes} {...listeners}>
        {sortDisabled ? "" : "⠿"}
      </div>
      <div className="col-thumb">
        {isMissingFile ? (
          <div className="thumb-missing">?</div>
        ) : (
          <img
            src={imageUrl(repo, entry.name, branch)}
            alt={entry.name}
            loading="lazy"
          />
        )}
      </div>
      <div className="col-name" title={entry.name}>
        {entry.name}
        {isMissingFile && <span className="badge-missing">파일 없음</span>}
      </div>
      <div className="col-keywords">
        <TagChips
          values={entry.keywords}
          onChange={(keywords) => onChange({ ...entry, keywords })}
          placeholder="키워드 추가"
        />
      </div>
      <div className="col-tags">
        <TagChips
          values={entry.tags}
          onChange={(tags) => onChange({ ...entry, tags })}
          placeholder="태그 추가"
        />
      </div>
      <div className="col-actions">
        <button className="btn-delete" onClick={onDelete} title="삭제">
          &times;
        </button>
      </div>
    </div>
  );
}
