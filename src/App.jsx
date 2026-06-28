import { useState, useEffect } from 'react'
import { useGitHubData } from './hooks/useGitHubData'
import { generateSeedData } from './data/seedData'
import AppShell from './components/AppShell'
import GlobalSearch from './components/GlobalSearch'
import SettingsView from './views/SettingsView'
import Dashboard from './views/Dashboard'
import SystemsView from './views/SystemsView'
import ImprovementsView from './views/ImprovementsView'
import ProductsView from './views/ProductsView'
import ContactsView from './views/ContactsView'
import DocumentsView from './views/DocumentsView'

export default function App() {
  const [view, setView] = useState('dashboard')
  const [searchOpen, setSearchOpen] = useState(false)
  const [highlightId, setHighlightId] = useState(null)

  const {
    data,
    updateData,
    seedData,
    syncStatus,
    lastSaved,
    syncError,
    forceSync,
    isConfigured,
    reconnect,
    disconnect,
  } = useGitHubData()

  // Seed on first load when data is empty
  useEffect(() => {
    if (!isConfigured) return
    if (data === null) return
    if (!data.systems || data.systems.length === 0) {
      seedData(generateSeedData())
    }
  }, [data, isConfigured, seedData])

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!isConfigured) {
    return <SettingsView onConnect={reconnect} />
  }

  function handleSearchNavigate(targetView, id) {
    setView(targetView)
    setHighlightId(id)
    setSearchOpen(false)
    setTimeout(() => setHighlightId(null), 2000)
  }

  const viewProps = { data, updateData, highlightId }

  const VIEWS = {
    dashboard:    <Dashboard    {...viewProps} setView={setView} />,
    systems:      <SystemsView  {...viewProps} />,
    improvements: <ImprovementsView {...viewProps} />,
    products:     <ProductsView {...viewProps} />,
    contacts:     <ContactsView {...viewProps} />,
    documents:    <DocumentsView {...viewProps} />,
    settings:     <SettingsView embedded data={data} updateData={updateData} onConnect={reconnect} onDisconnect={disconnect} />,
  }

  return (
    <AppShell
      currentView={view}
      setView={setView}
      syncStatus={syncStatus}
      lastSaved={lastSaved}
      syncError={syncError}
      forceSync={forceSync}
      onSearchOpen={() => setSearchOpen(true)}
    >
      {VIEWS[view] ?? VIEWS.dashboard}

      {searchOpen && (
        <GlobalSearch
          data={data}
          onClose={() => setSearchOpen(false)}
          onNavigate={handleSearchNavigate}
        />
      )}
    </AppShell>
  )
}
