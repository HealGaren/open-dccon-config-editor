import { useState } from "react";

interface Props {
  onLoad: (repoUrl: string, token: string, branch: string) => void;
  loading: boolean;
}

export function RepoInput({ onLoad, loading }: Props) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [branch, setBranch] = useState("master");
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="repo-input">
      <div className="repo-input-row">
        <input
          type="text"
          placeholder="GitHub 레포 URL (예: https://github.com/owner/repo)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && url.trim() && onLoad(url.trim(), token.trim(), branch.trim())}
          disabled={loading}
        />
        <button
          onClick={() => onLoad(url.trim(), token.trim(), branch.trim())}
          disabled={!url.trim() || loading}
        >
          {loading ? "로딩 중..." : "불러오기"}
        </button>
        <button
          className="btn-text"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? "접기" : "설정"}
        </button>
      </div>
      {showAdvanced && (
        <div className="repo-input-advanced">
          <label>
            Branch
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="master"
            />
          </label>
          <label>
            GitHub Token (선택)
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="rate limit 해제용"
            />
          </label>
        </div>
      )}
    </div>
  );
}
