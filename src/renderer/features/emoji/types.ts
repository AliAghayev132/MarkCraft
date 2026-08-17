export type EmojiGroup = 'common' | 'people' | 'objects' | 'symbols' | 'nature'

export interface EmojiEntry {
  char: string
  /** Space-separated English search terms. */
  keywords: string
  group: EmojiGroup
}

export interface EmojiPickerProps {
  open: boolean
  onClose: () => void
}
