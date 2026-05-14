import { useState } from "react";
import type { DcconEntry } from "../types";
import { serializeDcconList } from "../utils/dcconParser";
import { Button } from "./ui/button";

interface Props {
  entries: DcconEntry[];
}

export function ExportPanel({ entries }: Props) {
  const serialized = serializeDcconList(entries);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  function download() {
    const blob = new Blob([serialized], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dccon_list.js";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(serialized);
      setCopyMsg("복사됨");
    } catch {
      setCopyMsg("권한을 허용해주세요");
    }
    setTimeout(() => setCopyMsg(null), 2000);
  }

  return (
    <div className="flex items-center gap-1 relative">
      <Button variant="outline" size="sm" onClick={download}>다운로드</Button>
      <Button variant="ghost" size="sm" onClick={copyToClipboard}>복사</Button>
      {copyMsg && (
        <span className="absolute -bottom-6 right-0 text-[11px] px-2 py-0.5 rounded bg-popover border border-border text-foreground shadow whitespace-nowrap z-50">
          {copyMsg}
        </span>
      )}
    </div>
  );
}
