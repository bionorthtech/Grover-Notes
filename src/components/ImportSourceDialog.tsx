import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { detectAndTransform, sourceTypeLabel, type DetectErrorCode, type SourceNote } from '../lib/ingest'
import { fetchAndDetect } from '../lib/ingest/fetchUrl'
import { translate, DEFAULT_APP_LOCALE, type AppLocale, type TranslationKey } from '../lib/i18n'

interface ImportSourceDialogProps {
  open: boolean
  onImport: (note: SourceNote) => void
  onCancel: () => void
  locale?: AppLocale
}

const ERROR_KEYS: Record<DetectErrorCode, TranslationKey> = {
  empty: 'ingest.error.empty',
  'not-json-or-html': 'ingest.error.notJsonOrHtml',
  unrecognized: 'ingest.error.unrecognized',
  'not-http-url': 'ingest.error.notHttpUrl',
  'fetch-failed': 'ingest.error.fetchFailed',
}

function SourcePreview({ note, locale }: { note: SourceNote; locale: AppLocale }) {
  const assetCount = note.assets.length
  const lineCount = note.body.split('\n').length
  const assets = translate(locale, 'ingest.assetCount', { count: assetCount, plural: assetCount === 1 ? '' : 's' })
  const lines = translate(locale, 'ingest.lineCount', { count: lineCount, plural: lineCount === 1 ? '' : 's' })
  return (
    <div className="rounded-lg border border-border bg-[var(--surface-sidebar)] p-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{sourceTypeLabel(note.source)}</span>
        <span className="truncate font-medium text-foreground">{note.title}</span>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">{assets} · {lines}</p>
    </div>
  )
}

type BodyProps = Omit<ImportSourceDialogProps, 'open' | 'locale'> & { locale: AppLocale }

function ImportSourceBody({ onImport, onCancel, locale }: BodyProps) {
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchedNote, setFetchedNote] = useState<SourceNote | null>(null)

  const pasteResult = useMemo(() => (text.trim() ? detectAndTransform(text) : null), [text])
  const note = fetchedNote ?? (pasteResult?.ok ? pasteResult.note : null)
  const t = (key: TranslationKey, values?: Record<string, string | number>) => translate(locale, key, values)
  const errorText = (code: DetectErrorCode, detail?: string) => translate(locale, ERROR_KEYS[code], { detail: detail ?? '' })

  async function handleFetch() {
    if (!url.trim() || fetching) return
    setFetching(true)
    setFetchError(null)
    setFetchedNote(null)
    const result = await fetchAndDetect(url)
    if (result.ok) {
      setFetchedNote(result.note)
    } else {
      setFetchError(errorText(result.code, result.detail))
    }
    setFetching(false)
  }

  return (
    <DialogContent className="sm:max-w-[620px]" data-testid="import-source-dialog">
      <DialogHeader>
        <DialogTitle>{t('ingest.title')}</DialogTitle>
        <DialogDescription>{t('ingest.description')}</DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-2">
        <Input
          value={url}
          onChange={(event) => { setUrl(event.target.value); setFetchedNote(null); setFetchError(null) }}
          onKeyDown={(event) => { if (event.key === 'Enter') void handleFetch() }}
          spellCheck={false}
          placeholder="https://www.reddit.com/r/…/comments/…"
          className="text-sm"
        />
        <Button variant="secondary" onClick={() => void handleFetch()} disabled={!url.trim() || fetching}>
          {fetching ? t('ingest.fetching') : t('ingest.fetch')}
        </Button>
      </div>

      {fetchError && <p className="text-xs text-[var(--accent-red)]">{fetchError}</p>}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t('ingest.orPasteContent')}
        <span className="h-px flex-1 bg-border" />
      </div>

      <Textarea
        value={text}
        onChange={(event) => { setText(event.target.value); setFetchedNote(null) }}
        spellCheck={false}
        placeholder={t('ingest.pastePlaceholder')}
        className="min-h-[120px] resize-none font-mono text-xs"
      />

      {!fetchedNote && pasteResult && !pasteResult.ok && (
        <p className="text-xs text-[var(--accent-red)]">{errorText(pasteResult.code, pasteResult.detail)}</p>
      )}

      {note && <SourcePreview note={note} locale={locale} />}

      <DialogFooter className="flex-row items-center justify-end gap-2 sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button onClick={() => note && onImport(note)} disabled={!note}>{t('ingest.importNote')}</Button>
      </DialogFooter>
    </DialogContent>
  )
}

/** Paste- or fetch-to-import: turns external Reddit/forum/web data into a typed Source note. */
export function ImportSourceDialog({ open, onImport, onCancel, locale = DEFAULT_APP_LOCALE }: ImportSourceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      {open && <ImportSourceBody onImport={onImport} onCancel={onCancel} locale={locale} />}
    </Dialog>
  )
}
