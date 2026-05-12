import { useState, useRef, type KeyboardEvent } from "react";

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

export function TagChips({ values, onChange, placeholder = "추가..." }: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
    }
    setInput("");
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      remove(values.length - 1);
    }
  }

  return (
    <div className="tag-chips" onClick={() => inputRef.current?.focus()}>
      {values.map((v, i) => (
        <span key={i} className="chip">
          {v}
          <button onClick={() => remove(i)} tabIndex={-1}>&times;</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={() => { if (input.trim()) add(); }}
        placeholder={values.length === 0 ? placeholder : ""}
        size={Math.max(input.length + 1, 3)}
      />
    </div>
  );
}
