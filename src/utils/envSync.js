// Prod → lower-env data sync.
//
// Item ids are crypto.randomUUID() minted independently in each environment,
// so the same real-world item carries different ids in prod vs sandbox.
// All matching here uses natural keys instead: systems by name, tasks by task
// text within their system, improvements/contacts/documents by name, products
// by productName + owning system's name. Ingested items keep their prod ids so
// repeated syncs converge. Nothing here ever deletes a local item.

const norm = (s) => (s ?? '').trim().toLowerCase()

function byName(list, name) {
  return list.find(x => norm(x.name) === norm(name))
}

function systemNameById(systems, id) {
  return systems.find(s => s.id === id)?.name ?? null
}

function remapPrereqs(prereqIds, prodImprovements, targetImprovements) {
  return (prereqIds ?? [])
    .map(pid => {
      const name = prodImprovements.find(i => i.id === pid)?.name
      return name ? byName(targetImprovements, name)?.id : null
    })
    .filter(Boolean)
}

export function ingestNew(local, prod) {
  const summary = {}
  const merged = { ...local }

  const localSystems = local.systems ?? []
  const prodSystems = prod.systems ?? []
  let addedSystems = 0
  let addedTasks = 0
  const systems = localSystems.map(ls => {
    const ps = byName(prodSystems, ls.name)
    if (!ps) return ls
    const localTasks = ls.maintenanceTasks ?? []
    const newTasks = (ps.maintenanceTasks ?? []).filter(
      pt => !localTasks.some(lt => norm(lt.task) === norm(pt.task))
    )
    addedTasks += newTasks.length
    return newTasks.length ? { ...ls, maintenanceTasks: [...localTasks, ...newTasks] } : ls
  })
  for (const ps of prodSystems) {
    if (!byName(localSystems, ps.name)) {
      systems.push(ps)
      addedSystems++
      addedTasks += (ps.maintenanceTasks ?? []).length
    }
  }
  merged.systems = systems
  summary.systems = addedSystems
  summary.tasks = addedTasks

  for (const key of ['contacts', 'documents']) {
    const localList = local[key] ?? []
    const added = (prod[key] ?? []).filter(p => !byName(localList, p.name))
    merged[key] = [...localList, ...added]
    summary[key] = added.length
  }

  const localImps = local.improvements ?? []
  const prodImps = prod.improvements ?? []
  const newImps = prodImps.filter(p => !byName(localImps, p.name))
  const improvements = [...localImps, ...newImps]
  merged.improvements = improvements.map(imp =>
    newImps.includes(imp)
      ? { ...imp, prerequisiteIds: remapPrereqs(imp.prerequisiteIds, prodImps, improvements) }
      : imp
  )
  summary.improvements = newImps.length

  const localProducts = local.products ?? []
  const prodProducts = prod.products ?? []
  const productKey = (p, systems) => `${norm(p.productName)}|${norm(systemNameById(systems, p.systemId))}`
  const localKeys = new Set(localProducts.map(p => productKey(p, localSystems)))
  const newProducts = prodProducts
    .filter(p => !localKeys.has(productKey(p, prodSystems)))
    .map(p => {
      const sysName = systemNameById(prodSystems, p.systemId)
      const localSys = sysName ? byName(merged.systems, sysName) : null
      return { ...p, systemId: localSys?.id ?? p.systemId }
    })
  merged.products = [...localProducts, ...newProducts]
  summary.products = newProducts.length

  return { merged, summary }
}

export function syncMetadata(local, prod) {
  const summary = {}
  const merged = { ...local }

  const localSystems = local.systems ?? []
  const prodSystems = prod.systems ?? []
  let updatedSystems = 0
  let updatedTasks = 0
  merged.systems = localSystems.map(ls => {
    const ps = byName(prodSystems, ls.name)
    if (!ps) return ls
    updatedSystems++
    const prodTasks = ps.maintenanceTasks ?? []
    const maintenanceTasks = (ls.maintenanceTasks ?? []).map(lt => {
      const pt = prodTasks.find(t => norm(t.task) === norm(lt.task))
      if (!pt) return lt
      updatedTasks++
      return { ...pt, id: lt.id }
    })
    return { ...ps, id: ls.id, maintenanceTasks }
  })
  summary.systems = updatedSystems
  summary.tasks = updatedTasks

  for (const key of ['contacts', 'documents']) {
    let updated = 0
    merged[key] = (local[key] ?? []).map(li => {
      const pi = byName(prod[key] ?? [], li.name)
      if (!pi) return li
      updated++
      return { ...pi, id: li.id }
    })
    summary[key] = updated
  }

  const localImps = local.improvements ?? []
  const prodImps = prod.improvements ?? []
  let updatedImps = 0
  merged.improvements = localImps.map(li => {
    const pi = byName(prodImps, li.name)
    if (!pi) return li
    updatedImps++
    return { ...pi, id: li.id, prerequisiteIds: remapPrereqs(pi.prerequisiteIds, prodImps, localImps) }
  })
  summary.improvements = updatedImps

  const prodProducts = prod.products ?? []
  let updatedProducts = 0
  merged.products = (local.products ?? []).map(lp => {
    const lpSysName = systemNameById(localSystems, lp.systemId)
    const pp = prodProducts.find(p =>
      norm(p.productName) === norm(lp.productName) &&
      norm(systemNameById(prodSystems, p.systemId)) === norm(lpSysName)
    )
    if (!pp) return lp
    updatedProducts++
    return { ...pp, id: lp.id, systemId: lp.systemId }
  })
  summary.products = updatedProducts

  return { merged, summary }
}

export function summaryText(mode, summary) {
  const labels = {
    systems: 'systems', tasks: 'tasks', improvements: 'improvements',
    contacts: 'contacts', documents: 'documents', products: 'products',
  }
  const parts = Object.entries(summary)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${labels[k]}`)
  if (!parts.length) return mode === 'ingest' ? 'Nothing new to ingest.' : 'Nothing matched to update.'
  return `${mode === 'ingest' ? 'Added' : 'Updated'} ${parts.join(', ')}.`
}
