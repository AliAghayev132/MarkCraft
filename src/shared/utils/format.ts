export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

export function formatNumber(n: number): string {
  return n.toLocaleString()
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "just now" / "12 min ago" / "Yesterday" / "14 Mar". */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  if (!timestamp) return '—'
  const diff = now - timestamp
  if (diff < 45_000) return 'just now'
  if (diff < HOUR) return `${Math.round(diff / MINUTE)} min ago`
  if (diff < DAY) {
    const hours = Math.round(diff / HOUR)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  if (diff < 2 * DAY) return 'Yesterday'
  if (diff < 7 * DAY) return `${Math.round(diff / DAY)} days ago`

  const date = new Date(timestamp)
  const sameYear = date.getFullYear() === new Date(now).getFullYear()
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' })
  })
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

/** Reading time at an average adult prose pace. */
export function formatReadingTime(words: number): string {
  if (words === 0) return '0 min'
  const minutes = words / 225
  if (minutes < 1) return '< 1 min'
  return `${Math.round(minutes)} min`
}

export function truncateMiddle(value: string, max = 48): string {
  if (value.length <= max) return value
  const half = Math.floor((max - 1) / 2)
  return `${value.slice(0, half)}…${value.slice(value.length - half)}`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}
