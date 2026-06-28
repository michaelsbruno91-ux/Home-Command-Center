import { useState } from 'react'
import { Plus, Edit2, Trash2, Phone, Mail, ChevronDown, ChevronUp, X } from 'lucide-react'

const ROLES = ['Waterproofing', 'Septic', 'Stucco Specialist', 'Home Inspector', 'Mortgage / Loan Officer', 'Roofing', 'HVAC', 'Plumber', 'Electrician', 'Landscaping', 'General Contractor', 'Other']

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-400/50'
const inputStyle = { background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }
const labelCls = 'block text-xs font-mono font-medium mb-1 text-muted'

function ContactModal({ contact, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(contact ?? {
    name: '', company: '', phone: '', email: '', role: 'General Contractor', notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            {contact ? 'Edit Contact' : 'Add Contact'}
          </h3>
          <button onClick={onClose}><X size={16} className="text-muted" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input className={inputCls} style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Company</label>
              <input className={inputCls} style={inputStyle} value={form.company} onChange={e => set('company', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select className={inputCls} style={inputStyle} value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" className={inputCls} style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} style={inputStyle} value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
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

function ContactCard({ contact, onEdit }) {
  const [notesOpen, setNotesOpen] = useState(false)

  return (
    <div className="rounded-2xl border p-4 card-hover"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--color-text)' }}>{contact.name}</h3>
          {contact.company && contact.company !== contact.name && (
            <p className="text-xs text-muted truncate">{contact.company}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {contact.role && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: 'var(--color-accent)' }}>
              {contact.role}
            </span>
          )}
          <button onClick={() => onEdit(contact)} className="text-muted hover:text-white transition-colors ml-1">
            <Edit2 size={12} />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {contact.phone && (
          <a href={`tel:${contact.phone}`}
            className="flex items-center gap-2 text-xs hover:text-white transition-colors group"
            style={{ color: 'var(--color-muted)' }}>
            <Phone size={11} className="group-hover:text-accent transition-colors" />
            <span className="font-mono">{contact.phone}</span>
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`}
            className="flex items-center gap-2 text-xs hover:text-white transition-colors group"
            style={{ color: 'var(--color-muted)' }}>
            <Mail size={11} className="group-hover:text-accent transition-colors" />
            <span className="font-mono truncate">{contact.email}</span>
          </a>
        )}
      </div>

      {contact.notes && (
        <div className="mt-2">
          <button onClick={() => setNotesOpen(v => !v)}
            className="flex items-center gap-1 text-[11px] font-mono transition-colors hover:text-white"
            style={{ color: 'var(--color-muted)' }}>
            {notesOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            Notes
          </button>
          {notesOpen && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {contact.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function ContactsView({ data, updateData }) {
  const [modal, setModal] = useState(null)

  const contacts = data?.contacts ?? []

  function handleSave(form) {
    if (modal === 'add') {
      updateData({ contacts: [...contacts, { ...form, id: crypto.randomUUID() }] })
    } else {
      updateData({ contacts: contacts.map(c => c.id === modal.id ? { ...modal, ...form } : c) })
    }
    setModal(null)
  }

  function handleDelete() {
    if (!confirm('Delete this contact?')) return
    updateData({ contacts: contacts.filter(c => c.id !== modal.id) })
    setModal(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-sm font-mono text-muted">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--color-accent)' }}>
          <Plus size={12} /> Add Contact
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
            <p className="text-sm">No contacts yet.</p>
            <button onClick={() => setModal('add')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--color-accent)' }}>
              <Plus size={14} /> Add Contact
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contacts.map(c => (
              <ContactCard key={c.id} contact={c} onEdit={setModal} />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ContactModal
          contact={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal !== 'add' ? handleDelete : undefined}
        />
      )}
    </div>
  )
}
