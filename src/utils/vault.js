// App lock vault.
//
// The GitHub PAT is encrypted at rest with a random 256-bit data encryption key
// (DEK). The DEK itself is never stored in the clear — it is wrapped once per
// enrolled credential (passkey, PIN) and those wrapped copies live in a keyring.
// Unlocking with any enrolled credential unwraps the same DEK, which decrypts
// the PAT. Adding a second person later is just another keyring entry.
//
// The decrypted PAT lives in sessionStorage only, so it dies with the tab.
// Nothing readable is ever persisted to localStorage.

const ENV = import.meta.env?.VITE_APP_ENV ?? 'dev'

export const VAULT_KEY = `hcc_${ENV}_vault`
export const LEGACY_PAT_KEY = `hcc_${ENV}_pat`
export const SESSION_KEY = `hcc_${ENV}_unlocked`
export const VERIFIED_KEY = `hcc_${ENV}_pat_verified`
const ATTEMPTS_KEY = `hcc_${ENV}_pin_attempts`

const PIN_ITERATIONS = 600000
export const MIN_PIN_LENGTH = 6
const REVALIDATE_AFTER_DAYS = 90
const EXPIRY_WARN_DAYS = 21

// ---------------------------------------------------------------- encoding

function b64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function unb64(s) {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}

const utf8 = (s) => new TextEncoder().encode(s)

function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n))
}

// ---------------------------------------------------------------- crypto core

async function dekToKey(dekBytes) {
  return crypto.subtle.importKey('raw', dekBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function aesEncrypt(key, bytes) {
  const iv = randomBytes(12)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)
  return { iv: b64(iv), ct: b64(ct) }
}

async function aesDecrypt(key, blob) {
  const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, key, unb64(blob.ct))
  return new Uint8Array(raw)
}

/** Derive a key-encryption key from a PIN or passphrase. */
export async function pinKek(pin, saltBytes, iterations = PIN_ITERATIONS) {
  const base = await crypto.subtle.importKey('raw', utf8(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Derive a key-encryption key from a passkey PRF output. */
async function prfKek(prfBytes) {
  const base = await crypto.subtle.importKey('raw', prfBytes, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8(`hcc-kek:${ENV}`) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function wrapDek(kek, dekBytes) {
  return aesEncrypt(kek, dekBytes)
}

export async function unwrapDek(kek, blob) {
  return aesDecrypt(kek, blob)
}

// ---------------------------------------------------------------- vault store

export function readVault() {
  try {
    const raw = localStorage.getItem(VAULT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeVault(vault) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault))
}

export function hasVault() {
  const v = readVault()
  return !!(v && v.pat && Array.isArray(v.keyring) && v.keyring.length > 0)
}

export function enrolled() {
  const v = readVault()
  if (!v) return { passkey: false, pin: false, passkeyCount: 0 }
  const passkeys = v.keyring.filter(e => e.kind === 'passkey')
  return {
    passkey: passkeys.length > 0,
    passkeyCount: passkeys.length,
    pin: v.keyring.some(e => e.kind === 'pin'),
  }
}

export function resetVault() {
  localStorage.removeItem(VAULT_KEY)
  localStorage.removeItem(ATTEMPTS_KEY)
  clearUnlocked()
}

// ---------------------------------------------------------------- session state

let memory = null // { pat, dek: Uint8Array }

function readSession() {
  if (memory) return memory
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const { pat, dek } = JSON.parse(raw)
    memory = { pat, dek: unb64(dek) }
    return memory
  } catch {
    return null
  }
}

function setUnlocked(pat, dekBytes) {
  memory = { pat, dek: dekBytes }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ pat, dek: b64(dekBytes) }))
}

export function clearUnlocked() {
  memory = null
  try { sessionStorage.removeItem(SESSION_KEY) } catch { /* no session storage */ }
}

export function isUnlocked() {
  return !!readSession()
}

/**
 * The PAT to use for API calls, or null. Synchronous by design so the existing
 * getConfig()/doFetch/doWrite call chain stays unchanged.
 *
 * Falls back to the pre-vault plaintext key so existing installs keep working
 * until the user enrolls a credential.
 */
export function getActivePat() {
  const session = readSession()
  if (session?.pat) return session.pat
  if (!hasVault()) return localStorage.getItem(LEGACY_PAT_KEY)
  return null
}

export function getLockState() {
  if (hasVault()) return isUnlocked() ? 'unlocked' : 'locked'
  if (localStorage.getItem(LEGACY_PAT_KEY)) return 'unlocked'
  return 'unconfigured'
}

// ---------------------------------------------------------------- passkeys

export function passkeySupported() {
  return typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    !!navigator.credentials?.create
}

async function prfSalt() {
  const digest = await crypto.subtle.digest('SHA-256', utf8(`hcc-prf-v1:${ENV}`))
  return new Uint8Array(digest)
}

const PRF_UNSUPPORTED =
  'This device or browser did not provide the passkey PRF extension, which is required to derive an encryption key. Use a PIN instead.'

/**
 * Register a new passkey and return its credential id plus PRF-derived KEK.
 * May prompt for biometrics twice: once to create the credential, once to
 * evaluate PRF (browsers that return PRF results at creation skip the second).
 */
async function createPasskeyKek() {
  const salt = await prfSalt()
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'Home Command Center', id: location.hostname },
      user: {
        id: randomBytes(16),
        name: `${ENV}@home-command-center`,
        displayName: `Home Command Center (${ENV})`,
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      extensions: { prf: { eval: { first: salt } } },
      timeout: 60000,
    },
  })
  if (!cred) throw new Error('Passkey creation was cancelled')

  const ext = cred.getClientExtensionResults?.() ?? {}
  if (!ext.prf?.enabled && !ext.prf?.results?.first) throw new Error(PRF_UNSUPPORTED)

  const credentialId = b64(cred.rawId)
  let prfBytes = ext.prf?.results?.first
  if (!prfBytes) {
    // Creation only reported support; a get() is needed to actually read PRF.
    prfBytes = await evaluatePrf(credentialId, salt)
  }
  return { credentialId, kek: await prfKek(new Uint8Array(prfBytes)) }
}

async function evaluatePrf(credentialId, salt) {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      rpId: location.hostname,
      allowCredentials: credentialId ? [{ type: 'public-key', id: unb64(credentialId) }] : [],
      userVerification: 'required',
      extensions: { prf: { eval: { first: salt } } },
      timeout: 60000,
    },
  })
  if (!assertion) throw new Error('Unlock was cancelled')
  const result = assertion.getClientExtensionResults?.()?.prf?.results?.first
  if (!result) throw new Error(PRF_UNSUPPORTED)
  return result
}

// ---------------------------------------------------------------- enrollment

async function loadDek() {
  const session = readSession()
  if (!session?.dek) throw new Error('Unlock the app before changing security settings')
  return session.dek
}

/**
 * Create the vault around `pat`, or reuse the existing DEK when one is already
 * unlocked. Returns the DEK so the caller can wrap it with a new credential.
 */
async function dekForEnrollment(pat) {
  if (hasVault()) return { dek: await loadDek(), vault: readVault() }

  const plaintext = pat ?? localStorage.getItem(LEGACY_PAT_KEY)
  if (!plaintext) throw new Error('Connect a GitHub token before enabling the app lock')

  const dek = randomBytes(32)
  const encrypted = await aesEncrypt(await dekToKey(dek), utf8(plaintext))
  return { dek, vault: { version: 1, pat: encrypted, keyring: [] }, plaintext }
}

function finishEnrollment(vault, entry, dek, plaintext) {
  vault.keyring = [...vault.keyring.filter(e => e.id !== entry.id), entry]
  writeVault(vault)
  // The vault now owns the token — drop the plaintext copy.
  localStorage.removeItem(LEGACY_PAT_KEY)
  if (plaintext) setUnlocked(plaintext, dek)
}

export async function enrollPasskey(pat) {
  if (!passkeySupported()) throw new Error('Passkeys are not supported in this browser')
  const { dek, vault, plaintext } = await dekForEnrollment(pat)
  const { credentialId, kek } = await createPasskeyKek()
  const wrapped = await wrapDek(kek, dek)
  finishEnrollment(vault, { kind: 'passkey', id: credentialId, credentialId, ...wrapped }, dek, plaintext)
  return { credentialId }
}

export async function enrollPin(pin, pat) {
  if (!pin || pin.length < MIN_PIN_LENGTH) {
    throw new Error(`Use at least ${MIN_PIN_LENGTH} characters`)
  }
  const { dek, vault, plaintext } = await dekForEnrollment(pat)
  const salt = randomBytes(16)
  const kek = await pinKek(pin, salt, PIN_ITERATIONS)
  const wrapped = await wrapDek(kek, dek)
  finishEnrollment(
    vault,
    { kind: 'pin', id: 'pin', salt: b64(salt), iterations: PIN_ITERATIONS, ...wrapped },
    dek,
    plaintext,
  )
  clearPinFailures()
}

/**
 * Swap in a new GitHub token without disturbing the keyring — used when a token
 * expires and the user pastes a replacement. Requires the app to be unlocked.
 */
export async function replacePat(newPat) {
  const vault = readVault()
  if (!vault) throw new Error('No vault to update')
  const dek = await loadDek()
  vault.pat = await aesEncrypt(await dekToKey(dek), utf8(newPat))
  writeVault(vault)
  setUnlocked(newPat, dek)
}

export function removeCredential(id) {
  const vault = readVault()
  if (!vault) return
  const remaining = vault.keyring.filter(e => e.id !== id)
  if (remaining.length === 0) {
    throw new Error('Cannot remove the only way to unlock — add another credential first, or reset the app lock')
  }
  vault.keyring = remaining
  writeVault(vault)
}

// ---------------------------------------------------------------- unlocking

async function unlockWithKek(kek, entry) {
  const vault = readVault()
  let dek
  try {
    dek = await unwrapDek(kek, entry)
  } catch {
    throw new Error('Could not unlock with that credential')
  }
  const patBytes = await aesDecrypt(await dekToKey(dek), vault.pat)
  const pat = new TextDecoder().decode(patBytes)
  setUnlocked(pat, dek)
  return pat
}

export async function unlockWithPasskey() {
  const vault = readVault()
  const entries = vault?.keyring.filter(e => e.kind === 'passkey') ?? []
  if (entries.length === 0) throw new Error('No passkey is enrolled')

  const salt = await prfSalt()
  let lastError
  // Try each enrolled passkey — the user may pick any of them at the prompt.
  for (const entry of entries) {
    try {
      const prfBytes = await evaluatePrf(entry.credentialId, salt)
      return await unlockWithKek(await prfKek(new Uint8Array(prfBytes)), entry)
    } catch (err) {
      lastError = err
      if (err.name === 'NotAllowedError') break // user cancelled — don't re-prompt
    }
  }
  throw lastError ?? new Error('Could not unlock with a passkey')
}

export async function unlockWithPin(pin) {
  const remaining = pinLockoutRemaining()
  if (remaining > 0) {
    throw new Error(`Too many attempts — try again in ${Math.ceil(remaining / 1000)}s`)
  }
  const vault = readVault()
  const entry = vault?.keyring.find(e => e.kind === 'pin')
  if (!entry) throw new Error('No PIN is set')

  try {
    const kek = await pinKek(pin, unb64(entry.salt), entry.iterations)
    const pat = await unlockWithKek(kek, entry)
    clearPinFailures()
    return pat
  } catch (err) {
    recordPinFailure()
    throw new Error(err.message === 'Could not unlock with that credential' ? 'Incorrect PIN' : err.message)
  }
}

export function lock() {
  clearUnlocked()
}

// ---------------------------------------------------------------- PIN throttle

function readAttempts() {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)) ?? { count: 0, until: 0 }
  } catch {
    return { count: 0, until: 0 }
  }
}

export function pinLockoutRemaining() {
  const { until } = readAttempts()
  return Math.max(0, until - Date.now())
}

function recordPinFailure() {
  const attempts = readAttempts()
  const count = attempts.count + 1
  // No delay for the first few slips, then exponential up to 5 minutes.
  const penalty = count <= 3 ? 0 : Math.min(300000, 5000 * 2 ** (count - 4))
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count, until: Date.now() + penalty }))
}

function clearPinFailures() {
  localStorage.removeItem(ATTEMPTS_KEY)
}

// ---------------------------------------------------------------- token health

/**
 * Record that the token was just accepted by GitHub. `expiresAt` comes from the
 * github-authentication-token-expiration response header when present.
 */
export function markVerified(expiresAt) {
  const prev = readVerified()
  localStorage.setItem(VERIFIED_KEY, JSON.stringify({
    at: new Date().toISOString(),
    expiresAt: expiresAt ?? prev?.expiresAt ?? null,
  }))
}

export function readVerified() {
  try {
    return JSON.parse(localStorage.getItem(VERIFIED_KEY))
  } catch {
    return null
  }
}

export function clearVerified() {
  localStorage.removeItem(VERIFIED_KEY)
}

const DAY = 86400000

/**
 * Health of the stored token: how long since GitHub last accepted it, and
 * whether it is close to its own expiry date.
 */
export function tokenHealth() {
  const record = readVerified()
  if (!record?.at) return { known: false }

  const verifiedAt = new Date(record.at)
  const staleDays = Math.floor((Date.now() - verifiedAt.getTime()) / DAY)
  const expiresAt = record.expiresAt ? new Date(record.expiresAt) : null
  const expiresInDays = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / DAY) : null

  return {
    known: true,
    verifiedAt,
    staleDays,
    stale: staleDays >= REVALIDATE_AFTER_DAYS,
    expiresAt,
    expiresInDays,
    expiringSoon: expiresInDays !== null && expiresInDays <= EXPIRY_WARN_DAYS,
    expired: expiresInDays !== null && expiresInDays < 0,
  }
}
