import type { DcconEntry } from "../types";
import { serializeDcconList } from "../utils/dcconParser";

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
    <div className="export-panel">
      <button onClick={download}>dccon_list.js 다운로드</button>
      <button onClick={copyToClipboard}>클립보드 복사</button>
    </div>
  );
}
