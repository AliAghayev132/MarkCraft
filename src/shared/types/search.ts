export interface SearchOptions {
  caseSensitive: boolean
  wholeWord: boolean
  regex: boolean
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  regex: false
}

export interface WorkspaceSearchRequest extends SearchOptions {
  root: string
  query: string
  /** Comma separated globs, e.g. "*.md, docs/**". Empty means all text files. */
  include: string
  exclude: string
  maxFileMatches: number
  maxTotalMatches: number
}

export interface SearchMatch {
  /** 1-based. */
  line: number
  /** 0-based column within the line. */
  column: number
  length: number
  /** The full (possibly trimmed) line used for the result preview. */
  preview: string
  /** Offset of the match inside `preview`, after trimming. */
  previewOffset: number
}

export interface SearchFileResult {
  path: string
  name: string
  directory: string
  matches: SearchMatch[]
  /** True when the file had more matches than `maxFileMatches`. */
  truncated: boolean
}

export interface WorkspaceSearchResponse {
  results: SearchFileResult[]
  filesScanned: number
  totalMatches: number
  /** True when scanning stopped early because a cap was reached. */
  truncated: boolean
  durationMs: number
}

export interface WorkspaceReplaceRequest extends WorkspaceSearchRequest {
  replacement: string
  /** Restrict the replace to these files; empty means every matching file. */
  files: string[]
}

export interface WorkspaceReplaceResponse {
  filesChanged: number
  replacements: number
  skipped: { path: string; reason: string }[]
}
