/**
 * Utils contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

export type ClassValue = string | false | null | undefined

export interface ExternalStore<T> {
  get: () => T
  set: (next: T) => void
  subscribe: (listener: () => void) => () => void
}
