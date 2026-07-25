import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getActivePat,
  getLockState,
  markVerified,
  clearVerified,
  lock as lockVault,
  resetVault,
  SESSION_KEY,
  VAULT_KEY,
  VERIFIED_KEY,
} from '../utils/vault'

export const ENV_KEY = import.meta.env.VITE_APP_ENV ?? 'dev'

/** GitHub reports fine-grained token expiry on every authenticated response. */
export const TOKEN_EXPIRY_HEADER = 'github-authentication-token-expiration'

export const KEYS = {
  PAT:   `hcc_${ENV_KEY}_pat`,
  OWNER: `hcc_${ENV_KEY}_owner`,
  REPO:  `hcc_${ENV_KEY}_repo`,
  PATH:  `hcc_${ENV_KEY}_path`,
  CACHE: `hcc_${ENV_KEY}_offline_cache`,
}

export const DATA_PATHS = {
  production: 'data/home.json',
  sandbox:    'data/sandbox/home.json',
  develop:    'data/dev/home.json',
  preprod:    'data/preprod/home.json',
}

const DEFAULT_DATA_PATH = DATA_PATHS[ENV_KEY] ?? 'data/dev/home.json'

function getConfig() {
  return {
    pat:   getActivePat(),
    owner: localStorage.getItem(KEYS.OWNER) || 'michaelsbruno91-ux',
    repo:  localStorage.getItem(KEYS.REPO)  || 'home-data',
    path:  localStorage.getItem(KEYS.PATH)  || DEFAULT_DATA_PATH,
  }
}

function apiHeaders(pat) {
  return { Authorization: `Bearer ${pat}`, Accept: 'application/vnd.github+json' }
}

function encodeContent(data) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))))
}

function decodeContent(raw) {
  return JSON.parse(decodeURIComponent(escape(atob(raw.replace(/\n/g, '')))))
}

export async function testConnection(pat, owner, repo, path) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
  const res = await fetch(url, { headers: apiHeaders(pat) })
  if (res.status === 401) throw new Error('Token invalid or expired — check PAT permissions (repo scope required)')
  const expiresAt = res.headers.get(TOKEN_EXPIRY_HEADER)
  if (res.status === 404) return { exists: false, data: null, sha: null, expiresAt }
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const json = await res.json()
  let data = null
  try { data = decodeContent(json.content) } catch { data = {} }
  return { exists: true, data, sha: json.sha, expiresAt }
}

export async function writeDataFile(pat, owner, repo, path, payload, sha, message) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...apiHeaders(pat), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message ?? `Update ${path} — ${new Date().toISOString()}`,
      content: encodeContent(payload),
      ...(sha ? { sha } : {}),
    }),
  })
  if (res.status === 401) throw new Error('Token invalid or expired')
  if (!res.ok) throw new Error(`Write error ${res.status}`)
  const json = await res.json()
  return json.content.sha
}

export function useGitHubData() {
  const [data, setData] = useState(null)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [lastSaved, setLastSaved] = useState(null)
  const [syncError, setSyncError] = useState(null)
  // 'unconfigured' — no token yet | 'locked' — token encrypted, needs a
  // credential | 'unlocked' — token available for API calls
  const [lockState, setLockState] = useState(getLockState)
  const isConfigured = lockState === 'unlocked'

  const shaRef = useRef(null)
  const debounceRef = useRef(null)
  const pendingRef = useRef(null)

  const doFetch = useCallback(async () => {
    const { pat, owner, repo, path } = getConfig()
    if (!pat) return null
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    const res = await fetch(url, { headers: apiHeaders(pat) })
    if (res.status === 401) throw Object.assign(new Error('Token invalid or expired'), { code: 401 })
    // A 2xx/404 means GitHub accepted the token — that is the revalidation.
    markVerified(res.headers.get(TOKEN_EXPIRY_HEADER))
    if (res.status === 404) return null
    if (!res.ok) throw Object.assign(new Error(`API error ${res.status}`), { code: res.status })
    const json = await res.json()
    shaRef.current = json.sha
    let decoded = {}
    try { decoded = decodeContent(json.content) } catch { decoded = {} }
    return decoded
  }, [])

  const doWrite = useCallback(async (payload, sha) => {
    const { pat, owner, repo, path } = getConfig()
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...apiHeaders(pat), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update home data — ${new Date().toISOString()}`,
        content: encodeContent(payload),
        sha,
      }),
    })
    if (res.status === 401) throw Object.assign(new Error('Token invalid or expired'), { code: 401 })
    if (res.status === 409) throw Object.assign(new Error('SHA conflict'), { code: 409 })
    if (!res.ok) throw Object.assign(new Error(`Write error ${res.status}`), { code: res.status })
    const json = await res.json()
    shaRef.current = json.content.sha
  }, [])

  const performWrite = useCallback(async (payload) => {
    if (!navigator.onLine) {
      localStorage.setItem(KEYS.CACHE, JSON.stringify(payload))
      pendingRef.current = payload
      setSyncStatus('offline')
      return
    }
    setSyncStatus('syncing')
    try {
      await doWrite(payload, shaRef.current)
      localStorage.setItem(KEYS.CACHE, JSON.stringify(payload))
      pendingRef.current = null
      setSyncStatus('saved')
      setLastSaved(new Date())
      setSyncError(null)
    } catch (err) {
      if (err.code === 409) {
        try {
          const fresh = await doFetch()
          await doWrite(payload, shaRef.current)
          localStorage.setItem(KEYS.CACHE, JSON.stringify(payload))
          pendingRef.current = null
          setSyncStatus('saved')
          setLastSaved(new Date())
          setSyncError(null)
        } catch (e2) {
          setSyncStatus('error')
          setSyncError(e2.message)
        }
      } else if (err.code === 401) {
        setSyncStatus('error')
        setSyncError('Token invalid — go to Settings to reconnect')
      } else {
        setSyncStatus('error')
        setSyncError(err.message)
      }
    }
  }, [doWrite, doFetch])

  // Load on mount
  useEffect(() => {
    if (!isConfigured) return
    const load = async () => {
      setSyncStatus('syncing')
      try {
        const loaded = await doFetch()
        if (loaded && loaded.systems?.length) {
          setData(loaded)
          localStorage.setItem(KEYS.CACHE, JSON.stringify(loaded))
          setSyncStatus('idle')
        } else {
          // Empty file or missing — return null so App can seed
          setData(loaded ?? {})
          setSyncStatus('idle')
        }
      } catch (err) {
        const cached = localStorage.getItem(KEYS.CACHE)
        if (cached) {
          try { setData(JSON.parse(cached)) } catch { setData({}) }
          setSyncStatus('offline')
        } else {
          setSyncStatus('error')
          setSyncError(err.message)
          setData({})
        }
      }
    }
    load()
  }, [isConfigured, doFetch])

  // Re-sync when coming back online
  useEffect(() => {
    const onOnline = () => {
      if (pendingRef.current) performWrite(pendingRef.current)
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [performWrite])

  const updateData = useCallback((partial) => {
    setData(prev => {
      const next = {
        ...prev,
        ...partial,
        meta: { ...(prev?.meta ?? {}), ...(partial?.meta ?? {}), lastUpdated: new Date().toISOString() },
      }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => performWrite(next), 1500)
      return next
    })
  }, [performWrite])

  const seedData = useCallback((seeded) => {
    setData(seeded)
    performWrite(seeded)
  }, [performWrite])

  const forceSync = useCallback(() => {
    if (data) performWrite(data)
  }, [data, performWrite])

  /** Re-read lock state after connecting, unlocking, or enrolling. */
  const reconnect = useCallback(() => {
    setLockState(getLockState())
  }, [])

  const lock = useCallback(() => {
    lockVault()
    setData(null)
    setSyncStatus('idle')
    setSyncError(null)
    shaRef.current = null
    setLockState(getLockState())
  }, [])

  const disconnect = useCallback(() => {
    resetVault()
    clearVerified()
    ;[KEYS.PAT, KEYS.OWNER, KEYS.REPO, KEYS.PATH, KEYS.CACHE, VAULT_KEY, VERIFIED_KEY]
      .forEach(k => localStorage.removeItem(k))
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* no session storage */ }
    setData(null)
    setSyncStatus('idle')
    setSyncError(null)
    shaRef.current = null
    setLockState(getLockState())
  }, [])

  return {
    data,
    updateData,
    seedData,
    syncStatus,
    lastSaved,
    syncError,
    forceSync,
    isConfigured,
    lockState,
    reconnect,
    lock,
    disconnect,
  }
}
