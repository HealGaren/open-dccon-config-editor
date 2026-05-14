import type { DcconEntry } from "../types";
import { serializeDcconList } from "../utils/dcconParser";
import { Button } from "./ui/button";

interface Props {
  entries: DcconEntry[];
}

export function ExportPanel({ entries }: Props) {
  const serialized = serializeDcconList(entries);

  function download() {
    const blob = new Blob([serialized], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dccon_list.js";
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(serialized);
  }

  return (
    <div className="flex gap-1">
      <Button variant="outline" size="sm" onClick={download}>다운로드</Button>
      <Button variant="ghost" size="sm" onClick={copyToClipboard}>복사</Button>
    </div>
  );
}
