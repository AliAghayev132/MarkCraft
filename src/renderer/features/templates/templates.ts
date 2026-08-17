// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentTemplate, TemplateId } from './types'

/**
 * Starter documents.
 *
 * The bodies are built from translations rather than stored as literals: a
 * template is *prose*, and shipping English headings to a Russian user would be
 * worse than shipping no template at all.
 *
 * Deliberately few, and all short. A template's job is to remove the blank page
 * and suggest a shape — a long one is a document the user has to delete rather
 * than a head start. `New Document` stays instant and blank; this is the
 * deliberate path, behind its own command.
 */
export function documentTemplates(): DocumentTemplate[] {
  const today = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date())

  return [
    {
      id: 'blank',
      title: t('templates.blank.title'),
      description: t('templates.blank.description'),
      body: ''
    },
    {
      id: 'note',
      title: t('templates.note.title'),
      description: t('templates.note.description'),
      body: [`# ${today}`, '', t('templates.note.body'), ''].join('\n')
    },
    {
      id: 'meeting',
      title: t('templates.meeting.title'),
      description: t('templates.meeting.description'),
      body: [
        `# ${t('templates.meeting.heading')}`,
        '',
        `**${t('templates.meeting.date')}:** ${today}`,
        `**${t('templates.meeting.attendees')}:** `,
        '',
        `## ${t('templates.meeting.agenda')}`,
        '',
        '1. ',
        '',
        `## ${t('templates.meeting.notes')}`,
        '',
        '',
        `## ${t('templates.meeting.actions')}`,
        '',
        `- [ ] `,
        ''
      ].join('\n')
    },
    {
      id: 'article',
      title: t('templates.article.title'),
      description: t('templates.article.description'),
      body: [
        '---',
        `title: ${t('templates.article.heading')}`,
        `date: ${new Date().toISOString().slice(0, 10)}`,
        '---',
        '',
        `# ${t('templates.article.heading')}`,
        '',
        t('templates.article.intro'),
        '',
        `## ${t('templates.article.section')}`,
        '',
        ''
      ].join('\n')
    },
    {
      id: 'todo',
      title: t('templates.todo.title'),
      description: t('templates.todo.description'),
      body: [
        `# ${t('templates.todo.heading')}`,
        '',
        `## ${t('templates.todo.today')}`,
        '',
        '- [ ] ',
        '',
        `## ${t('templates.todo.later')}`,
        '',
        '- [ ] ',
        ''
      ].join('\n')
    }
  ]
}

export function templateById(id: TemplateId): DocumentTemplate | undefined {
  return documentTemplates().find((template) => template.id === id)
}
