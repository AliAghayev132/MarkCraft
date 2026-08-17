/**
 * Cross-cutting vendor helpers.
 *
 * Deliberately small. The editors, the markdown pipeline, the icon set and the
 * state layer are NOT re-exported here — funnelling them through one barrel
 * would make the bundler treat the whole vendor surface as a single unit and
 * defeat code splitting. Import those from their own module:
 *
 *   import { EditorView }   from '@lib/editor/codemirror'
 *   import { useEditor }    from '@lib/editor/tiptap'
 *   import { unified }      from '@lib/markdown/unified'
 *   import { createSlice }  from '@lib/redux'
 *   import { Search }       from '@icons'
 *
 * See  for the reasoning.
 */

export type { ReactElement, ReactNode } from '@lib/react'
