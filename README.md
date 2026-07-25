# Home-Command-Center
Central hub for all things home maintenance and documentation.

## App lock

The GitHub token that gives this app read/write access to your data repo can be
encrypted at rest. Turn it on under **Settings → App Lock**.

- **How it works.** A random key encrypts the token; that key is then wrapped
  separately by each credential you enrol (a passkey — Face ID / Touch ID — and
  optionally a PIN or passphrase). Nothing readable is left in browser storage.
- **When it asks.** Unlocking lasts for the browser session, so reloads and
  navigation don't re-prompt, but closing the app locks it again.
- **Locked out?** "Reset app lock" on the lock screen erases the encrypted token
  from this browser and returns you to token entry. Your data in GitHub is never
  touched — you just paste a token again.
- **PIN strength.** A short numeric PIN only stops someone holding your phone.
  Anyone who can copy this browser's storage can grind it offline, so prefer a
  passphrase.

Token health (last time GitHub accepted it, and its expiry date when GitHub
reports one) is shown in the same card.

## Development

```sh
npm install
npm run dev            # local dev server
npm test               # vault crypto tests (no dependencies, plain node)
VITE_APP_ENV=sandbox npm run build
```

`VITE_APP_ENV` selects the deploy target (`production`, `sandbox`, `develop`,
`preprod`); it sets the base path, the data file path in the repo, and the
namespace for browser storage keys.
