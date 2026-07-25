import { useState } from 'react'
import { X, ClipboardPaste, ArrowLeft, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react'
import { parseBulkText, applyBulkItems, FORMAT_GUIDE } from '../utils/bulkParse'

const COLLECTION_LABELS = {
  improvements: 'Improvement', tasks: 'Task', contacts: 'Contact', products: 'Product', documents: 'Document',
}

const COLLECTION_COLORS = {
  improvements: 'bg-blue-400/20 text-blue-400',
  tasks: 'bg-amber-400/20 text-amber-400',
  contacts: 'bg-emerald-400/20 text-emerald-400',
  products: 'bg-purple-400/20 text-purple-400',
  documents: 'bg-slate-400/20 text-slate-300',
}

export default function BulkAddModal({ data, updateData, onClose }) {
  const [text, setText] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [preview, setPreview] = useState(null) // null | {items, errors}

  function handlePreview() {
    setPreview(parseBulkText(text, data))
  }

  function handleConfirm() {
    const { payload, counts } = applyBulkItems(preview.items, data)
    updateData(payload)
    const parts = Object.entries(counts).map(([k, n]) => `${n} ${k}`)
    onClose(`Added ${parts.join(', ')}.`)
  }

  const fieldSummary = (it) =>
    Object.entries(it.fields)
      .filter(([k]) => k !== 'systemName')
      .map(([k, v]) => `${k}: ${v}`).join(' · ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <ClipboardPaste size={15} style={{ color: 'var(--color-accent)' }} />
            Bulk Add {preview && '— Preview'}
          </h3>
          <button onClick={() => onClose()} style={{ color: 'var(--color-muted)' }}><X size={18} /></button>
        </div>

        {!preview ? (
          <div className="p-5 flex-1 overflow-y-auto">
            <p className="text-xs font-mono mb-3" style={{ color: 'var(--color-muted)' }}>
              Paste multiple items at once. Start a section with <code>​# Improvements</code>, <code>​# Contacts</code>, <code>​# Products</code>, <code>​# Documents</code>, or <code>​# Tasks: SystemName</code>. First line of each item is its name; add <code>field: value</code> lines under it; blank line between items.
            </p>
            <button
              onClick={() => setShowGuide(v => !v)}
              className="flex items-center gap-1.5 text-xs font-mono mb-3"
              style={{ color: 'var(--color-accent)' }}
            >
              <HelpCircle size={12} /> {showGuide ? 'Hide example' : 'Show example'}
            </button>
            {showGuide && (
              <pre className="text-[11px] font-mono rounded-lg p-3 mb-3 overflow-x-auto whitespace-pre"
                style={{ background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
                {FORMAT_GUIDE}
              </pre>
            )}
            <textarea
              rows={12}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={'# Improvements\nDriveway repavement\npriority: HIGH\n…'}
              className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-amber-400/50"
              style={{ background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
          </div>
        ) : (
          <div className="p-5 flex-1 overflow-y-auto">
            {preview.errors.length > 0 && (
              <div className="mb-3 rounded-lg p-3 text-xs font-mono text-red-400 bg-red-400/10 space-y-1">
                {preview.errors.map((e, i) => <div key={i} className="flex gap-1.5"><AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />{e}</div>)}
              </div>
            )}
            {preview.items.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Nothing parseable found.</p>
            ) : (
              <div className="space-y-2">
                {preview.items.map((it, i) => (
                  <div key={i} className="rounded-lg p-3 border" style={{ borderColor: 'var(--color-border)', background: '#0d1525' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${COLLECTION_COLORS[it.collection]}`}>
                        {COLLECTION_LABELS[it.collection]}{it.systemName ? ` · ${it.systemName}` : ''}
                      </span>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{it.name}</span>
                    </div>
                    {fieldSummary(it) && (
                      <div className="text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>{fieldSummary(it)}</div>
                    )}
                    {it.warnings.map((w, j) => (
                      <div key={j} className="text-[11px] font-mono text-amber-400 flex gap-1 mt-1">
                        <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />{w}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 px-5 py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          {!preview ? (
            <button
              onClick={handlePreview}
              disabled={!text.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
              style={{ background: 'var(--color-accent)', color: '#000' }}
            >
              Preview
            </button>
          ) : (
            <>
              <button
                onClick={() => setPreview(null)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={preview.items.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold disabled:opacity-40"
                style={{ background: 'var(--color-accent)', color: '#000' }}
              >
                <CheckCircle size={14} />
                Add {preview.items.length} item{preview.items.length === 1 ? '' : 's'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
