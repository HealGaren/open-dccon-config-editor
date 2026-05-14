import type { RepoInfo } from "../types";

export function parseRepoUrl(url: string): RepoInfo | null {
  const patterns = [
    /github\.com\/([^/]+)\/([^/]+)/,
    /^([^/]+)\/([^/]+)$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
  }
  return null;
}

function cdnBase(repo: RepoInfo): string {
  return `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.repo}`;
}

export function imageUrl(repo: RepoInfo, filename: string): string {
  return `${cdnBase(repo)}/images/dccon/${encodeURIComponent(filename)}`;
}

export async function fetchImageList(
  repo: RepoInfo,
  token?: string,
  branch = "master"
): Promise<string[]> {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/images/dccon?ref=${branch}`;
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);

  const data: { name: string; type: string }[] = await res.json();
  return data
    .filter((f) => f.type === "file" && /\.(gif|png|jpg|jpeg|webp)$/i.test(f.name))
    .map((f) => f.name);
}

export async function fetchDcconListJs(
  repo: RepoInfo,
  _token?: string,
  _branch = "master"
): Promise<string> {
  const url = `${cdnBase(repo)}/lib/dccon_list.js`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`dccon_list.js를 불러올 수 없습니다: ${res.status}`);
  return res.text();
}
