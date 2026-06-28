import { Loader2, Check, AlertTriangle, WifiOff } from 'lucide-react'

function timeSince(date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  return `${mins} min ago`
}

export default function SyncIndicator({ syncStatus, lastSaved, syncError, forceSync }) {
  if (syncStatus === 'idle') return null

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono">
      {syncStatus === 'syncing' && (
        <>
          <Loader2 size={12} className="text-accent animate-spin" />
          <span className="text-muted">Saving…</span>
        </>
      )}
      {syncStatus === 'saved' && lastSaved && (
        <>
          <Check size={12} className="text-emerald-400" />
          <span className="text-muted">Saved {timeSince(lastSaved)}</span>
        </>
      )}
      {syncStatus === 'error' && (
        <button
          onClick={forceSync}
          className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
          title={syncError}
        >
          <AlertTriangle size={12} />
          <span>Sync failed — retry</span>
        </button>
      )}
      {syncStatus === 'offline' && (
        <>
          <WifiOff size={12} className="text-amber-400" />
          <span className="text-amber-400">Offline — queued</span>
        </>
      )}
    </div>
  )
}
