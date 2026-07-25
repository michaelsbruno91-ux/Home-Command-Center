// Node test of the vault crypto core (PIN path + keyring semantics).
// Passkey paths need WebAuthn and are covered by the Playwright run.

function makeStorage() {
  const m = new Map()
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    _dump: () => Object.fromEntries(m),
  }
}

globalThis.localStorage = makeStorage()
globalThis.sessionStorage = makeStorage()

const v = await import('../src/utils/vault.js')

let failures = 0
function check(name, cond, extra) {
  if (cond) { console.log(`  ok   ${name}`) }
  else { failures++; console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ''}`) }
}
async function throws(name, fn, match) {
  try { await fn(); failures++; console.log(`  FAIL ${name} — expected throw`) }
  catch (e) {
    const good = !match || e.message.includes(match)
    if (!good) { failures++; console.log(`  FAIL ${name} — got "${e.message}"`) }
    else console.log(`  ok   ${name}`)
  }
}

const PAT = 'ghp_exampletoken0000000000000000000000'

console.log('\nlock state + legacy fallback')
check('unconfigured when empty', v.getLockState() === 'unconfigured')
localStorage.setItem(v.LEGACY_PAT_KEY, PAT)
check('legacy plaintext PAT reads as unlocked', v.getLockState() === 'unlocked')
check('getActivePat returns legacy PAT', v.getActivePat() === PAT)

console.log('\nPIN enrollment')
await throws('rejects short PIN', () => v.enrollPin('12345'), 'at least 6')
await v.enrollPin('314159', undefined)
check('vault exists', v.hasVault())
check('plaintext PAT removed from localStorage', localStorage.getItem(v.LEGACY_PAT_KEY) === null)
check('enrolled reports pin', v.enrolled().pin === true && v.enrolled().passkey === false)
check('unlocked after enrollment', v.isUnlocked())
check('PAT available after enrollment', v.getActivePat() === PAT)

const dump = JSON.stringify(localStorage._dump())
check('PAT does not appear anywhere in localStorage', !dump.includes(PAT), dump.slice(0, 200))

console.log('\nlock / unlock round-trip')
v.lock()
check('locked after lock()', v.getLockState() === 'locked')
check('no PAT while locked', v.getActivePat() === null)
const got = await v.unlockWithPin('314159')
check('correct PIN returns the PAT', got === PAT)
check('unlocked again', v.getLockState() === 'unlocked')

console.log('\nwrong PIN')
v.lock()
await throws('wrong PIN rejected', () => v.unlockWithPin('999999'), 'Incorrect PIN')
check('still locked after failure', v.getLockState() === 'locked')
check('correct PIN still works after a failure', (await v.unlockWithPin('314159')) === PAT)

console.log('\nkeyring: enrolling again rewraps the same DEK')
// Changing the PIN while unlocked must wrap the existing DEK rather than
// re-encrypt the token — this is what lets a second credential be added later.
const dekBefore = JSON.stringify(v.readVault().pat)
await v.enrollPin('271828')
check('PAT ciphertext unchanged when re-enrolling', JSON.stringify(v.readVault().pat) === dekBefore)
check('only one PIN entry is kept', v.readVault().keyring.filter(e => e.kind === 'pin').length === 1)
v.lock()
check('new PIN unlocks', (await v.unlockWithPin('271828')) === PAT)
v.lock()
await throws('old PIN no longer works', () => v.unlockWithPin('314159'), 'Incorrect PIN')
await v.unlockWithPin('271828')

console.log('\nreplacePat keeps the keyring')
const keyringBefore = JSON.stringify(v.readVault().keyring)
await v.replacePat('ghp_rotated1111111111111111111111111')
check('keyring untouched by token rotation', JSON.stringify(v.readVault().keyring) === keyringBefore)
v.lock()
check('same PIN unlocks the rotated token',
  (await v.unlockWithPin('271828')) === 'ghp_rotated1111111111111111111111111')

console.log('\nIV freshness')
const a = await v.wrapDek(await v.pinKek('abcdef', new Uint8Array(16), 1000), new Uint8Array(32))
const b = await v.wrapDek(await v.pinKek('abcdef', new Uint8Array(16), 1000), new Uint8Array(32))
check('same key + plaintext produce different ciphertext', a.ct !== b.ct && a.iv !== b.iv)

console.log('\nremoveCredential guard')
const only = v.readVault()
only.keyring = only.keyring.slice(0, 1)
localStorage.setItem(v.VAULT_KEY, JSON.stringify(only))
try { v.removeCredential(only.keyring[0].id); failures++; console.log('  FAIL cannot remove last credential') }
catch (e) { check('cannot remove the last credential', e.message.includes('only way to unlock')) }

console.log('\ntoken health')
v.markVerified(new Date(Date.now() + 5 * 86400000).toISOString())
const h = v.tokenHealth()
check('health known', h.known === true)
check('not stale when just verified', h.stale === false)
check('expiring soon flagged at 5 days', h.expiringSoon === true && h.expired === false)

console.log('\nreset')
v.resetVault()
check('reset clears the vault', v.hasVault() === false)
check('reset returns to unconfigured', v.getLockState() === 'unconfigured')

console.log(failures === 0 ? '\nAll vault tests passed.\n' : `\n${failures} FAILURE(S)\n`)
process.exit(failures === 0 ? 0 : 1)
