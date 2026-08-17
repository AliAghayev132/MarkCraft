/**
 * Running a fenced code block.
 *
 * The design in one sentence: MarkCraft never ships an interpreter and never
 * downloads one — it runs the language the user already installed, or it says
 * it cannot.
 *
 * That is the whole safety argument. Nothing is sandboxed, because a sandbox
 * this application could build would be a false promise: the code runs with the
 * user's own permissions, exactly as it would if they had saved the block to a
 * file and run it themselves. What the feature saves is the saving and the
 * typing, not the trust decision — and the user makes that decision one block
 * at a time, by pressing Run.
 */
export interface Runner {
  /** The fence's info string, lower-cased. */
  language: string
  /** Executable looked up on PATH. Never a shell string. */
  command: string
  /** Arguments before the script file. */
  args: string[]
  /** Extension the script is written with, which some runtimes insist on. */
  extension: string
}

/*
 * Deliberately short. Every entry is a language whose interpreter reads a file
 * path as its last argument and writes to stdout — anything needing a project,
 * a build step or a package manager is not something a code block can honestly
 * represent, and pretending otherwise produces confusing failures.
 */
const RUNNERS: Runner[] = [
  { language: 'javascript', command: 'node', args: [], extension: 'js' },
  { language: 'js', command: 'node', args: [], extension: 'js' },
  { language: 'node', command: 'node', args: [], extension: 'js' },
  { language: 'python', command: 'python', args: [], extension: 'py' },
  { language: 'py', command: 'python', args: [], extension: 'py' },
  { language: 'ruby', command: 'ruby', args: [], extension: 'rb' },
  { language: 'php', command: 'php', args: [], extension: 'php' },
  { language: 'go', command: 'go', args: ['run'], extension: 'go' },
  { language: 'bash', command: 'bash', args: [], extension: 'sh' },
  { language: 'sh', command: 'sh', args: [], extension: 'sh' },
  { language: 'powershell', command: 'powershell', args: ['-NoProfile', '-File'], extension: 'ps1' },
  { language: 'ps1', command: 'powershell', args: ['-NoProfile', '-File'], extension: 'ps1' }
]

/** The runner for a fence's language, or null when there is not one. */
export function runnerFor(language: string): Runner | null {
  const wanted = language.trim().toLowerCase()
  if (wanted === '') return null

  return RUNNERS.find((runner) => runner.language === wanted) ?? null
}

/** Every language that can be run, for documentation and settings. */
export function runnableLanguages(): string[] {
  return [...new Set(RUNNERS.map((runner) => runner.language))].sort()
}

export interface RunResult {
  stdout: string
  stderr: string
  /** Null when the process was killed rather than exiting on its own. */
  exitCode: number | null
  durationMs: number
  /** True when it was stopped at the time limit. */
  timedOut: boolean
  /** True when the output was cut at the ceiling. */
  truncated: boolean
}

/**
 * Trims output to a ceiling.
 *
 * From the *end*, not the start: a program that printed a hundred thousand
 * lines and then failed put the useful part last, and a head-truncated log
 * shows everything except the reason.
 */
export function tailLimit(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false }
  return { text: text.slice(text.length - maxChars), truncated: true }
}
