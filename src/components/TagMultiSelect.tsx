import { useMemo, useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

interface Props {
  allTags: string[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function TagMultiSelect({ allTags, selected, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return allTags;
    const q = search.toLowerCase();
    return allTags.filter((t) => t.toLowerCase().includes(q));
  }, [allTags, search]);

  function toggle(tag: string) {
    const next = new Set(selected);
    if (next.has(tag)) next.delete(tag); else next.add(tag);
    onChange(next);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 px-3 text-xs rounded-md border border-input bg-background text-foreground hover:bg-accent transition-colors flex items-center gap-1"
      >
        태그 지정
        {selected.size > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{selected.size}</Badge>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-56 rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2 border-b border-border">
            <Input
              placeholder="태그 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">태그 없음</p>
            ) : (
              filtered.map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs"
                  onClick={(e) => { e.preventDefault(); toggle(tag); }}
                >
                  <Checkbox checked={selected.has(tag)} onCheckedChange={() => toggle(tag)} />
                  <span>{tag}</span>
                </label>
              ))
            )}
          </div>
          {selected.size > 0 && (
            <div className="border-t border-border p-2 flex justify-between items-center">
              <div className="flex flex-wrap gap-1">
                {Array.from(selected).map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                ))}
              </div>
              <button
                onClick={() => onChange(new Set())}
                className="text-[10px] text-muted-foreground hover:text-foreground ml-2 shrink-0"
              >
                전체해제
              </button>
            </div>
          )}
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
