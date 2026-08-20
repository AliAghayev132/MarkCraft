/**
 * Matching a file by a few letters of its name.
 *
 * The command palette matches commands, and it does so by substring — right
 * there, because a command's name is short and typed in full. A file is not:
 * people type `usrv` for `user-service.ts`, and a substring search finds
 * nothing.
 *
 * The scoring is the part that matters. Any subsequence "matches"; what makes
 * a quick-open useful is that the *right* file is first, and that is decided by
 * where the letters landed rather than whether they were there at all.
 */

export interface FuzzyMatch {
  /** Higher is better. Zero means it did not match at all. */
  score: number
  /** Which characters of the candidate were matched, for highlighting. */
  positions: number[]
}

const NO_MATCH: FuzzyMatch = { score: 0, positions: [] }

/**
 * Scores `query` against `candidate`.
 *
 * Rewards, in the order they matter:
 *
 *  - a run of letters together, because `usse` matching `user-service`
 *    consecutively is a better answer than the same letters scattered;
 *  - a letter at the start of a word, because that is how people abbreviate —
 *    `usrv` is `user-service`, not `useruvw`;
 *  - a match in the file's name rather than its folder, because that is what
 *    was being looked for.
 *
 * Case is ignored, but an exact-case hit scores slightly higher, which settles
 * ties between `readme.md` and `README.md` the way anybody would expect.
 */
export function fuzzyMatch(query: string, candidate: string): FuzzyMatch {
  const needle = query.trim()
  if (needle === '') return { score: 1, positions: [] }
  if (needle.length > candidate.length) return NO_MATCH

  const lowerNeedle = needle.toLowerCase()
  const lowerCandidate = candidate.toLowerCase()

  const positions: number[] = []
  let score = 0
  let at = 0
  let run = 0

  for (let index = 0; index < lowerNeedle.length; index++) {
    const wanted = lowerNeedle[index]
    const found = lowerCandidate.indexOf(wanted, at)
    if (found === -1) return NO_MATCH

    // Straight after the last one: the letters are together.
    if (found === at && index > 0) {
      run++
      score += 8 + run * 2
    } else {
      run = 0
      score += 1
    }

    if (isWordStart(candidate, found)) score += 10
    if (candidate[found] === needle[index]) score += 1

    positions.push(found)
    at = found + 1
  }

  // A short name matched by the same letters is the better answer: `todo.md`
  // beats `a-very-long-todo-list.md` for "todo".
  score += Math.max(0, 20 - candidate.length / 4)

  // And what was matched in the name counts for more than the folder it is in.
  const slash = candidate.lastIndexOf('/')
  if (slash >= 0 && positions.every((position) => position > slash)) score += 15

  return { score, positions }
}

function isWordStart(text: string, index: number): boolean {
  if (index === 0) return true

  const previous = text[index - 1]
  if (/[^\p{L}\p{N}]/u.test(previous)) return true

  // `userService` — the capital starts a word even with no separator.
  return previous === previous.toLowerCase() && text[index] !== text[index].toLowerCase()
}

export interface Ranked<T> {
  item: T
  score: number
  positions: number[]
}

/**
 * The best matches first, and nothing that did not match at all.
 *
 * Ties are broken by the candidate's own order, so an empty query leaves the
 * list exactly as it was given — which is what makes this usable for "show me
 * everything" as well as for searching.
 */
export function rankFuzzy<T>(
  query: string,
  items: T[],
  textOf: (item: T) => string,
  limit = 50
): Ranked<T>[] {
  const ranked: Ranked<T>[] = []

  items.forEach((item, index) => {
    const match = fuzzyMatch(query, textOf(item))
    if (match.score === 0) return
    // The index keeps the original order for equal scores, without a second
    // sort key that means nothing to anyone reading the list.
    ranked.push({ item, score: match.score * 1000 - index, positions: match.positions })
  })

  return ranked.sort((a, b) => b.score - a.score).slice(0, limit)
}
