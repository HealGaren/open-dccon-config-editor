export interface DcconEntry {
  name: string;
  keywords: string[];
  tags: string[];
}

export interface RepoInfo {
  owner: string;
  repo: string;
}

export type ValidationStatus = "ok" | "unmapped" | "missing-file";
