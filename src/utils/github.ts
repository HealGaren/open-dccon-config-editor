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

function cdnBase(repo: RepoInfo, branch: string): string {
  return `https://cdn.jsdelivr.net/gh/${repo.owner}/${repo.repo}@${branch}`;
}

export function imageUrl(repo: RepoInfo, filename: string, branch = "master"): string {
  return `${cdnBase(repo, branch)}/images/dccon/${encodeURIComponent(filename)}`;
}

interface JsDelivrFile {
  name: string;
}

interface JsDelivrDirectory {
  files: JsDelivrFile[];
}

export async function fetchImageList(
  repo: RepoInfo,
  _token?: string,
  branch = "master"
): Promise<string[]> {
  const url = `https://data.jsdelivr.com/v1/packages/gh/${repo.owner}/${repo.repo}@${branch}/flat`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`jsDelivr API error: ${res.status} ${res.statusText}`);

  const data: JsDelivrDirectory = await res.json();
  const prefix = "/images/dccon/";
  return data.files
    .filter((f) => f.name.startsWith(prefix) && /\.(gif|png|jpg|jpeg|webp)$/i.test(f.name))
    .map((f) => f.name.slice(prefix.length));
}

export async function fetchDcconListJs(
  repo: RepoInfo,
  _token?: string,
  branch = "master"
): Promise<string> {
  const url = `${cdnBase(repo, branch)}/lib/dccon_list.js`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`dccon_list.js를 불러올 수 없습니다: ${res.status}`);
  return res.text();
}
