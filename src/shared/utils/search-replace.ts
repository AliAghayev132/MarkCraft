/**
 * What a search matches, and what a replacement turns it into.
 *
 * In `@shared` because both ends need exactly the same answer. The main
 * process performs the replacement across a workspace; the panel shows the
 * writer what it is about to do. If those two disagreed by so much as how `$1`
 * is read, the preview would be a lie — and a preview that lies about a
 * destructive operation is worse than no preview at all.
 */

export interface QueryOptions {
  caseSensitive: boolean
  wholeWord: boolean
  regex: boolean
}

/**
 * The regular expression a query stands for.
 *
 * Always global and always Unicode: every caller wants every match, and a
 * pattern that stops at the first astral character would quietly skip matches
 * in a document with an emoji in it.
 */
export function buildQueryRegex(query: string, options: QueryOptions): RegExp {
  const source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const wrapped = options.wholeWord ? `\\b(?:${source})\\b` : source
  return new RegExp(wrapped, options.caseSensitive ? 'gu' : 'giu')
}

/*
 * `$&` for the whole match and `$1`–`$9` for its groups. Deliberately not the
 * full set JavaScript's own `String.replace` understands — `$'` and `` $` ``
 * insert everything before or after the match, which in a whole-workspace
 * replacement means inserting the rest of the file into it. Nobody has ever
 * meant that.
 */
const TOKEN = /\$(\d|&)/g

/** Fills a replacement's backreferences from the groups a match captured. */
export function expandReplacement(
  template: string,
  groups: readonly (string | undefined)[],
  options: Pick<QueryOptions, 'regex'>
): string {
  // A plain-text search has no groups, so `$1` in the replacement is a dollar
  // and a one — which is what somebody replacing prices means by it.
  if (!options.regex) return template

  return template.replace(TOKEN, (_, token: string) =>
    token === '&' ? (groups[0] ?? '') : (groups[Number(token)] ?? '')
  )
}

export interface Replaced {
  text: string
  count: number
}

/** Replaces every match, expanding backreferences as it goes. */
export function replaceAll(
  text: string,
  query: string,
  replacement: string,
  options: QueryOptions
): Replaced {
  const regex = buildQueryRegex(query, options)
  let count = 0

  const next = text.replace(regex, (...args) => {
    count++
    // `replace` passes the groups first and the offset and whole string last.
    const groups = args.slice(0, -2) as (string | undefined)[]
    return expandReplacement(replacement, groups, options)
  })

  return { text: next, count }
}

/**
 * What one match becomes, for showing beside it.
 *
 * The groups are recovered by running the query against the matched text
 * itself, which is exact for every pattern that does not look outside what it
 * matched. A lookahead can disagree — and when it does the preview shows the
 * template unexpanded rather than inventing a substitution, because a guess
 * here is a guess about somebody's files.
 */
export function replacementFor(
  matched: string,
  query: string,
  replacement: string,
  options: QueryOptions
): string {
  if (!options.regex) return replacement

  let regex: RegExp
  try {
    regex = buildQueryRegex(query, options)
  } catch {
    // An unfinished pattern — `(foo` while it is still being typed.
    return replacement
  }

  regex.lastIndex = 0
  const hit = regex.exec(matched)
  if (!hit || hit[0] !== matched) return replacement

  return expandReplacement(replacement, hit, options)
}
