// Template-based bulk ingestion of pasted text.
//
// Format:
//   # Improvements            ← section header picks the collection
//   Driveway repavement       ← first line of a block is the name
//   priority: HIGH            ← subsequent "field: value" lines
//   cost: $8,000-12,000
//                             ← blank line starts the next item
//   Fence repair
//
//   # Tasks: Roofing          ← tasks need their system named in the header
//   Clean gutters
//   frequency: Semi-annual
//
// Sections: Improvements, Contacts, Products, Documents, Tasks: <System>.
// Field names are case-insensitive with common aliases (cost → estimatedCost).
// Enum values are coerced case-insensitively; unrecognized values fall back to
// a default and surface as warnings rather than failing the whole paste.
// Designed so a freeform AI-parsing mode can slot in later behind the same
// preview/confirm contract: parse → {items, errors} → applyBulkItems.

import { FREQ_DAYS, calculateNextDue, calculateTaskStatus } from './tasks'
import { IMPROVEMENT_STATUSES, PRIORITIES, FUNDING, CATEGORIES } from './vocab'

const FREQUENCIES = [...Object.keys(FREQ_DAYS), 'One-time', 'As needed', 'Ongoing']

const norm = (s) => (s ?? '').trim().toLowerCase()

const SECTION_ALIASES = {
  improvement: 'improvements', improvements: 'improvements',
  contact: 'contacts', contacts: 'contacts',
  product: 'products', products: 'products',
  document: 'documents', documents: 'documents', doc: 'documents', docs: 'documents',
  task: 'tasks', tasks: 'tasks', maintenance: 'tasks',
}

// alias → canonical field, per collection
const FIELD_ALIASES = {
  improvements: {
    description: 'description', desc: 'description',
    category: 'category', priority: 'priority', status: 'status',
    cost: 'estimatedCost', 'estimated cost': 'estimatedCost',
    timeline: 'estimatedTimeline', 'estimated timeline': 'estimatedTimeline',
    funding: 'fundingSource', 'funding source': 'fundingSource',
    notes: 'notes',
  },
  tasks: {
    frequency: 'frequency', freq: 'frequency',
    priority: 'priority',
    'last completed': 'lastCompleted', lastcompleted: 'lastCompleted', completed: 'lastCompleted',
    'next due': 'nextDue', nextdue: 'nextDue', due: 'nextDue',
    cost: 'estimatedCost', 'estimated cost': 'estimatedCost',
    notes: 'notes',
  },
  contacts: {
    company: 'company', phone: 'phone', email: 'email', role: 'role', notes: 'notes',
  },
  products: {
    system: 'systemName', brand: 'brand',
    'where to buy': 'whereToBuy', where: 'whereToBuy', store: 'whereToBuy',
    notes: 'notes',
  },
  documents: {
    date: 'date', url: 'url', link: 'url', notes: 'notes',
  },
}

const NAME_FIELD = {
  improvements: 'name', tasks: 'task', contacts: 'name', products: 'productName', documents: 'name',
}

function coerceEnum(value, options, fallback, field, warnings) {
  const hit = options.find(o => norm(o) === norm(value))
  if (hit) return hit
  warnings.push(`Unknown ${field} "${value}" — using "${fallback}"`)
  return fallback
}

function coerceDate(value, field, warnings) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim()
  const d = new Date(value)
  if (!isNaN(d)) return d.toISOString().split('T')[0]
  warnings.push(`Could not read ${field} date "${value}" — left empty`)
  return null
}

function parseHeader(text, systems) {
  const idx = text.indexOf(':')
  const head = idx === -1 ? text : text.slice(0, idx)
  const collection = SECTION_ALIASES[norm(head)]
  if (!collection) return { error: `Unknown section "${text}" — expected Improvements, Contacts, Products, Documents, or Tasks: <System>` }
  if (collection !== 'tasks') return { collection }
  const systemName = idx === -1 ? '' : text.slice(idx + 1).trim()
  if (!systemName) return { error: `Tasks section needs a system: "# Tasks: Roofing"` }
  const system = systems.find(s => norm(s.name) === norm(systemName))
  if (!system) return { error: `Tasks section: no system named "${systemName}" exists` }
  return { collection, systemId: system.id, systemName: system.name }
}

export function parseBulkText(text, data) {
  const systems = data?.systems ?? []
  const items = []
  const errors = []
  let section = null

  const finishBlock = (blockLines, startLine) => {
    if (!blockLines.length) return
    if (!section) {
      errors.push(`Line ${startLine}: item before any section header — start with e.g. "# Improvements"`)
      return
    }
    if (section.error) {
      errors.push(`Line ${startLine}: skipped — ${section.error}`)
      return
    }
    const { collection, systemId, systemName } = section
    const warnings = []
    const fields = {}
    const name = blockLines[0].trim()
    for (const raw of blockLines.slice(1)) {
      const m = raw.match(/^([A-Za-z][A-Za-z /]*?)\s*:\s*(.+)$/)
      const alias = m && FIELD_ALIASES[collection][norm(m[1])]
      if (alias) {
        fields[alias] = m[2].trim()
      } else if (m) {
        warnings.push(`Unknown field "${m[1].trim()}" ignored`)
      } else {
        fields.notes = fields.notes ? `${fields.notes} ${raw.trim()}` : raw.trim()
      }
    }

    if (fields.priority) fields.priority = coerceEnum(fields.priority, PRIORITIES, 'MEDIUM', 'priority', warnings)
    if (collection === 'improvements') {
      if (fields.status) fields.status = coerceEnum(fields.status, IMPROVEMENT_STATUSES, 'Planned', 'status', warnings)
      if (fields.category) fields.category = coerceEnum(fields.category, CATEGORIES, 'Interior', 'category', warnings)
      if (fields.fundingSource) fields.fundingSource = coerceEnum(fields.fundingSource, FUNDING, 'TBD', 'funding', warnings)
    }
    if (collection === 'tasks') {
      if (fields.frequency) fields.frequency = coerceEnum(fields.frequency, FREQUENCIES, 'As needed', 'frequency', warnings)
      if (fields.lastCompleted) fields.lastCompleted = coerceDate(fields.lastCompleted, 'last completed', warnings)
      if (fields.nextDue) fields.nextDue = coerceDate(fields.nextDue, 'next due', warnings)
    }
    if (collection === 'documents' && fields.date) fields.date = coerceDate(fields.date, 'document', warnings)
    if (collection === 'products' && fields.systemName) {
      const sys = systems.find(s => norm(s.name) === norm(fields.systemName))
      if (sys) {
        fields.systemId = sys.id
        fields.systemName = sys.name
      } else {
        warnings.push(`No system named "${fields.systemName}" — product left unlinked`)
        delete fields.systemName
      }
    }

    items.push({ collection, systemId, systemName, name, fields, warnings })
  }

  let block = []
  let blockStart = 0
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const headerMatch = line.match(/^#+\s*(.+)$/)
    if (headerMatch) {
      finishBlock(block, blockStart); block = []
      section = parseHeader(headerMatch[1].trim(), systems)
      if (section.error) errors.push(`Line ${i + 1}: ${section.error}`)
    } else if (!line.trim()) {
      finishBlock(block, blockStart); block = []
    } else {
      if (!block.length) blockStart = i + 1
      block.push(line)
    }
  }
  finishBlock(block, blockStart)

  return { items, errors }
}

// Turns parsed items into an updateData() payload appended onto existing data.
export function applyBulkItems(items, data) {
  const uid = () => crypto.randomUUID()
  const payload = {}
  const counts = {}
  const grouped = {}
  for (const it of items) {
    grouped[it.collection] = grouped[it.collection] ?? []
    grouped[it.collection].push(it)
  }

  for (const [collection, list] of Object.entries(grouped)) {
    counts[collection] = list.length
    if (collection === 'tasks') {
      const byId = {}
      for (const it of list) (byId[it.systemId] = byId[it.systemId] ?? []).push(it)
      payload.systems = (data?.systems ?? []).map(sys => {
        const newTasks = (byId[sys.id] ?? []).map(it => {
          const t = {
            id: uid(), task: it.name, frequency: it.fields.frequency ?? 'As needed',
            priority: it.fields.priority ?? 'MEDIUM',
            lastCompleted: it.fields.lastCompleted ?? null,
            nextDue: it.fields.nextDue ?? calculateNextDue(it.fields.frequency, it.fields.lastCompleted),
            estimatedCost: it.fields.estimatedCost ?? '', notes: it.fields.notes ?? '',
          }
          return { ...t, status: calculateTaskStatus(t) }
        })
        return newTasks.length ? { ...sys, maintenanceTasks: [...(sys.maintenanceTasks ?? []), ...newTasks] } : sys
      })
    } else {
      const defaults = {
        improvements: { description: '', category: 'Interior', priority: 'MEDIUM', status: 'Planned', estimatedCost: '', estimatedTimeline: '', fundingSource: 'TBD', prerequisiteIds: [], notes: '' },
        contacts: { company: '', phone: '', email: '', role: '', notes: '', lastUsed: null },
        products: { systemId: null, brand: '', whereToBuy: '', notes: '' },
        documents: { date: null, url: '', notes: '' },
      }[collection]
      payload[collection] = [
        ...(data?.[collection] ?? []),
        ...list.map(it => {
          const { systemName: _drop, ...fields } = it.fields
          const item = { ...defaults, ...fields, [NAME_FIELD[collection]]: it.name, id: uid() }
          if (collection === 'improvements') item.createdAt = new Date().toISOString()
          return item
        }),
      ]
    }
  }
  return { payload, counts }
}

export const FORMAT_GUIDE = `# Improvements
Driveway repavement
priority: HIGH
cost: $8,000-12,000
notes: Get 3 quotes first

# Tasks: Roofing
Clean gutters
frequency: Semi-annual
priority: HIGH

# Contacts
John Smith
company: ABC Plumbing
phone: 908-555-1234`
