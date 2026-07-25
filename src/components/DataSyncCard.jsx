import { useState } from 'react'
import { DownloadCloud, RefreshCw, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { testConnection, writeDataFile, KEYS, ENV_KEY, DATA_PATHS } from '../hooks/useGitHubData'
import { ingestNew, syncMetadata, summaryText } from '../utils/envSync'
import { getActivePat } from '../utils/vault'

const LOWER_ENVS = ['sandbox', 'develop', 'preprod']

const EMPTY_DATA = { systems: [], improvements: [], contacts: [], products: [], documents: [] }

export default function DataSyncCard({ data, updateData }) {
  const [syncAll, setSyncAll] = useState(false)
  const [confirming, setConfirming] = useState(null) // null | 'ingest' | 'metadata'
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // null | 'ok' | 'error'
  const [message, setMessage] = useState('')

  async function run(mode) {
    setConfirming(null)
    setBusy(true)
    setStatus(null)
    setMessage('')
    const pat = getActivePat()
    const owner = localStorage.getItem(KEYS.OWNER) || 'michaelsbruno91-ux'
    const repo = localStorage.getItem(KEYS.REPO) || 'home-data'
    const applyMerge = mode === 'ingest' ? ingestNew : syncMetadata
    try {
      const prodFile = await testConnection(pat, owner, repo, DATA_PATHS.production)
      if (!prodFile.exists || !prodFile.data) throw new Error('Production data file not found')
      const prod = prodFile.data

      const lines = []
      const targets = syncAll ? LOWER_ENVS : [ENV_KEY]
      for (const env of targets) {
        if (env === ENV_KEY) {
          const { merged, summary } = applyMerge(data ?? EMPTY_DATA, prod)
          updateData(merged)
          lines.push(`${env}: ${summaryText(mode, summary)}`)
        } else {
          const path = DATA_PATHS[env]
          const envFile = await testConnection(pat, owner, repo, path)
          const { merged, summary } = applyMerge(envFile.data ?? EMPTY_DATA, prod)
          await writeDataFile(pat, owner, repo, path, merged, envFile.sha,
            `Sync ${mode === 'ingest' ? 'new items' : 'metadata'} from production — ${new Date().toISOString()}`)
          lines.push(`${env}: ${summaryText(mode, summary)}`)
        }
      }
      setStatus('ok')
      setMessage(lines.join(' '))
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    } finally {
      setBusy(false)
      setSyncAll(false)
    }
  }

  const btnCls = 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-white/5 disabled:opacity-40'
  const btnStyle = { borderColor: 'var(--color-border)', color: 'var(--color-text)' }

  return (
    <div className="rounded-2xl p-6 mb-4 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--color-text)' }}>Data Sync from Production</h3>
      <p className="text-xs font-mono mb-4" style={{ color: 'var(--color-muted)' }}>
        Ingest pulls items that exist in Prod but not here. Sync Metadata updates matching items with Prod's latest statuses and details. Nothing is ever deleted.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <button onClick={() => setConfirming('ingest')} disabled={busy} className={btnCls} style={btnStyle}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
          Ingest New from Prod
        </button>
        <button onClick={() => setConfirming('metadata')} disabled={busy} className={btnCls} style={btnStyle}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync Metadata from Prod
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs font-mono cursor-pointer select-none" style={{ color: 'var(--color-muted)' }}>
        <input
          type="checkbox"
          checked={syncAll}
          onChange={e => setSyncAll(e.target.checked)}
          disabled={busy}
          className="accent-amber-400"
        />
        Sync all Env (sandbox, develop, preprod)
      </label>

      {status && (
        <div className={`mt-3 flex items-start gap-2 text-sm rounded-lg p-3 ${
          status === 'ok' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
        }`}>
          {status === 'ok' ? <CheckCircle size={14} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
          <span className="font-mono text-xs">{message}</span>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>
              {confirming === 'ingest' ? 'Ingest new data' : 'Sync metadata'}
            </h4>
            <p className="text-sm mb-5" style={{ color: 'var(--color-muted)' }}>
              {syncAll
                ? 'Are you sure you want to sync data across all environments?'
                : `Are you sure you want to ${confirming === 'ingest' ? 'ingest new items' : 'sync metadata'} from Production into this environment?`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setConfirming(null); setSyncAll(false) }}
                className="px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
              >
                No
              </button>
              <button
                onClick={() => run(confirming)}
                className="px-4 py-2 rounded-lg text-sm font-bold"
                style={{ background: 'var(--color-accent)', color: '#000' }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
