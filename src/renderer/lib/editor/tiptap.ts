/**
 * Tiptap / ProseMirror.
 *
 * The extension set is assembled here rather than in the editor component, so
 * the schema — which is what determines whether a Markdown construct survives a
 * round-trip — is defined in one reviewable place.
 */

export { EditorContent, useEditor } from '@tiptap/react'
export type { Editor, Editor as RichEditorInstance } from '@tiptap/core'

export { default as StarterKit } from '@tiptap/starter-kit'
export { default as Image } from '@tiptap/extension-image'
export { default as Placeholder } from '@tiptap/extension-placeholder'
export { default as TaskItem } from '@tiptap/extension-task-item'
export { default as TaskList } from '@tiptap/extension-task-list'
export { default as CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
export { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'

// ProseMirror's own serialiser, used to turn a *selection* back into HTML
// without the decorations and widgets the live view carries.
export { DOMSerializer } from '@tiptap/pm/model'
