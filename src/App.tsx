import { useState } from "react";
import type { DcconEntry, RepoInfo } from "./types";
import { parseRepoUrl, fetchImageList, fetchDcconListJs } from "./utils/github";
import { parseDcconList } from "./utils/dcconParser";
import { RepoInput } from "./components/RepoInput";
import { DcconTable } from "./components/DcconTable";
import { ExportPanel } from "./components/ExportPanel";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [branch, setBranch] = useState("master");
  const [entries, setEntries] = useState<DcconEntry[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);

  async function handleLoad(url: string, token: string, branchName: string) {
    const parsed = parseRepoUrl(url);
    if (!parsed) {
      setError("올바른 GitHub 레포 URL을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [images, raw] = await Promise.all([
        fetchImageList(parsed, token || undefined, branchName),
        fetchDcconListJs(parsed, token || undefined, branchName),
      ]);
      const dccons = parseDcconList(raw);

      setRepo(parsed);
      setBranch(branchName);
      setImageFiles(images);
      setEntries(dccons);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>dccon manager</h1>
        <p className="subtitle">디시콘 매핑 편집기</p>
      </header>

      <RepoInput onLoad={handleLoad} loading={loading} />

      {error && <div className="error-banner">{error}</div>}

      {repo && entries.length > 0 && (
        <>
          <div className="summary">
            <span>{repo.owner}/{repo.repo}</span>
            <span>이미지 {imageFiles.length}개</span>
            <span>매핑 {entries.length}개</span>
          </div>
          <ExportPanel entries={entries} />
          <DcconTable
            entries={entries}
            imageFiles={imageFiles}
            repo={repo}
            branch={branch}
            onChange={setEntries}
          />
          <ExportPanel entries={entries} />
        </>
      )}
    </div>
  );
}
