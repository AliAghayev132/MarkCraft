// ── @lib ───────────────────────────────────────────────────────────────────
import { Braces, Clock, Code2, FileJson, KeyRound, Link2, RefreshCw, Regex, Tag, Wrench } from '@icons'
import { useMemo, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  convertTimestamp,
  decodeBase64,
  decodeJwt,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  formatJson,
  minifyJson,
  testRegex,
  uuid,
  type ToolOutcome
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { toast } from '@services'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Input, Modal, ModalActions, Segmented, Textarea } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

import { jsonToYaml, yamlToJson } from './yaml-tools'

// ── types ──────────────────────────────────────────────────────────────────
import type { DevTool, DevToolId, DevToolsDialogProps } from './types'

const TOOLS: DevTool[] = [
  { id: 'json', icon: <Braces size={15} />, reversible: true },
  { id: 'yaml', icon: <FileJson size={15} />, reversible: true },
  { id: 'base64', icon: <Code2 size={15} />, reversible: true },
  { id: 'url', icon: <Link2 size={15} />, reversible: true },
  { id: 'jwt', icon: <KeyRound size={15} />, reversible: false },
  { id: 'timestamp', icon: <Clock size={15} />, reversible: false },
  { id: 'regex', icon: <Regex size={15} />, reversible: false },
  { id: 'uuid', icon: <Tag size={15} />, reversible: false, generator: true }
]

/**
 * The conversions that otherwise send a writer to a web page.
 *
 * Every one of them runs locally. That is the point rather than a detail: the
 * text pasted in here is a token, a config file or a customer's payload, and
 * the habit of pasting those into someone else's site is exactly what a desktop
 * editor should be able to break.
 */
export function DevToolsDialog({ open, onClose }: DevToolsDialogProps): ReactElement {
  const t = useT()

  const [tool, setTool] = useState<DevToolId>('json')
  const [input, setInput] = useState('')
  const [reversed, setReversed] = useState(false)
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('')
  const [generated, setGenerated] = useState(() => uuid())

  const active = TOOLS.find((entry) => entry.id === tool) ?? TOOLS[0]

  const outcome = useMemo<ToolOutcome>(() => {
    if (active.generator) return { ok: true, value: generated }
    if (input.trim() === '' && tool !== 'regex') return { ok: true, value: '' }

    switch (tool) {
      case 'json':
        return reversed ? minifyJson(input) : formatJson(input)
      case 'yaml':
        return reversed ? yamlToJson(input) : jsonToYaml(input)
      case 'base64':
        return reversed ? decodeBase64(input) : encodeBase64(input)
      case 'url':
        return reversed ? decodeUrl(input) : encodeUrl(input)
      case 'jwt':
        return decodeJwt(input)
      case 'timestamp':
        return convertTimestamp(input)
      case 'regex': {
        const result = testRegex(pattern, flags, input)
        if (!result.ok) return { ok: false, reason: 'regex', detail: result.detail }

        return {
          ok: true,
          value:
            result.matches.length === 0
              ? t('devtools.noMatches')
              : result.matches
                  .map(
                    (match) =>
                      `${String(match.index).padStart(5)}  ${match.text}` +
                      (match.groups.length ? `\n       ${match.groups.join(' | ')}` : '')
                  )
                  .join('\n')
        }
      }
      default:
        return { ok: true, value: '' }
    }
  }, [active.generator, generated, input, tool, reversed, pattern, flags, t])

  const output = outcome.ok ? outcome.value : ''

  const copy = (): void => {
    void navigator.clipboard.writeText(output)
    toast.success(t('devtools.copied'))
  }

  /* Switching tools keeps the panel usable rather than clever: the previous
     input is almost never valid for the next tool, and leaving it there means
     the first thing shown is an error. */
  const select = (next: DevToolId): void => {
    setTool(next)
    setInput('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('devtools.title')}
      icon={<Wrench size={17} />}
      size="xl"
      footer={
        <ModalActions>
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
          {/* No icon: the footer buttons are narrow, and a long translated
              label wraps around one instead of sitting beside it. */}
          <Button variant="primary" disabled={output === ''} onClick={copy}>
            {t('devtools.copy')}
          </Button>
        </ModalActions>
      }
    >
      <div className="flex gap-4">
        <nav className="flex w-[150px] flex-none flex-col gap-0.5" aria-label={t('devtools.title')}>
          {TOOLS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-current={entry.id === tool}
              onClick={() => select(entry.id)}
              className={cx(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                entry.id === tool ? 'bg-active font-medium text-ink' : 'text-ink-secondary'
              )}
            >
              {entry.icon}
              {t(`devtools.tools.${entry.id}`)}
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {active.reversible ? (
            <Segmented
              value={reversed ? 'back' : 'forward'}
              onChange={(next) => setReversed(next === 'back')}
              options={[
                { value: 'forward', label: t(`devtools.forward.${tool}`) },
                { value: 'back', label: t(`devtools.back.${tool}`) }
              ]}
            />
          ) : null}

          {tool === 'regex' ? (
            <div className="flex gap-2">
              <Input
                size="sm"
                value={pattern}
                placeholder={t('devtools.pattern')}
                aria-label={t('devtools.pattern')}
                className="flex-1 font-mono"
                onChange={(event) => setPattern(event.currentTarget.value)}
              />
              <Input
                size="sm"
                value={flags}
                placeholder={t('devtools.flags')}
                aria-label={t('devtools.flags')}
                className="w-[86px] font-mono"
                onChange={(event) => setFlags(event.currentTarget.value)}
              />
            </div>
          ) : null}

          {active.generator ? (
            <Button
              variant="secondary"
              icon={<RefreshCw size={14} />}
              onClick={() => setGenerated(uuid())}
            >
              {t('devtools.generate')}
            </Button>
          ) : (
            <Textarea
              rows={7}
              value={input}
              spellCheck={false}
              placeholder={t('devtools.inputHint')}
              aria-label={t('devtools.input')}
              className="font-mono text-xs"
              onChange={(event) => setInput(event.currentTarget.value)}
            />
          )}

          {outcome.ok ? (
            <pre
              aria-label={t('devtools.output')}
              className="m-0 max-h-[260px] min-h-[120px] overflow-auto rounded-md border border-line bg-sunken p-2.5 font-mono text-xs whitespace-pre-wrap break-all text-ink"
            >
              {output}
            </pre>
          ) : (
            <p className="m-0 min-h-[120px] rounded-md border border-danger/40 bg-danger/5 p-2.5 text-xs text-danger">
              {t(`devtools.errors.${outcome.reason}`)}
              {outcome.detail ? <span className="block pt-1 opacity-70">{outcome.detail}</span> : null}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
