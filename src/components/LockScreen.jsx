import { useState, useEffect, useRef } from 'react'
import { Lock, Fingerprint, Loader2, AlertCircle, KeyRound } from 'lucide-react'
import {
  enrolled,
  passkeySupported,
  unlockWithPasskey,
  unlockWithPin,
  pinLockoutRemaining,
  resetVault,
  MIN_PIN_LENGTH,
} from '../utils/vault'

export default function LockScreen({ onUnlock }) {
  const { passkey, pin: hasPin } = enrolled()
  const canUsePasskey = passkey && passkeySupported()

  const [mode, setMode] = useState(canUsePasskey ? 'passkey' : 'pin')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lockoutMs, setLockoutMs] = useState(pinLockoutRemaining())
  const pinRef = useRef(null)

  // Tick down the PIN throttle so the button re-enables on its own.
  useEffect(() => {
    if (lockoutMs <= 0) return
    const t = setInterval(() => setLockoutMs(pinLockoutRemaining()), 500)
    return () => clearInterval(t)
  }, [lockoutMs])

  useEffect(() => {
    if (mode === 'pin') pinRef.current?.focus()
  }, [mode])

  async function attempt(fn) {
    setBusy(true)
    setError('')
    try {
      await fn()
      onUnlock?.()
    } catch (err) {
      // A cancelled biometric prompt is not an error worth shouting about.
      setError(err.name === 'NotAllowedError' ? 'Unlock cancelled' : err.message)
      setLockoutMs(pinLockoutRemaining())
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  function handleReset() {
    if (!confirm(
      'Reset the app lock?\n\nThis erases the encrypted token from this browser. ' +
      'You will need to paste your GitHub token again to get back in. Your data in GitHub is not touched.'
    )) return
    resetVault()
    onUnlock?.()
  }

  const throttled = lockoutMs > 0
  const cardStyle = { background: 'var(--color-surface)', borderColor: 'var(--color-border)' }

  return (
    <div className="min-h-full flex items-center justify-center p-6" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid var(--color-accent)' }}
          >
            <Lock size={28} style={{ color: 'var(--color-accent)' }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            Home Command Center
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            Locked — unlock to continue.
          </p>
        </div>

        <div className="rounded-2xl p-6 border" style={cardStyle}>
          {mode === 'passkey' ? (
            <button
              onClick={() => attempt(unlockWithPasskey)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold disabled:opacity-60"
              style={{ background: 'var(--color-accent)', color: '#000' }}
            >
              {busy
                ? <><Loader2 size={16} className="animate-spin" /> Waiting…</>
                : <><Fingerprint size={16} /> Unlock with Face ID / Touch ID</>}
            </button>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); if (!throttled) attempt(() => unlockWithPin(pin)) }}
            >
              <label className="block text-xs font-mono font-medium mb-1" style={{ color: 'var(--color-muted)' }}>
                PIN or passphrase
              </label>
              <input
                ref={pinRef}
                type="password"
                inputMode="text"
                value={pin}
                onChange={e => setPin(e.target.value)}
                disabled={busy || throttled}
                autoComplete="current-password"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 font-mono mb-3"
                style={{ background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                type="submit"
                disabled={busy || throttled || pin.length < MIN_PIN_LENGTH}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold disabled:opacity-40"
                style={{ background: 'var(--color-accent)', color: '#000' }}
              >
                {busy
                  ? <><Loader2 size={16} className="animate-spin" /> Unlocking…</>
                  : throttled
                    ? `Locked out — ${Math.ceil(lockoutMs / 1000)}s`
                    : 'Unlock'}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 text-sm rounded-lg p-3 text-red-400 bg-red-400/10">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {canUsePasskey && hasPin && (
            <button
              onClick={() => { setMode(mode === 'passkey' ? 'pin' : 'passkey'); setError('') }}
              className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-mono transition-colors hover:opacity-80"
              style={{ color: 'var(--color-muted)' }}
            >
              {mode === 'passkey'
                ? <><KeyRound size={12} /> Use PIN instead</>
                : <><Fingerprint size={12} /> Use Face ID / Touch ID instead</>}
            </button>
          )}
        </div>

        <button
          onClick={handleReset}
          className="w-full mt-4 text-xs font-mono transition-colors hover:opacity-80"
          style={{ color: 'var(--color-muted)' }}
        >
          Can't get in? Reset app lock
        </button>
      </div>
    </div>
  )
}
