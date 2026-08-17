// ── @lib ───────────────────────────────────────────────────────────────────
import { Image as ImageIcon } from '@icons'
import { useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { basename, IMAGE_EXTENSIONS, relativeFrom } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { dialogService, fileService, getSettings, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { documentDirectory, selectActiveDocument, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Field, Input, Modal, ModalActions } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { insertImage } from '@features/editor'
import { ImageEditor, type ImageEditorResult } from '@features/image'

/**
 * Insert image (§15), by way of the crop-and-compress editor.
 */
export function ImageDialog({ onClose }: { onClose: () => void }): React.ReactElement {
  const document = useAppSelector(selectActiveDocument)
  const [alt, setAlt] = useState('')
  const [src, setSrc] = useState('')
  const [title, setTitle] = useState('')
  const [importing, setImporting] = useState(false)
  const [pending, setPending] = useState<{ path: string; dataUrl: string; bytes: number } | null>(
    null
  )

  const documentDir = documentDirectory(document)
  const canSubmit = src.trim().length > 0

  /*
   * Local images go through the editor first. Cropping and compressing after
   * the file has been copied and linked means finding it again and fixing the
   * link, so the one moment it is cheap to ask is before any of that happens.
   */
  const chooseFile = async (): Promise<void> => {
    const paths = await dialogService.openFiles(false)
    const picked = paths[0]
    if (!picked) return

    if (documentDir && getSettings().markdown.imageHandling === 'relative') {
      try {
        const read = await fileService.readAsDataUrl(picked)
        setPending({ path: picked, dataUrl: read.dataUrl, bytes: read.bytes })
        return
      } catch {
        // Not readable as an image — fall through and link it as it is.
      }
    }

    if (!documentDir) {
      // Without a saved location there is nothing to be relative to, so an
      // absolute path is the only honest option.
      setSrc(picked.replace(/\\/g, '/'))
      if (!alt) setAlt(basename(picked).replace(/\.[^.]+$/, ''))
      return
    }

    setImporting(true)
    try {
      const settings = getSettings()
      if (settings.markdown.imageHandling === 'relative') {
        // Copy into the document's asset folder so the link keeps working if
        // the folder is moved or shared.
        const asset = await fileService.importAsset(
          picked,
          document?.path ?? null,
          settings.markdown.imageFolder
        )
        setSrc(asset.relative)
      } else {
        setSrc(relativeFrom(documentDir, picked))
      }
      if (!alt) setAlt(basename(picked).replace(/\.[^.]+$/, ''))
    } catch (error) {
      toast.error('Could not add the image', error instanceof Error ? error.message : String(error))
    } finally {
      setImporting(false)
    }
  }

  const submit = (): void => {
    if (!canSubmit) return
    insertImage({ alt, src: src.trim(), title: title || undefined })
    onClose()
  }

  const applyProcessed = async (result: ImageEditorResult): Promise<void> => {
    if (!pending) return
    const source = pending
    setPending(null)
    setImporting(true)

    try {
      const asset = await fileService.importAsset(
        source.path,
        document?.path ?? null,
        getSettings().markdown.imageFolder,
        { base64: result.base64, name: result.name }
      )
      setSrc(asset.relative)
      if (!alt) setAlt(basename(source.path).replace(/\.[^.]+$/, ''))
    } catch (error) {
      toast.error('Could not add the image', error instanceof Error ? error.message : String(error))
    } finally {
      setImporting(false)
    }
  }

  if (pending) {
    return (
      <ImageEditor
        open
        source={pending.dataUrl}
        name={basename(pending.path)}
        originalBytes={pending.bytes}
        onCancel={() => setPending(null)}
        onApply={(result) => void applyProcessed(result)}
      />
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Insert image"
      icon={<ImageIcon size={17} />}
      size="sm"
      footer={
        <ModalActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!canSubmit} onClick={submit}>
            Insert
          </Button>
        </ModalActions>
      }
    >
      <Field
        label="Image"
        hint={
          documentDir
            ? 'Local images are copied next to the document and linked relatively.'
            : 'Save the document first to use relative image paths.'
        }
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Input
            data-autofocus
            value={src}
            placeholder="./images/diagram.png or https://…"
            monospace
            className="min-w-0 flex-1"
            onChange={(event) => setSrc(event.currentTarget.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
          />
          <Button loading={importing} onClick={() => void chooseFile()}>
            Browse…
          </Button>
        </div>
      </Field>

      <Field label="Alt text" hint="Describes the image for screen readers and when it fails to load.">
        <Input
          value={alt}
          placeholder="Architecture diagram"
          onChange={(event) => setAlt(event.currentTarget.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
      </Field>

      <Field label="Title">
        <Input
          value={title}
          placeholder="Optional"
          onChange={(event) => setTitle(event.currentTarget.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
      </Field>

      {src && isImagePath(src) ? (
        <div className="grid place-items-center rounded-md border border-line-subtle bg-inset p-2">
          <img
            src={resolvePreview(src, documentDir)}
            alt=""
            className="max-h-[150px] max-w-full rounded-sm"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        </div>
      ) : null}
    </Modal>
  )
}

function isImagePath(value: string): boolean {
  return IMAGE_EXTENSIONS.some((extension) => value.toLowerCase().includes(`.${extension}`))
}

function resolvePreview(src: string, documentDir: string | null): string {
  if (/^(https?:|data:)/i.test(src)) return src
  if (!documentDir) return src
  const absolute = src.startsWith('.')
    ? `${documentDir}/${src.replace(/^\.\//, '')}`
    : `${documentDir}/${src}`
  return fileService.assetUrl(absolute.replace(/\//g, '\\'))
}
