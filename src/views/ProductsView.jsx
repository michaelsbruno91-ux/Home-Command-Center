import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Search } from 'lucide-react'

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-400/50'
const inputStyle = { background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }
const labelCls = 'block text-xs font-mono font-medium mb-1 text-muted'

function ProductModal({ product, systems, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(product ?? {
    systemId: systems[0]?.id ?? '', productName: '', brand: '', whereToBuy: '', notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            {product ? 'Edit Product' : 'Add Product'}
          </h3>
          <button onClick={onClose}><X size={16} className="text-muted" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className={labelCls}>System *</label>
            <select className={inputCls} style={inputStyle} value={form.systemId} onChange={e => set('systemId', e.target.value)}>
              {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Product Name *</label>
            <input className={inputCls} style={inputStyle} value={form.productName} onChange={e => set('productName', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Brand</label>
            <input className={inputCls} style={inputStyle} value={form.brand} onChange={e => set('brand', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Where to Buy</label>
            <input className={inputCls} style={inputStyle} value={form.whereToBuy} onChange={e => set('whereToBuy', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className={inputCls} style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            {onDelete && (
              <button onClick={onDelete} className="px-3 py-2 rounded-lg text-sm text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
                Delete
              </button>
            )}
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm border hover:bg-white/5 transition-colors"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
            <button onClick={() => form.productName.trim() && form.systemId && onSave(form)}
              className="flex-1 py-2 rounded-lg text-sm font-bold"
              style={{ background: 'var(--color-accent)', color: '#000' }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductsView({ data, updateData }) {
  const [modal, setModal] = useState(null)
  const [filterSystem, setFilterSystem] = useState('')
  const [search, setSearch] = useState('')

  const systems = data?.systems ?? []
  const products = data?.products ?? []

  const filtered = products.filter(p => {
    const sys = systems.find(s => s.id === p.systemId)
    if (filterSystem && p.systemId !== filterSystem) return false
    if (search) {
      const q = search.toLowerCase()
      return p.productName?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || sys?.name.toLowerCase().includes(q)
    }
    return true
  })

  function handleSave(form) {
    if (modal === 'add') {
      updateData({ products: [...products, { ...form, id: crypto.randomUUID() }] })
    } else {
      updateData({ products: products.map(p => p.id === modal.id ? { ...modal, ...form } : p) })
    }
    setModal(null)
  }

  function handleDelete() {
    if (!confirm('Delete this product?')) return
    updateData({ products: products.filter(p => p.id !== modal.id) })
    setModal(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search size={14} className="text-muted flex-shrink-0" />
          <input
            type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted min-w-0"
            style={{ color: 'var(--color-text)' }}
          />
        </div>
        <select value={filterSystem} onChange={e => setFilterSystem(e.target.value)}
          className="text-xs font-mono rounded-lg px-3 py-1.5 outline-none"
          style={{ background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
          <option value="">All Systems</option>
          {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--color-accent)' }}>
          <Plus size={12} /> Add Product
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
            <p className="text-sm">No products added yet — add the first one.</p>
            <button onClick={() => setModal('add')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--color-accent)' }}>
              <Plus size={14} /> Add Product
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted">No results</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0" style={{ background: 'var(--color-bg)' }}>
              <tr className="border-b text-left" style={{ borderColor: 'var(--color-border)' }}>
                {['System', 'Product Name', 'Brand', 'Where to Buy', 'Notes', ''].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-xs font-mono font-medium text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {filtered.map(p => {
                const sys = systems.find(s => s.id === p.systemId)
                return (
                  <tr key={p.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted font-mono">{sys?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--color-text)' }}>{p.productName}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">{p.brand || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">{p.whereToBuy || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted max-w-xs truncate">{p.notes || '—'}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setModal(p)}
                        className="text-muted hover:text-white transition-colors"><Edit2 size={12} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ProductModal
          product={modal === 'add' ? null : modal}
          systems={systems}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onDelete={modal !== 'add' ? handleDelete : undefined}
        />
      )}
    </div>
  )
}
