/**
 * Markdown with the marks taken off.
 *
 * A .txt export is not the Markdown renamed: someone asking for plain text
 * wants prose they can paste where a hash is just a hash. Structure survives as
 * blank lines, and a link keeps its text rather than its target.
 */
export function toPlainText(markdown: string): string {
  return `${markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/, '')
    .replace(/^```.*$/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+(\[[ xX]\]\s+)?/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|~~|`)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`
}
