import { useState } from 'react'
import { Plus, ExternalLink, Edit2, Trash2, X, FileText } from 'lucide-react'
import { formatDate } from '../utils/tasks'

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-400/50'
const inputStyle = { background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }
const labelCls = 'block text-xs font-mono font-medium mb-1 text-muted'

function DocModal({ doc, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(doc ?? { name: '', date: '', url: '', notes: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            {doc ? 'Edit Document' : 'Add Document'}
          </h3>
          <button onClick={onClose}><X size={16} className="text-muted" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className={labelCls}>Document Name *</label>
            <input className={inputCls} style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" className={inputCls} style={inputStyle} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>URL (link to document)</label>
            <input type="url" placeholder="https://…" className={inputCls} style={inputStyle} value={form.url} onChange={e => set('url', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={3} className={inputCls} style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            {onDelete && (
              <button onClick={onDelete} className="px-3 py-2 rounded-lg text-sm text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
                Delete
              </button>
            )}
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm border hover:bg-white/5 transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
            <button onClick={() => form.name.trim() && onSave(form)}
              className="flex-1 py-2 rounded-lg text-sm font-bold"
              style={{ background: 'var(--color-accent)', color: '#000' }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DocumentsView({ data, updateData }) {
  const [modal, setModal] = useState(null)

  const documents = data?.documents ?? []

  function handleSave(form) {
    if (modal === 'add') {
      updateData({ documents: [...documents, { ...form, id: crypto.randomUUID() }] })
    } else {
      updateData({ documents: documents.map(d => d.id === modal.id ? { ...modal, ...form } : d) })
    }
    setModal(null)
  }

  function handleDelete() {
    if (!confirm('Delete this document?')) return
    updateData({ documents: documents.filter(d => d.id !== modal.id) })
    setModal(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-sm font-mono text-muted">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--color-accent)' }}>
          <Plus size={12} /> Add Document
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
            <FileText size={32} className="opacity-30" />
            <p className="text-sm">No documents yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id}
                className="flex items-start gap-3 p-4 rounded-2xl border card-hover"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <FileText size={16} className="text-muted flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{doc.name}</span>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 text-muted hover:text-accent transition-colors" onClick={e => e.stopPropagation()}>
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                  {doc.date && (
                    <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
                      {formatDate(doc.date)}
                    </div>
                  )}
                  {doc.notes && (
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                      {doc.notes}
                    </p>
                  )}
                </div>
                <button onClick={() => setModal(doc)} className="flex-shrink-0 text-muted hover:text-white transition-colors mt-0.5">
                  <Edit2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <DocModal
          doc={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal !== 'add' ? handleDelete : undefined}
        />
      )}
    </div>
  )
}
