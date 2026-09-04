import { useRef, useState } from 'react'
import { AlertCircle, Check, LoaderCircle, ScanLine, UploadCloud } from 'lucide-react'
import { api, ApiError } from '../api/client'
import { useAuth } from '../context/AuthContext'

function Notice({ tone = 'neutral', children }) {
  const styles = tone === 'error' ? 'bg-coral/10 text-coral' : tone === 'success' ? 'bg-leaf/10 text-leaf' : 'bg-saffron/12 text-ink/65'
  return <div className={`mt-5 rounded-xl p-4 text-sm font-semibold leading-6 ${styles}`}>{children}</div>
}

export default function LedgerWorkflow({ onDataChanged }) {
  const { token } = useAuth()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [uploadResult, setUploadResult] = useState(null)
  const [structureResult, setStructureResult] = useState(null)
  const [scoreResult, setScoreResult] = useState(null)

  function chooseFile(event) {
    const selected = event.target.files?.[0]
    setError('')
    setUploadResult(null)
    setStructureResult(null)
    setScoreResult(null)
    if (!selected) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setFile(null)
      setError('Choose a JPEG, PNG, or WebP image.')
      return
    }
    if (selected.size > 10 * 1024 * 1024) {
      setFile(null)
      setError('Image must be 10 MB or smaller.')
      return
    }
    setFile(selected)
  }

  async function uploadLedger() {
    if (!file) return
    setBusy('upload')
    setError('')
    try {
      const result = await api.upload(token, file)
      setUploadResult(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  async function structureLedger() {
    setBusy('structure')
    setError('')
    try {
      const result = await api.structure(token, uploadResult.ledger.id)
      setStructureResult(result)
      await onDataChanged()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  async function computeScore() {
    setBusy('score')
    setError('')
    try {
      const result = await api.score(token)
      setScoreResult(result)
      await onDataChanged()
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.data) {
        setScoreResult(requestError.data)
        if (requestError.data.score !== undefined) await onDataChanged()
      }
      setError(requestError.data?.reason || requestError.message)
    } finally {
      setBusy('')
    }
  }

  const ocrReady = uploadResult?.ocr.status !== 'skipped' && Boolean(uploadResult?.ledger.raw_ocr_text)
  const canScore = structureResult?.status === 'completed' || structureResult?.status === 'skipped'

  return (
    <section className="card overflow-hidden bg-saffron">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative overflow-hidden bg-saffron p-6 md:p-8">
          <div className="ledger-lines absolute inset-0 opacity-25" aria-hidden="true" />
          <div className="relative">
            <div className="section-kicker">New evidence</div>
            <h2 className="mt-3 max-w-sm font-display text-4xl leading-tight">Turn one ledger page into financial proof.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-ink/65">Photograph the whole page in good light. We preserve uncertain entries instead of hiding them.</p>

            <input ref={inputRef} className="sr-only" type="file" name="image" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} />
            <button type="button" className="upload-drop mt-7 w-full" onClick={() => inputRef.current?.click()}>
              <UploadCloud size={28} />
              <span className="mt-3 font-bold">{file ? file.name : 'Choose a ledger image'}</span>
              <span className="mt-1 text-xs text-ink/50">JPEG, PNG, or WebP · max 10 MB</span>
            </button>
            <button type="button" className="primary-button mt-4 w-full" disabled={!file || Boolean(busy)} onClick={uploadLedger}>
              {busy === 'upload' ? <><LoaderCircle className="animate-spin" size={17} /> Uploading & reading…</> : <><ScanLine size={17} /> Upload & run OCR</>}
            </button>
            {busy === 'upload' && <div className="progress-track mt-3"><div className="progress-bar" /></div>}
          </div>
        </div>

        <div className="bg-cream p-6 md:p-8">
          <div className="section-kicker">Processing desk</div>
          <div className="mt-6 space-y-4">
            <ProcessStep number="01" title="Capture & OCR" active={busy === 'upload'} complete={Boolean(uploadResult)}>
              {uploadResult ? (
                <div className="mt-2 text-xs leading-5 text-ink/55">
                  <p>{uploadResult.message}</p>
                  <p><strong className="text-ink">Storage:</strong> {uploadResult.storage_mode}</p>
                  <p><strong className="text-ink">OCR:</strong> {uploadResult.ocr.status}</p>
                  {uploadResult.ocr.reason && <p>{uploadResult.ocr.reason}</p>}
                  {uploadResult.ledger.raw_ocr_text && (
                    <details className="mt-2 rounded-lg bg-white/45 p-2">
                      <summary className="cursor-pointer font-bold text-leaf">View extracted text</summary>
                      <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap font-sans text-[11px]">{uploadResult.ledger.raw_ocr_text}</pre>
                    </details>
                  )}
                </div>
              ) : <p className="mt-1 text-xs text-ink/45">Waiting for an image.</p>}
            </ProcessStep>

            <ProcessStep number="02" title="Structure transactions" active={busy === 'structure'} complete={structureResult?.status === 'completed'}>
              {uploadResult && !ocrReady ? (
                <p className="mt-1 text-xs font-semibold text-coral">OCR skipped: API key not configured. No text is available to structure.</p>
              ) : structureResult ? (
                <p className="mt-1 text-xs text-ink/55">{structureResult.status === 'skipped' ? structureResult.message : `${structureResult.count} transactions created.`}</p>
              ) : (
                <button type="button" className="text-button mt-2" disabled={!ocrReady || Boolean(busy)} onClick={structureLedger}>Process ledger</button>
              )}
              {structureResult?.warnings?.length > 0 && <p className="mt-2 text-xs font-bold text-saffron-dark">{structureResult.warnings.length} uncertain or adjusted {structureResult.warnings.length === 1 ? 'entry' : 'entries'} flagged.</p>}
            </ProcessStep>

            <ProcessStep number="03" title="Compute transparent score" active={busy === 'score'} complete={scoreResult?.score !== undefined}>
              {scoreResult ? (
                <p className="mt-1 text-xs leading-5 text-ink/55">{scoreResult.message}{scoreResult.transaction_count !== undefined && ` (${scoreResult.transaction_count}/${scoreResult.minimum_transactions} transactions)`}</p>
              ) : (
                <button type="button" className="text-button mt-2" disabled={!canScore || Boolean(busy)} onClick={computeScore}>Compute score</button>
              )}
            </ProcessStep>
          </div>
          {error && <Notice tone="error"><span className="flex items-start gap-2"><AlertCircle className="mt-0.5 shrink-0" size={17} />{error}</span></Notice>}
          {scoreResult?.score !== undefined && <Notice tone="success">Score {scoreResult.score}/100 saved. {scoreResult.explanation?.status === 'skipped' && 'Urdu explanation was skipped because the API key is not configured.'}</Notice>}
        </div>
      </div>
    </section>
  )
}

function ProcessStep({ number, title, active, complete, children }) {
  return (
    <div className="flex gap-4 border-b border-ink/10 pb-4 last:border-0">
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${complete ? 'bg-leaf text-white' : active ? 'bg-ink text-saffron' : 'border border-ink/15 text-ink/40'}`}>
        {complete ? <Check size={16} /> : active ? <LoaderCircle className="animate-spin" size={16} /> : number}
      </div>
      <div className="min-w-0 pt-1"><h3 className="text-sm font-bold">{title}</h3>{children}</div>
    </div>
  )
}
