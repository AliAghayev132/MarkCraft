// ── @lib ───────────────────────────────────────────────────────────────────
import { Globe, Mail } from '@icons'
import { useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  formatBytes,
  formatHeaders,
  HTTP_METHODS,
  isRequestableUrl,
  parseHeaders,
  prettyBody,
  statusTone,
  type HttpMethod,
  type HttpResponse
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { httpService } from '@services'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Field, Input, Modal, ModalActions, Segmented, Textarea } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { HttpDialogProps } from './types'

const TONES = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-ink-secondary'
}

/**
 * A request box, for the API a technical document is about.
 *
 * Everything it sends is something the user typed and pressed a button for.
 * MarkCraft still makes no request of its own — this feature does not change
 * that, and the guards that keep it true live in main, not here.
 */
export function HttpDialog({ open, onClose }: HttpDialogProps): ReactElement {
  const t = useT()

  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('')
  const [headerText, setHeaderText] = useState('Accept: application/json')
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<HttpResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const valid = isRequestableUrl(url)
  const carriesBody = method !== 'GET' && method !== 'HEAD'

  const send = async (): Promise<void> => {
    setSending(true)
    setError(null)
    setResponse(null)

    try {
      setResponse(
        await httpService.send({
          method,
          url: url.trim(),
          headers: parseHeaders(headerText),
          body: carriesBody ? body : undefined
        })
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setSending(false)
    }
  }

  const contentType = response?.headers['content-type'] ?? ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('http.title')}
      description={t('http.subtitle')}
      icon={<Globe size={17} />}
      size="xl"
      footer={
        <ModalActions>
          <Button onClick={onClose}>{t('common.close')}</Button>
          <Button
            variant="primary"
            icon={<Mail size={14} />}
            disabled={!valid || sending}
            onClick={() => void send()}
          >
            {sending ? t('http.sending') : t('http.send')}
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <Segmented
            value={method}
            onChange={(next) => setMethod(next as HttpMethod)}
            options={HTTP_METHODS.map((name) => ({ value: name, label: name }))}
          />
        </div>

        <Field
          label={t('http.url')}
          hint={url !== '' && !valid ? t('http.urlInvalid') : undefined}
          required
        >
          <Input
            data-autofocus
            value={url}
            monospace
            placeholder="https://api.example.com/v1/things"
            onChange={(event) => setUrl(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && valid && !sending) void send()
            }}
          />
        </Field>

        <Field label={t('http.headers')} hint={t('http.headersHint')}>
          <Textarea
            rows={3}
            value={headerText}
            spellCheck={false}
            className="font-mono text-xs"
            onChange={(event) => setHeaderText(event.currentTarget.value)}
          />
        </Field>

        {carriesBody ? (
          <Field label={t('http.body')}>
            <Textarea
              rows={4}
              value={body}
              spellCheck={false}
              className="font-mono text-xs"
              onChange={(event) => setBody(event.currentTarget.value)}
            />
          </Field>
        ) : null}

        {error ? (
          <p className="m-0 rounded-md border border-danger/40 bg-danger/5 p-2.5 text-xs text-danger">
            {error}
          </p>
        ) : null}

        {response ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className={cx('font-medium tabular-nums', TONES[statusTone(response.status)])}>
                {response.status} {response.statusText}
              </span>
              <span className="text-xs tabular-nums text-ink-tertiary">
                {response.durationMs} ms · {formatBytes(response.bytes)}
                {response.truncated ? ` · ${t('http.truncated')}` : ''}
              </span>
            </div>

            <pre
              aria-label={t('http.responseHeaders')}
              className="m-0 max-h-[120px] overflow-auto rounded-md border border-line bg-sunken p-2 font-mono text-2xs text-ink-tertiary"
            >
              {formatHeaders(response.headers)}
            </pre>

            <pre
              aria-label={t('http.responseBody')}
              className="m-0 max-h-[280px] overflow-auto rounded-md border border-line bg-sunken p-2.5 font-mono text-xs whitespace-pre-wrap break-all text-ink"
            >
              {prettyBody(response.body, contentType)}
            </pre>
          </section>
        ) : null}
      </div>
    </Modal>
  )
}
