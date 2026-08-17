// ── types ──────────────────────────────────────────────────────────────────
import type { EmojiEntry, EmojiGroup } from './types'

/**
 * A curated emoji set, written out rather than depended on.
 *
 * The full Unicode set is ~1,900 characters and every package that ships it
 * costs a megabyte or more — for a picker, in an editor whose whole point is
 * plain text. This is the subset that actually appears in documentation and
 * notes, each with the words someone would search for.
 *
 * Keywords are English because the Markdown they end up in usually is, and
 * because `:rocket:` is the name people already know. The *labels* on the
 * category tabs are translated; these are not.
 */
const GROUPS: { id: EmojiGroup; entries: [string, string][] }[] = [
  {
    id: 'common',
    entries: [
      ['✅', 'check tick done yes ok'],
      ['❌', 'cross no fail wrong'],
      ['⚠️', 'warning caution alert'],
      ['ℹ️', 'info information note'],
      ['💡', 'idea tip bulb light'],
      ['🔥', 'fire hot popular'],
      ['⭐', 'star favourite favorite'],
      ['🚀', 'rocket launch ship deploy'],
      ['🎉', 'party celebrate release'],
      ['📌', 'pin important'],
      ['🔗', 'link url chain'],
      ['📝', 'note memo write'],
      ['🐛', 'bug defect issue'],
      ['🔧', 'wrench fix tool'],
      ['🔒', 'lock secure private'],
      ['🔓', 'unlock open public'],
      ['⏳', 'pending waiting time'],
      ['✨', 'sparkles new feature'],
      ['♻️', 'refactor recycle'],
      ['🚧', 'construction wip progress']
    ]
  },
  {
    id: 'people',
    entries: [
      ['😀', 'grin smile happy'],
      ['😄', 'smile happy joy'],
      ['😅', 'sweat nervous laugh'],
      ['😂', 'laugh tears joy'],
      ['🙂', 'slight smile'],
      ['😉', 'wink'],
      ['😊', 'blush happy'],
      ['🤔', 'think thinking hmm'],
      ['😴', 'sleep tired'],
      ['😢', 'cry sad tear'],
      ['😡', 'angry rage mad'],
      ['🤯', 'mind blown shock'],
      ['🥳', 'party celebrate'],
      ['😎', 'cool sunglasses'],
      ['🙈', 'monkey see no evil'],
      ['👍', 'thumbs up yes good approve'],
      ['👎', 'thumbs down no bad'],
      ['👏', 'clap applause'],
      ['🙏', 'pray thanks please'],
      ['💪', 'strong muscle'],
      ['👀', 'eyes look review'],
      ['🧠', 'brain smart mind'],
      ['👋', 'wave hello hi bye'],
      ['🤝', 'handshake deal agree']
    ]
  },
  {
    id: 'objects',
    entries: [
      ['💻', 'laptop computer code'],
      ['🖥️', 'desktop monitor screen'],
      ['⌨️', 'keyboard type'],
      ['🖱️', 'mouse click'],
      ['📱', 'phone mobile'],
      ['💾', 'save floppy disk'],
      ['💿', 'disc cd'],
      ['🗄️', 'archive cabinet storage'],
      ['📁', 'folder directory'],
      ['📂', 'folder open'],
      ['📄', 'document file page'],
      ['📊', 'chart bar statistics'],
      ['📈', 'chart up growth increase'],
      ['📉', 'chart down decrease'],
      ['📅', 'calendar date'],
      ['⏰', 'alarm clock time'],
      ['🔍', 'search magnify find'],
      ['🔑', 'key password secret'],
      ['🛠️', 'tools build'],
      ['⚙️', 'gear settings config'],
      ['🧪', 'test experiment lab'],
      ['🧹', 'clean broom tidy'],
      ['📦', 'package box build release'],
      ['🏷️', 'tag label version'],
      ['✉️', 'mail email envelope'],
      ['📢', 'announce megaphone'],
      ['🔔', 'bell notification'],
      ['🗑️', 'trash delete bin']
    ]
  },
  {
    id: 'symbols',
    entries: [
      ['✔️', 'check mark'],
      ['✖️', 'cross multiply'],
      ['➕', 'plus add'],
      ['➖', 'minus remove'],
      ['➡️', 'arrow right next'],
      ['⬅️', 'arrow left back'],
      ['⬆️', 'arrow up'],
      ['⬇️', 'arrow down'],
      ['🔁', 'repeat loop'],
      ['❓', 'question help'],
      ['❗', 'exclamation important'],
      ['💯', 'hundred perfect'],
      ['🆕', 'new'],
      ['🆗', 'ok'],
      ['🔴', 'red circle stop critical'],
      ['🟠', 'orange circle'],
      ['🟡', 'yellow circle'],
      ['🟢', 'green circle go pass'],
      ['🔵', 'blue circle'],
      ['⚫', 'black circle'],
      ['⚪', 'white circle'],
      ['©️', 'copyright'],
      ['™️', 'trademark'],
      ['🚫', 'forbidden banned no']
    ]
  },
  {
    id: 'nature',
    entries: [
      ['🌍', 'earth world globe'],
      ['🌙', 'moon night dark'],
      ['☀️', 'sun day light'],
      ['⛅', 'cloud weather'],
      ['🌧️', 'rain weather'],
      ['❄️', 'snow cold winter'],
      ['🌱', 'seedling grow new'],
      ['🌳', 'tree nature'],
      ['🌸', 'blossom flower spring'],
      ['🍀', 'clover luck'],
      ['🐱', 'cat'],
      ['🐶', 'dog'],
      ['🐧', 'penguin linux'],
      ['🦊', 'fox firefox'],
      ['🐍', 'snake python'],
      ['🐳', 'whale docker'],
      ['☕', 'coffee java break'],
      ['🍕', 'pizza food'],
      ['🎂', 'cake birthday'],
      ['🏆', 'trophy win award']
    ]
  }
]

export const EMOJI: readonly EmojiEntry[] = GROUPS.flatMap(({ id, entries }) =>
  entries.map(([char, keywords]) => ({ char, keywords, group: id }))
)

export const EMOJI_GROUPS: readonly EmojiGroup[] = GROUPS.map((group) => group.id)

/**
 * Matches on the keywords, and on the character itself so pasting an emoji
 * into the search finds it. Ranked so a keyword that *starts* with the query
 * beats one that merely contains it — typing "no" should offer ❌ before 🐧.
 */
export function searchEmoji(query: string): readonly EmojiEntry[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return EMOJI

  const scored: { entry: EmojiEntry; score: number }[] = []

  for (const entry of EMOJI) {
    if (entry.char === needle) {
      scored.push({ entry, score: 0 })
      continue
    }

    const words = entry.keywords.split(' ')
    if (words.some((word) => word === needle)) scored.push({ entry, score: 1 })
    else if (words.some((word) => word.startsWith(needle))) scored.push({ entry, score: 2 })
    else if (entry.keywords.includes(needle)) scored.push({ entry, score: 3 })
  }

  return scored.sort((a, b) => a.score - b.score).map((hit) => hit.entry)
}
