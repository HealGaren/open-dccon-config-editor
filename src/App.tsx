import { useCallback, useEffect, useRef, useState } from "react";
import type { DcconEntry, RepoInfo } from "./types";
import { parseRepoUrl, fetchImageList, fetchDcconListJs } from "./utils/github";
import { parseDcconList } from "./utils/dcconParser";
import { RepoInput } from "./components/RepoInput";
import { DcconGrid } from "./components/DcconGrid";
import { DcconListView } from "./components/DcconListView";
import { ExportPanel } from "./components/ExportPanel";
import { Badge } from "./components/ui/badge";

const STORAGE_KEY = "dccon-manager-last";

function getInitialUrl(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  return params.get("repo") ?? undefined;
}

function loadSaved(): { url: string; token: string; branch: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function updateUrlParam(repoUrl: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("repo", repoUrl);
  window.history.replaceState(null, "", url.toString());
}

type ViewMode = "grid" | "list";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [, setBranch] = useState("master");
  const [entries, setEntries] = useState<DcconEntry[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const didAutoLoad = useRef(false);

  const handleLoad = useCallback(async (url: string, token: string, branchName: string) => {
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
      setRepo(parsed);
      setBranch(branchName);
      setImageFiles(images);
      setEntries(parseDcconList(raw));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, token, branch: branchName }));
      updateUrlParam(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;
    const paramUrl = getInitialUrl();
    if (paramUrl) handleLoad(paramUrl, "", "master");
    else { const saved = loadSaved(); if (saved) handleLoad(saved.url, saved.token, saved.branch); }
  }, [handleLoad]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="shrink-0 border-b border-border px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">dccon manager</h1>
          <p className="text-xs text-muted-foreground">디시콘 매핑 편집기</p>
        </div>
        {repo && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{repo.owner}/{repo.repo}</Badge>
            <Badge variant="outline">이미지 {imageFiles.length}</Badge>
            <Badge variant="outline">매핑 {entries.length}</Badge>
            <ExportPanel entries={entries} />
          </div>
        )}
      </header>

      <div className="shrink-0 px-6 py-3 border-b border-border">
        <RepoInput onLoad={handleLoad} loading={loading} savedUrl={getInitialUrl() ?? loadSaved()?.url} />
      </div>

      {error && (
        <div className="shrink-0 mx-6 mt-3 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {repo && entries.length > 0 && (
        viewMode === "grid" ? (
          <DcconGrid
            entries={entries}
            imageFiles={imageFiles}
            repo={repo}
            onChange={setEntries}
            onSwitchToList={() => setViewMode("list")}
          />
        ) : (
          <DcconListView
            entries={entries}
            imageFiles={imageFiles}
            repo={repo}
            onChange={setEntries}
            onSwitchToGrid={() => setViewMode("grid")}
          />
        )
      )}
    </div>
  );
}
