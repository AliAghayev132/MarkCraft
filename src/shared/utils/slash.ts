/**
 * The `/` block menu's matching rules.
 *
 * Kept pure and separate from the menu that renders it: what counts as a
 * trigger is the part that has to be exactly right — a menu that pops open
 * inside a URL or a file path interrupts writing, and a user who has been
 * interrupted twice stops trusting the feature and turns it off.
 */
export interface SlashTrigger {
  /** What was typed after the slash. Empty right after `/` is pressed. */
  query: string
  /** Characters back from the caret that the trigger occupies, including `/`. */
  length: number
}

/*
 * The slash has to open a block, so it only counts at the start of a line or
 * after a space. That rules out `src/renderer`, `and/or`, `https://…` and
 * `24/7` without a list of exceptions — the character before it decides.
 *
 * The query itself stops at whitespace or another slash, so the menu closes on
 * its own once the text has clearly become something else.
 */
const TRIGGER = /(?:^|\s)\/([^\s/]*)$/

/** The trigger immediately before the caret, given the line text up to it. */
export function matchSlash(before: string): SlashTrigger | null {
  const matched = before.match(TRIGGER)
  if (!matched) return null

  return { query: matched[1], length: matched[1].length + 1 }
}

export interface SlashCandidate {
  id: string
  label: string
  /** Alternative words a user might reach for: `ul` for a bullet list. */
  keywords?: string[]
}

/*
 * Ranked rather than filtered. Someone typing `/l` means "list" far more often
 * than "inline code", so a plain substring filter that puts them in definition
 * order would make the first Enter press wrong most of the time.
 */
const enum Rank {
  LabelPrefix,
  KeywordPrefix,
  LabelContains,
  KeywordContains,
  None
}

function rankOne(item: SlashCandidate, query: string): Rank {
  const label = item.label.toLowerCase()
  if (label.startsWith(query)) return Rank.LabelPrefix

  const keywords = (item.keywords ?? []).map((word) => word.toLowerCase())
  if (keywords.some((word) => word.startsWith(query))) return Rank.KeywordPrefix
  if (label.includes(query)) return Rank.LabelContains
  if (keywords.some((word) => word.includes(query))) return Rank.KeywordContains

  return Rank.None
}

/** Matching items, best first; ties keep the order they were defined in. */
export function rankSlash<T extends SlashCandidate>(items: T[], query: string): T[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [...items]

  return items
    .map((item, index) => ({ item, index, rank: rankOne(item, needle) }))
    .filter((scored) => scored.rank !== Rank.None)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((scored) => scored.item)
}
