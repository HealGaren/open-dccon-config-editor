import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface Props {
  onLoad: (repoUrl: string, token: string, branch: string) => void;
  loading: boolean;
  savedUrl?: string;
}

export function RepoInput({ onLoad, loading, savedUrl }: Props) {
  const [url, setUrl] = useState(savedUrl ?? "");
  const [token, setToken] = useState("");
  const [branch, setBranch] = useState("master");
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="GitHub 레포 URL (예: https://github.com/owner/repo)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && url.trim() && onLoad(url.trim(), token.trim(), branch.trim())}
          disabled={loading}
          className="flex-1"
        />
        <Button
          onClick={() => onLoad(url.trim(), token.trim(), branch.trim())}
          disabled={!url.trim() || loading}
        >
          {loading ? "로딩 중..." : "불러오기"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? "접기" : "설정"}
        </Button>
      </div>
      {showAdvanced && (
        <div className="flex gap-4 p-3 rounded-md bg-muted/50 text-sm">
          <label className="flex flex-col gap-1 text-muted-foreground">
            Branch
            <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="master" className="h-8 w-32" />
          </label>
          <label className="flex flex-col gap-1 text-muted-foreground">
            GitHub Token (선택)
            <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="rate limit 해제용" className="h-8 w-56" />
          </label>
        </div>
      )}
    </div>
  );
}
