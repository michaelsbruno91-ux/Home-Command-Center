import { useState } from 'react'
import { Settings, CheckCircle, AlertCircle, Loader2, Download, Upload, Unlink, TestTube } from 'lucide-react'
import { testConnection } from '../hooks/useGitHubData'

const KEYS = { PAT: 'hcc_pat', OWNER: 'hcc_owner', REPO: 'hcc_repo', PATH: 'hcc_path' }

export default function SettingsView({ embedded = false, onConnect, onDisconnect, data, updateData }) {
  const [pat, setPat] = useState('')
  const [owner, setOwner] = useState(localStorage.getItem(KEYS.OWNER) || 'michaelsbruno91-ux')
  const [repo, setRepo] = useState(localStorage.getItem(KEYS.REPO) || 'home-data')
  const [path, setPath] = useState(localStorage.getItem(KEYS.PATH) || 'data/home.json')
  const [status, setStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [message, setMessage] = useState('')

  const isConnected = !!localStorage.getItem(KEYS.PAT)

  async function handleConnect() {
    if (!pat.trim()) { setStatus('error'); setMessage('PAT is required'); return }
    setStatus('loading')
    setMessage('')
    try {
      await testConnection(pat.trim(), owner.trim(), repo.trim(), path.trim())
      localStorage.setItem(KEYS.PAT, pat.trim())
      localStorage.setItem(KEYS.OWNER, owner.trim())
      localStorage.setItem(KEYS.REPO, repo.trim())
      localStorage.setItem(KEYS.PATH, path.trim())
      setStatus('ok')
      setMessage('Connected! Loading your data…')
      setTimeout(() => onConnect?.(), 800)
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  async function handleTest() {
    if (!pat.trim()) { setStatus('error'); setMessage('Enter a PAT to test'); return }
    setStatus('loading')
    setMessage('')
    try {
      await testConnection(pat.trim(), owner.trim(), repo.trim(), path.trim())
      setStatus('ok')
      setMessage('Connection successful — data file found.')
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  function handleExport() {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `home-command-center-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        if (!imported.systems && !imported.improvements) {
          alert('Invalid backup file — missing expected fields.')
          return
        }
        if (confirm('Replace all current data with imported file? (Cancel to merge instead)')) {
          updateData(imported)
        } else {
          updateData({
            systems: [...(data?.systems ?? []), ...(imported.systems ?? [])],
            improvements: [...(data?.improvements ?? []), ...(imported.improvements ?? [])],
            contacts: [...(data?.contacts ?? []), ...(imported.contacts ?? [])],
            products: [...(data?.products ?? []), ...(imported.products ?? [])],
            documents: [...(data?.documents ?? []), ...(imported.documents ?? [])],
          })
        }
        alert('Import complete!')
      } catch {
        alert('Failed to parse JSON file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const cardCls = 'rounded-2xl p-6 mb-4 border'
  const cardStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }
  const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 font-mono'
  const inputStyle = { background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }
  const labelCls = 'block text-xs font-mono font-medium mb-1'

  // Full-screen onboarding (not embedded)
  if (!embedded) {
    return (
      <div className="min-h-full flex items-center justify-center p-6"
        style={{ background: 'var(--color-bg)' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid var(--color-accent)' }}>
              <Settings size={28} style={{ color: 'var(--color-accent)' }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
              Home Command Center
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
              Connect your GitHub data repository to get started.
            </p>
          </div>

          <div className={cardCls} style={cardStyle}>
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>
              GitHub Connection
            </h2>

            <div className="space-y-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--color-muted)' }}>
                  Personal Access Token *
                </label>
                <input
                  type="password"
                  value={pat}
                  onChange={e => setPat(e.target.value)}
                  placeholder="ghp_…"
                  className={inputCls}
                  style={inputStyle}
                  autoComplete="off"
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-muted)' }}>
                  Needs <code>repo</code> scope. Never stored anywhere but this browser.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} style={{ color: 'var(--color-muted)' }}>Owner</label>
                  <input type="text" value={owner} onChange={e => setOwner(e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className={labelCls} style={{ color: 'var(--color-muted)' }}>Repository</label>
                  <input type="text" value={repo} onChange={e => setRepo(e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
              </div>

              <div>
                <label className={labelCls} style={{ color: 'var(--color-muted)' }}>Data file path</label>
                <input type="text" value={path} onChange={e => setPath(e.target.value)}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>

            {status && (
              <div className={`mt-3 flex items-start gap-2 text-sm rounded-lg p-3 ${
                status === 'ok' ? 'text-emerald-400 bg-emerald-400/10' :
                status === 'error' ? 'text-red-400 bg-red-400/10' :
                'text-muted bg-white/5'
              }`}>
                {status === 'loading' && <Loader2 size={14} className="animate-spin mt-0.5 flex-shrink-0" />}
                {status === 'ok' && <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />}
                {status === 'error' && <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
                <span>{message}</span>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleTest}
                disabled={status === 'loading'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
              >
                <TestTube size={14} />
                Test
              </button>
              <button
                onClick={handleConnect}
                disabled={status === 'loading'}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition-colors"
                style={{ background: 'var(--color-accent)', color: '#000' }}
              >
                {status === 'loading'
                  ? <><Loader2 size={14} className="animate-spin" /> Connecting…</>
                  : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Embedded settings page
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-6 tracking-tight" style={{ color: 'var(--color-text)' }}>
        Settings
      </h2>

      {/* Connection status */}
      <div className={cardCls} style={cardStyle}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>GitHub Connection</h3>
          {isConnected
            ? <span className="text-xs font-mono text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Connected</span>
            : <span className="text-xs font-mono text-red-400 flex items-center gap-1"><AlertCircle size={12} /> Disconnected</span>}
        </div>

        {isConnected ? (
          <div className="space-y-2 text-xs font-mono text-muted">
            <div>Owner: {localStorage.getItem(KEYS.OWNER)}</div>
            <div>Repo: {localStorage.getItem(KEYS.REPO)}</div>
            <div>Path: {localStorage.getItem(KEYS.PATH)}</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className={labelCls} style={{ color: 'var(--color-muted)' }}>Personal Access Token</label>
              <input type="password" value={pat} onChange={e => setPat(e.target.value)}
                placeholder="ghp_…" className={inputCls} style={inputStyle} autoComplete="off" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} style={{ color: 'var(--color-muted)' }}>Owner</label>
                <input type="text" value={owner} onChange={e => setOwner(e.target.value)}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className={labelCls} style={{ color: 'var(--color-muted)' }}>Repository</label>
                <input type="text" value={repo} onChange={e => setRepo(e.target.value)}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
            <button onClick={handleConnect} disabled={status === 'loading'}
              className="w-full py-2 rounded-lg text-sm font-bold"
              style={{ background: 'var(--color-accent)', color: '#000' }}>
              {status === 'loading' ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        )}

        {isConnected && (
          <button
            onClick={() => { if (confirm('Disconnect and clear all local data?')) onDisconnect?.() }}
            className="mt-4 flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <Unlink size={14} />
            Disconnect
          </button>
        )}

        {status && (
          <div className={`mt-3 flex items-start gap-2 text-sm rounded-lg p-3 ${
            status === 'ok' ? 'text-emerald-400 bg-emerald-400/10' :
            status === 'error' ? 'text-red-400 bg-red-400/10' : 'text-muted'
          }`}>
            {status === 'ok' && <CheckCircle size={14} className="mt-0.5" />}
            {status === 'error' && <AlertCircle size={14} className="mt-0.5" />}
            {status === 'loading' && <Loader2 size={14} className="animate-spin mt-0.5" />}
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Data management */}
      <div className={cardCls} style={cardStyle}>
        <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--color-text)' }}>Data Management</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExport}
            disabled={!data}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-white/5 disabled:opacity-40"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Download size={14} />
            Export all data as JSON
          </button>
          <label
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-white/5 cursor-pointer"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Upload size={14} />
            Import from JSON file
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* About */}
      <div className={cardCls} style={cardStyle}>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text)' }}>About</h3>
        <p className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
          11 Wilson Way, Raritan Township, NJ 08551<br />
          Home Command Center — data stored in your private GitHub repo
        </p>
      </div>
    </div>
  )
}
