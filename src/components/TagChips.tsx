import { useState, useRef, type KeyboardEvent } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  variant?: "default" | "secondary" | "outline";
}

export function TagChips({ values, onChange, placeholder = "추가...", variant = "secondary" }: Props) {
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    else if (e.key === "Backspace" && !input && values.length > 0) remove(values.length - 1);
    else if (e.key === "Escape") { setInput(""); setEditing(false); inputRef.current?.blur(); }
  }

  function startEditing(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleBlur() {
    if (input.trim()) add();
    setEditing(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1 min-h-[28px] py-0.5">
      {values.map((v, i) => (
        <Badge key={i} variant={variant} className="gap-0.5 pr-1 text-xs font-normal cursor-default">
          {v}
          <button
            onClick={(e) => { e.stopPropagation(); remove(i); }}
            className="ml-0.5 hover:text-destructive transition-colors text-muted-foreground"
            tabIndex={-1}
          >
            &times;
          </button>
        </Badge>
      ))}
      {editing ? (
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
          className="h-6 w-20 text-xs px-1 border-none bg-transparent shadow-none focus-visible:ring-0"
        />
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 rounded-full text-muted-foreground hover:text-foreground"
          onClick={startEditing}
        >
          +
        </Button>
      )}
    </div>
  );
}
