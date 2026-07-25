import { useState } from 'react'
import {
  Shield, ShieldCheck, Fingerprint, KeyRound, Lock, Loader2,
  CheckCircle, AlertCircle, Plus, Trash2,
} from 'lucide-react'
import {
  hasVault, enrolled, passkeySupported, enrollPasskey, enrollPin,
  removeCredential, readVault, tokenHealth, MIN_PIN_LENGTH,
} from '../utils/vault'

export default function SecurityCard({ onLock, onChange }) {
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [showPinForm, setShowPinForm] = useState(false)
  const [busy, setBusy] = useState(null) // null | 'passkey' | 'pin'
  const [status, setStatus] = useState(null) // null | 'ok' | 'error'
  const [message, setMessage] = useState('')

  const locked = hasVault()
  const { passkey, passkeyCount, pin: hasPin } = enrolled()
  const canUsePasskey = passkeySupported()
  const health = tokenHealth()

  function report(ok, text) {
    setStatus(ok ? 'ok' : 'error')
    setMessage(text)
  }

  async function addPasskey() {
    setBusy('passkey')
    setStatus(null)
    try {
      await enrollPasskey()
      report(true, locked ? 'Passkey added.' : 'App lock enabled — your token is now encrypted.')
      onChange?.()
    } catch (err) {
      report(false, err.name === 'NotAllowedError' ? 'Passkey setup cancelled' : err.message)
    } finally {
      setBusy(null)
    }
  }

  async function savePin() {
    if (pin !== pin2) { report(false, 'The two entries do not match'); return }
    setBusy('pin')
    setStatus(null)
    try {
      await enrollPin(pin)
      report(true, hasPin ? 'PIN updated.' : 'PIN set.')
      setPin('')
      setPin2('')
      setShowPinForm(false)
      onChange?.()
    } catch (err) {
      report(false, err.message)
    } finally {
      setBusy(null)
    }
  }

  function drop(id) {
    try {
      removeCredential(id)
      report(true, 'Credential removed.')
      onChange?.()
    } catch (err) {
      report(false, err.message)
    }
  }

  const cardCls = 'rounded-2xl p-6 mb-4 border'
  const cardStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }
  const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 font-mono'
  const inputStyle = { background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }
  const btnCls = 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-white/5 disabled:opacity-40'
  const btnStyle = { borderColor: 'var(--color-border)', color: 'var(--color-text)' }

  const keyring = readVault()?.keyring ?? []

  return (
    <div className={cardCls} style={cardStyle}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>App Lock</h3>
        {locked
          ? <span className="text-xs font-mono text-emerald-400 flex items-center gap-1"><ShieldCheck size={12} /> Enabled</span>
          : <span className="text-xs font-mono text-amber-400 flex items-center gap-1"><Shield size={12} /> Off</span>}
      </div>

      <p className="text-xs font-mono mb-4" style={{ color: 'var(--color-muted)' }}>
        {locked
          ? 'Your GitHub token is encrypted on this device and unlocks with the credentials below. It stays unlocked until you close the app.'
          : 'Right now your GitHub token is stored in plain text in this browser. Enable the app lock to encrypt it — anyone picking up this device would then need Face ID or your PIN.'}
      </p>

      {/* Enrolled credentials */}
      {locked && (
        <div className="space-y-2 mb-4">
          {keyring.map(entry => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 border"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--color-text)' }}>
                {entry.kind === 'passkey'
                  ? <><Fingerprint size={13} /> Passkey (Face ID / Touch ID)</>
                  : <><KeyRound size={13} /> PIN or passphrase</>}
              </span>
              {keyring.length > 1 && (
                <button
                  onClick={() => drop(entry.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  aria-label="Remove credential"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {canUsePasskey && (
          <button onClick={addPasskey} disabled={busy !== null} className={btnCls} style={btnStyle}>
            {busy === 'passkey' ? <Loader2 size={14} className="animate-spin" /> : passkey ? <Plus size={14} /> : <Fingerprint size={14} />}
            {passkey ? `Add another passkey (${passkeyCount})` : 'Enable with Face ID / Touch ID'}
          </button>
        )}
        <button onClick={() => { setShowPinForm(v => !v); setStatus(null) }} disabled={busy !== null} className={btnCls} style={btnStyle}>
          <KeyRound size={14} />
          {hasPin ? 'Change PIN' : 'Set a PIN'}
        </button>
        {locked && (
          <button onClick={onLock} className={btnCls} style={btnStyle}>
            <Lock size={14} />
            Lock now
          </button>
        )}
      </div>

      {!canUsePasskey && (
        <p className="text-[11px] font-mono mt-2" style={{ color: 'var(--color-muted)' }}>
          This browser does not support passkeys — use a PIN.
        </p>
      )}

      {showPinForm && (
        <div className="mt-4 space-y-2">
          <input
            type="password" value={pin} onChange={e => setPin(e.target.value)}
            placeholder={`At least ${MIN_PIN_LENGTH} characters`}
            className={inputCls} style={inputStyle} autoComplete="new-password"
          />
          <input
            type="password" value={pin2} onChange={e => setPin2(e.target.value)}
            placeholder="Confirm"
            className={inputCls} style={inputStyle} autoComplete="new-password"
          />
          <p className="text-[11px] font-mono" style={{ color: 'var(--color-muted)' }}>
            A short numeric PIN is guessable by anyone who copies this browser's storage. A passphrase is meaningfully stronger.
          </p>
          <button
            onClick={savePin}
            disabled={busy !== null || pin.length < MIN_PIN_LENGTH}
            className="w-full py-2 rounded-lg text-sm font-bold disabled:opacity-40"
            style={{ background: 'var(--color-accent)', color: '#000' }}
          >
            {busy === 'pin' ? 'Saving…' : hasPin ? 'Update PIN' : 'Set PIN'}
          </button>
        </div>
      )}

      {status && (
        <div className={`mt-3 flex items-start gap-2 text-sm rounded-lg p-3 ${
          status === 'ok' ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
        }`}>
          {status === 'ok' ? <CheckCircle size={14} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
          <span className="font-mono text-xs">{message}</span>
        </div>
      )}

      {/* Token health */}
      {health.known && (
        <div className="mt-4 pt-4 border-t space-y-1" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
            Token last accepted by GitHub: {health.verifiedAt.toLocaleDateString()}
            {health.staleDays > 0 && ` (${health.staleDays}d ago)`}
          </div>
          {health.expiresAt && (
            <div className={`text-xs font-mono ${health.expired ? 'text-red-400' : health.expiringSoon ? 'text-amber-400' : ''}`}
              style={health.expired || health.expiringSoon ? undefined : { color: 'var(--color-muted)' }}>
              {health.expired
                ? `Token expired ${health.expiresAt.toLocaleDateString()} — generate a new one and reconnect.`
                : `Token expires ${health.expiresAt.toLocaleDateString()} (${health.expiresInDays}d)`}
            </div>
          )}
          {health.stale && (
            <div className="text-xs font-mono text-amber-400">
              Not verified in over 90 days — open the app online to revalidate.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
