# Local Wallet Vault PWA PoC — PRD + ADR

**Status:** Draft / Proof of Concept

**Date:** 2026-05-14

**Owner:** TBD

**Repository:** TBD

**Working name:** Local Wallet Vault

**Project type:** Frontend-only Progressive Web App

**Primary stack:** shadcn/ui + React + Vite + Rolldown + TypeScript

---

## 0. Executive Summary

Local Wallet Vault is a proof-of-concept PWA that stores a local encrypted copy of user-related wallet information in the browser without a backend database.

The core idea is:

```
User verification through WebAuthn/passkey
        ↓
WebAuthn PRF output
        ↓
HKDF-derived key-encryption key
        ↓
Wrapped local data-encryption key
        ↓
AES-GCM encrypted vault records
        ↓
OPFS local browser storage
```

The PoC is designed for local-first wallet-adjacent data such as wallet labels, addresses, account metadata, preferences, chain/RPC settings, encrypted notes, watchlists, and optionally experimental encrypted secrets. It is not a backend replacement for authoritative user accounts, compliance records, billing, entitlement, cross-device sync, or production custody.

The project should prove whether a modern PWA can create a passkey-gated local vault using WebAuthn PRF and OPFS, while making the real security boundary explicit: this protects against offline theft of local vault files, but not against malicious same-origin JavaScript, XSS, compromised builds, compromised browser/OS, or a user losing both their browser storage and recovery material.

---

## 1. Version Basis and Stack Assumptions

This document assumes current 2026-era versions and uses `@latest` during scaffolding, followed by lockfile pinning.

Validated target stack as of 2026-05-14:

| Area | Target |
| --- | --- |
| UI framework | React 19.x, currently React 19.2 per official React docs |
| Build tool | Vite 8.x |
| Bundler | Rolldown, shipped as Vite 8’s unified Rust-based bundler |
| Language | TypeScript 6.0 |
| UI kit | shadcn/ui with shadcn CLI v4 |
| PWA integration | Vite PWA plugin 1.x or equivalent explicit service worker setup |
| Package manager | pnpm preferred, npm/bun acceptable |
| Runtime baseline | Node.js compatible with Vite 8 requirements |

Dependency policy:

```
Use @latest for initial install.
Commit pnpm-lock.yaml.
Never ship the PoC from floating dependency ranges alone.
Keep the WebAuthn/crypto/storage path dependency-light.
Do not load runtime JavaScript from third-party CDNs.
```

Suggested scaffold:

```bash
pnpm create vite@latest local-wallet-vault-pwa --template react-ts
cd local-wallet-vault-pwa

pnpm dlx shadcn@latest init -t vite
pnpm dlx shadcn@latest add button card dialog alert badge tabs input label separator sonner switch tooltip progress

pnpm add vite-plugin-pwa@latest
pnpm add -D vitest@latest @types/node@latest
```

Vite 8 uses Rolldown internally, so the app does not need a separate `rolldown` dependency unless the PoC includes standalone bundler experiments or a custom build pipeline.

---

# Part A — Product Requirements Document

---

## 2. Product Description

Local Wallet Vault is a frontend-only PWA that allows a user to create, unlock, view, edit, export, import, and delete a local encrypted wallet-related vault.

The app has no backend database. The static application may be hosted on any HTTPS-capable static host, but user vault data is stored locally in the browser’s origin-private storage.

The PoC demonstrates:

1. WebAuthn PRF can be used as a local key-release mechanism.
2. OPFS can persist encrypted vault data without using IndexedDB, localStorage, cookies, or a backend DB.
3. A PWA can provide a usable offline local vault experience.
4. The architecture can clearly communicate its limitations, especially around XSS, deletion, rollback, recovery, and passkey loss.

---

## 3. Product Goals

### 3.1 Primary Goals

- Create a local-only PWA vault for wallet-related user data.
- Use WebAuthn PRF to derive vault-unlock key material after user verification.
- Store only encrypted vault payloads in OPFS.
- Avoid any backend database for the PoC.
- Provide a clear lock/unlock model.
- Provide export/import so the PoC is not completely trapped in one browser profile.
- Keep the crypto/storage code small, typed, testable, and auditable.
- Use the latest 2026 React/Vite/Rolldown/TypeScript/shadcn stack.

### 3.2 Secondary Goals

- Demonstrate a clean UI flow for users who do not understand passkeys, PRF, OPFS, or local-first storage.
- Provide a visible browser/authenticator capability check.
- Support app-shell offline use after PWA installation.
- Provide a developer-friendly project structure that can later be extended to encrypted cloud backup or backend sync.

---

## 4. Non-Goals

This PoC will not:

- Replace a backend DB for authoritative server-side state.
- Provide cross-device sync without explicit export/import.
- Provide guaranteed recovery if the user loses browser data, passkey access, and backup material.
- Prevent compromise by malicious same-origin JavaScript.
- Prevent compromise by a malicious future deployment on the same origin.
- Prevent compromise by a compromised browser, OS, dependency, extension, or device.
- Provide production-ready custody for high-value private keys or seed phrases.
- Provide transaction signing in the MVP.
- Provide regulatory compliance, audit retention, KYC, AML, tax, or financial reporting.
- Guarantee rollback protection without external monotonic state.

---

## 5. User Personas

### 5.1 Developer / PoC Evaluator

Wants to test whether WebAuthn PRF + OPFS is viable for a local encrypted wallet-adjacent cache.

Needs:

- Clear feature detection.
- Inspectable encrypted files.
- Repeatable test flows.
- Minimal backend assumptions.
- Explicit limitations.

### 5.2 Wallet User / Power User

Wants a local private place to store wallet labels, addresses, notes, and preferences.

Needs:

- Simple passkey unlock.
- Clear indication of locked/unlocked state.
- Export/import backup.
- Warnings about data loss.
- No hidden cloud sync.

### 5.3 Future Product Owner

Wants to understand whether this can become a real product.

Needs:

- Decision record.
- Risk register.
- Clear distinction between PoC and production requirements.
- Extension points for backend sync, encrypted backups, and multiple credentials.

---

## 6. Data Scope

### 6.1 MVP Data Classes

The MVP should support wallet-adjacent data, not production custody.

| Class | Examples | MVP handling |
| --- | --- | --- |
| Public wallet metadata | addresses, chain IDs, wallet type, public ENS/name data | Encrypted in vault anyway, because metadata can still be sensitive |
| User labels | wallet nicknames, account labels, tags | Encrypted in vault |
| User preferences | default chain, RPC endpoint, UI settings | Encrypted in vault unless needed before unlock |
| Local notes | user-written private notes about wallets | Encrypted in vault |
| Watchlists | watched addresses, assets, token symbols | Encrypted in vault |
| Experimental secrets | seed phrase, private key, API token | Out of MVP by default; behind explicit experimental flag only |

### 6.2 Sensitive Data Policy

Default MVP rule:

```
Do not store production seed phrases or private keys.
```

Optional experimental secret storage may be implemented only if:

- The UI marks it as experimental.
- The user must explicitly enable it.
- The app warns that XSS or malicious same-origin code can steal secrets once unlocked.
- Export/import recovery is implemented first.
- Crypto test vectors and negative tests exist.

---

## 7. User Experience Requirements

### 7.1 First Run

The app shows:

- Project explanation.
- Local-only storage warning.
- Capability check for:
    - secure context / HTTPS,
    - WebAuthn availability,
    - WebAuthn PRF availability,
    - user-verifying authenticator availability when detectable,
    - OPFS availability,
    - WebCrypto availability,
    - persistent storage request status.

If required capabilities are missing, the app shows an unsupported state rather than silently falling back to insecure storage.

### 7.2 Create Vault

The user clicks **Create Local Vault**.

Flow:

1. Generate vault metadata.
2. Create a WebAuthn credential with `userVerification: "required"` and request the `prf` extension.
3. Confirm PRF is enabled for the created credential.
4. Generate a random data-encryption key.
5. Evaluate PRF through an assertion using the created credential and vault salt.
6. Derive a key-encryption key through HKDF-SHA-256.
7. Wrap the data-encryption key.
8. Write metadata and encrypted empty vault to OPFS.
9. Show recovery/export prompt.

### 7.3 Unlock Vault

The user clicks **Unlock**.

Flow:

1. Load local metadata from OPFS.
2. Ask authenticator for WebAuthn assertion with `userVerification: "required"`.
3. Request PRF evaluation for the stored credential ID and vault PRF salt.
4. Derive key-encryption key.
5. Unwrap data-encryption key.
6. Decrypt vault manifest and records.
7. Show dashboard.

The app must not store the PRF output, key-encryption key, data-encryption key, or plaintext vault outside memory.

### 7.4 Locked State

When locked:

- No wallet records are visible.
- Plaintext vault state is cleared from React state.
- Worker-held decrypted state is cleared.
- User must re-run WebAuthn to unlock.

Lock triggers:

- Manual lock button.
- Browser tab close or reload.
- Configurable inactivity timer.
- PWA visibility/background timeout.
- Service worker update requiring reload.

### 7.5 Vault Dashboard

MVP dashboard features:

- Add wallet record.
- Edit wallet label and notes.
- Add addresses per chain.
- Add tags.
- View local metadata.
- Search/filter records in memory after unlock.
- Export encrypted backup.
- Delete vault.

### 7.6 Export Backup

The user can export a backup package.

Recommended PoC backup model:

```
Generate random 256-bit backup key.
Encrypt vault export package with backup key.
Download backup JSON.
Show backup key once as base64url text.
Require user to store backup file and backup key separately.
```

This avoids relying on a weak user password KDF in the PoC. A password-based backup can be considered later with a memory-hard KDF and careful dependency review.

### 7.7 Import Backup

The user can import:

- encrypted backup JSON,
- backup key,
- then create a new local WebAuthn PRF credential for the current browser/origin,
- then re-wrap the imported data-encryption key under the new PRF-derived key-encryption key,
- then store the vault in OPFS.

### 7.8 Delete Vault

The user can delete local vault files.

The app must require a confirmation phrase such as:

```
DELETE LOCAL VAULT
```

Deletion warning must explain:

- No backend copy exists.
- Browser site-data deletion has the same effect.
- Deleting the passkey may make the vault undecryptable unless a backup exists.

---

## 8. Functional Requirements

### 8.1 Capability Detection

The app must detect:

- HTTPS secure context.
- `navigator.credentials.create` and `navigator.credentials.get`.
- `PublicKeyCredential` availability.
- `PublicKeyCredential.getClientCapabilities` when available.
- `extension:prf` client capability when available.
- OPFS via `navigator.storage.getDirectory`.
- WebCrypto via `crypto.subtle`.
- Storage estimate via `navigator.storage.estimate`.
- Persistent storage request via `navigator.storage.persist`.

The app must not rely solely on `getClientCapabilities()` for PRF. It must also check the actual `create()` and `get()` extension outputs.

### 8.2 Vault Creation

The app must:

- Generate `vaultId` with cryptographically random bytes.
- Generate random WebAuthn user handle.
- Generate random PRF salt.
- Generate random data-encryption key.
- Create WebAuthn credential with PRF requested.
- Store credential ID as non-secret local metadata.
- Store only wrapped/encrypted keys and ciphertext.

### 8.3 Vault Unlock

The app must:

- Request user verification.
- Pass the stored credential ID in `allowCredentials`.
- Use `prf.evalByCredential` with the stored credential ID.
- Fail closed if no PRF result is returned.
- Fail closed if decryption/authentication fails.

### 8.4 Vault Storage

The app must:

- Store vault files in OPFS.
- Not use localStorage for user data.
- Not store plaintext in IndexedDB.
- Not cache vault payloads through the service worker.
- Keep metadata minimal and non-secret.

### 8.5 Encryption

The app must:

- Use AES-GCM-256 for encryption.
- Use a fresh random 96-bit nonce for every AES-GCM encryption.
- Use HKDF-SHA-256 to derive key-encryption keys from PRF output.
- Include authenticated additional data for envelope metadata.
- Version every cryptographic envelope.
- Test successful decrypt and tamper failure.

### 8.6 PWA Behavior

The app must:

- Provide web app manifest.
- Provide installable app shell.
- Precache static app assets only.
- Avoid caching decrypted data or vault files.
- Work offline after installation for already-created local vaults.
- Show update prompt when a new service worker version is available.

### 8.7 UI Components

Use shadcn/ui components for:

- onboarding cards,
- capability checklist,
- vault creation dialog,
- unlock dialog,
- warning alerts,
- wallet record form,
- record cards/table,
- backup/export dialog,
- destructive delete dialog,
- toast notifications.

### 8.8 Testing

MVP tests:

- Crypto roundtrip test.
- Wrong key fails decrypt.
- Tampered ciphertext fails decrypt.
- Tampered AAD fails decrypt.
- Nonce uniqueness helper test.
- Envelope version parser test.
- OPFS adapter mock test.
- PRF unsupported flow test with mocked credentials API.
- Lock clears plaintext state test.

---

## 9. Non-Functional Requirements

### 9.1 Security

- Treat XSS as full compromise after unlock.
- No third-party runtime scripts on the vault surface.
- Strict CSP.
- No `dangerouslySetInnerHTML` in wallet/user-generated content.
- No plaintext wallet data in logs, telemetry, errors, URLs, localStorage, cookies, or service worker cache.
- No analytics in the PoC unlock/vault route.
- Dependency-light crypto path.
- Lockfile committed.

### 9.2 Performance

- Vault unlock target: under 1 second after authenticator completes, for small MVP vaults.
- File writes should be debounced and explicit.
- Large records should be split by record ID rather than one huge JSON file if needed.
- Search/filter can run in memory after unlock.

### 9.3 Accessibility

- Keyboard navigable dialogs.
- Visible focus states.
- Form labels on all fields.
- Alerts announced appropriately.
- Clear destructive action confirmation.

### 9.4 Privacy

- No network call is required for local vault operation.
- Optional wallet/RPC lookups must be clearly marked because address queries can leak wallet metadata to RPC/API providers.
- No telemetry by default.

### 9.5 Reliability

- Store versioned envelopes.
- Store schema versions.
- Validate parsed JSON.
- Keep export/import compatible across schema migrations.
- Display quota and persistence status.

---

## 10. Threat Model

### 10.1 Assets

- Wallet metadata.
- Wallet labels and notes.
- User preferences.
- Experimental secrets, if enabled.
- Data-encryption key.
- PRF-derived key-encryption key.
- Backup key.

### 10.2 Trusted Components

For the PoC, trusted components are:

- Browser WebAuthn implementation.
- Browser WebCrypto implementation.
- Browser OPFS implementation.
- Authenticator/passkey provider.
- Static app bundle served from the trusted origin.
- User’s OS and browser profile.

### 10.3 Threats Mitigated

| Threat | Mitigation |
| --- | --- |
| Attacker copies OPFS files from disk while vault is locked | Data is encrypted; DEK is wrapped under PRF-derived KEK |
| Attacker reads browser storage without authenticator access | Ciphertext only |
| User accidentally exposes local files | OPFS files are not normal user-visible files |
| Tampered ciphertext | AES-GCM authentication failure |
| Stolen encrypted backup without backup key | Backup remains encrypted |

### 10.4 Threats Not Mitigated

| Threat | Status |
| --- | --- |
| XSS on the same origin | Not mitigated; can steal plaintext after unlock |
| Malicious future deployment on the same origin | Not mitigated; can request PRF and read/decrypt after user interaction |
| Compromised dependency included in app bundle | Not mitigated by PRF/OPFS |
| Compromised browser, OS, or extension | Not mitigated |
| User loses browser profile and has no backup | Data lost |
| User deletes passkey and has no backup/recovery | Data may be unrecoverable |
| Rollback to older valid encrypted vault file | Not fully mitigated without external monotonic state |
| RPC/API privacy leaks | Only mitigated by avoiding or clearly controlling network calls |

### 10.5 Required Security Headers

For static hosting, configure at least:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src 'self'; img-src 'self' data:; style-src 'self'; worker-src 'self'; manifest-src 'self'; require-trusted-types-for 'script'
Permissions-Policy: publickey-credentials-create=(self), publickey-credentials-get=(self)
Referrer-Policy: no-referrer
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-Content-Type-Options: nosniff
```

If the app later uses external RPC endpoints, `connect-src` must be explicitly expanded.

---

## 11. Success Criteria

The PoC is successful when:

- A user can create a local vault using WebAuthn PRF.
- The app can persist encrypted vault data in OPFS.
- Reloading the page shows locked state.
- Unlock requires user verification through WebAuthn.
- Plaintext data is never intentionally persisted.
- Export/import works on the same or a different supported browser profile.
- Unsupported browsers fail closed with a useful message.
- The PWA works offline for local vault operations after installation.
- A developer can inspect OPFS and see only metadata plus ciphertext.
- Tampering with ciphertext causes decrypt failure.
- The README and UI warn that this is local-only and not production custody.

---

## 12. Milestones

### Milestone 1 — Skeleton

- Vite React TypeScript app.
- shadcn/ui initialized.
- PWA manifest and service worker.
- Basic route/state layout.

### Milestone 2 — Capability Screen

- WebAuthn detection.
- PRF capability attempt.
- OPFS detection.
- WebCrypto detection.
- Persistent storage request.

### Milestone 3 — Crypto Core

- Base64url utilities.
- HKDF helper.
- AES-GCM envelope helper.
- DEK wrap/unwrap.
- Tests.

### Milestone 4 — OPFS Storage

- OPFS adapter.
- Versioned metadata file.
- Encrypted manifest file.
- Atomic-ish write strategy.
- Storage estimate display.

### Milestone 5 — WebAuthn PRF Vault Create/Unlock

- Credential creation.
- PRF evaluation.
- KEK derivation.
- Empty vault initialization.
- Unlock flow.

### Milestone 6 — Wallet Records

- Add/edit/delete wallet record.
- Encrypted save.
- Search/filter in unlocked memory.

### Milestone 7 — Backup and Recovery

- Encrypted export.
- One-time backup key display.
- Import and rewrap under new passkey.

### Milestone 8 — Security Hardening

- CSP and headers.
- No third-party scripts.
- Lock timer.
- Threat model page.
- Negative tests.

---

# Part B — Architecture Decision Record

---

## ADR-001: Build a frontend-only local encrypted PWA vault

**Status:** Accepted for PoC

**Date:** 2026-05-14

### Context

The project needs to store a local copy of wallet-related user data without using a backend database. The app must be a PWA, not a browser extension. The data should remain unreadable when the app is locked and local files are inspected or copied.

### Decision

Build a frontend-only PWA that stores encrypted vault data in OPFS and uses WebAuthn PRF as the user-verification-gated source of key material.

The static app may be hosted, but no backend DB is required for MVP vault storage.

### Consequences

Positive:

- No backend database required.
- App can work offline.
- Encrypted vault remains local to the browser origin.
- Passkey/user verification gates unlock.

Negative:

- No inherent sync.
- No inherent recovery.
- Local browser storage deletion can destroy data.
- No strong rollback protection.
- Same-origin XSS remains catastrophic after unlock.

### Alternatives Considered

| Alternative | Reason rejected for PoC |
| --- | --- |
| Backend DB | Violates no-DB PoC constraint |
| Plain OPFS/IndexedDB | Does not protect local data at rest |
| localStorage | Too exposed, synchronous, unsuitable for secrets |
| Browser extension | User explicitly wants PWA |
| Server-side WebAuthn-only auth | Solves authentication, not local encrypted storage |

---

## ADR-002: Use WebAuthn PRF for local key release

**Status:** Accepted for PoC

### Context

The app needs a way to derive or release encryption key material after user verification, without storing a raw key in browser storage. WebAuthn PRF provides deterministic pseudo-random output associated with a credential and salt.

### Decision

Use WebAuthn PRF output as input keying material for HKDF-SHA-256. Derive a key-encryption key from that output. Use the key-encryption key to wrap a random data-encryption key.

Do not use the PRF output directly as the vault data-encryption key.

### Rationale

A wrapped-DEK model makes it easier to:

- Add additional passkeys later by wrapping the same DEK under multiple KEKs.
- Rotate PRF salts or wrapping metadata without re-encrypting all vault records.
- Support backup wrapping separately from WebAuthn wrapping.
- Keep data encryption independent from authenticator-specific behavior.

### Key Flow

```
WebAuthn PRF output
  -> HKDF-SHA-256(info = "local-wallet-vault:kek:v1")
  -> KEK
  -> AES-GCM unwrap wrapped DEK
  -> DEK decrypts vault records
```

### Consequences

Positive:

- Raw DEK is not stored unencrypted.
- User verification is required to derive the KEK.
- Multiple wrapping mechanisms can be added.

Negative:

- WebAuthn PRF support is not universal.
- Authenticator/passkey deletion can make the vault unrecoverable.
- Any script running on the same origin can request unlock while the user is present.

---

## ADR-003: Use OPFS as the local persistence layer

**Status:** Accepted for PoC

### Context

The app needs persistent local file-like storage. The user asked for no DB. OPFS provides origin-private browser storage and works well for encrypted blobs.

### Decision

Store all vault persistence in OPFS.

Do not use IndexedDB, localStorage, cookies, or Cache Storage for vault records.

### OPFS Layout

```
/opfs-root/
  local-wallet-vault/
    v1/
      metadata.json
      wrapped-keys.json
      manifest.enc.json
      records/
        <record-id>.enc.json
      backups/
        .gitkeep-equivalent-not-needed
```

`metadata.json` is non-secret but privacy-sensitive. It should contain only what is needed before unlock.

Example metadata:

```json
{
  "schemaVersion": 1,
  "vaultId": "b64u-random-id",
  "createdAt": "2026-05-14T00:00:00.000Z",
  "updatedAt": "2026-05-14T00:00:00.000Z",
  "rpId": "example.com",
  "credentialId": "b64u-credential-id",
  "credentialUserHandle": "b64u-random-user-handle",
  "prfSalt": "b64u-random-salt",
  "kdf": "HKDF-SHA-256",
  "wrapAlg": "AES-GCM-256",
  "dataAlg": "AES-GCM-256"
}
```

### Consequences

Positive:

- File-like structure is easy to inspect during PoC.
- Avoids a local database abstraction.
- Good fit for encrypted envelopes.

Negative:

- Browser quota and eviction rules still apply.
- Site-data deletion removes the vault.
- OPFS is local to the origin and browser profile.
- No automatic sync.

---

## ADR-004: Use AES-GCM envelopes with explicit versioning

**Status:** Accepted for PoC

### Context

Vault records need authenticated encryption and future migration support.

### Decision

Use AES-GCM-256 envelopes for encrypted records and key wrapping. Each envelope must include algorithm metadata, version, nonce, AAD metadata, and ciphertext.

Envelope shape:

```tsx
export type CipherEnvelopeV1 = {
  magic: "LWV_ENVELOPE";
  version: 1;
  alg: "AES-GCM-256";
  nonce: string;       // base64url, 96-bit random
  aad: {
    vaultId: string;
    purpose: "dek-wrap" | "manifest" | "wallet-record" | "backup";
    schemaVersion: number;
    recordId?: string;
    revision?: number;
  };
  ciphertext: string;  // base64url
};
```

Rules:

- New random nonce per encryption.
- AAD must be passed to AES-GCM.
- Never reuse a nonce with the same key.
- Decryption must validate envelope version and purpose.
- Decryption failure must be treated as tamper/corruption.

### Consequences

Positive:

- Tampering is detected.
- Future migrations are easier.
- Purpose-bound AAD reduces accidental cross-use.

Negative:

- AES-GCM does not prevent rollback to an older valid ciphertext.
- Nonce management must be correct.

---

## ADR-005: Keep the service worker away from vault data

**Status:** Accepted for PoC

### Context

A PWA needs a service worker for offline app-shell behavior. Service workers can also intercept requests and cache responses, which can create privacy mistakes if sensitive data flows over the network.

### Decision

The service worker will precache static app assets only. It must not cache vault data, decrypted data, export files, RPC responses containing user wallet info, or OPFS content.

Use `generateSW` for the initial PoC unless custom service-worker logic becomes necessary.

### Consequences

Positive:

- Simpler PWA setup.
- Lower chance of caching sensitive data.
- Offline app shell works.

Negative:

- No advanced offline RPC behavior.
- No background sync for vault data.

---

## ADR-006: Use React + TypeScript + Vite 8/Rolldown + shadcn/ui

**Status:** Accepted for PoC

### Context

The user explicitly requested shadcn, React, Vite, Rolldown, and TypeScript using latest 2026 versions.

### Decision

Use:

- React for UI.
- TypeScript for type safety.
- Vite 8 for dev/build.
- Rolldown through Vite 8’s default bundling path.
- shadcn/ui for accessible, composable UI primitives.
- Tailwind CSS through shadcn/Vite setup.

### Consequences

Positive:

- Modern, fast app setup.
- shadcn components are copyable and auditable.
- Vite/Rolldown build path is fast and current.
- TypeScript improves correctness for crypto/storage boundaries.

Negative:

- UI stack is not a security boundary.
- Dependencies must be audited and pinned.
- Any bundled malicious dependency can compromise unlocked data.

---

## ADR-007: Fail closed when PRF is unavailable

**Status:** Accepted for PoC

### Context

WebAuthn extensions are optional, and client support does not guarantee authenticator support. The PoC is specifically about WebAuthn PRF + OPFS.

### Decision

If PRF cannot be confirmed during credential creation and assertion, the app must show an unsupported state. It must not silently fall back to plaintext storage.

A development-only passphrase fallback may exist behind an explicit `VITE_ENABLE_INSECURE_DEV_FALLBACK=true` flag, but it must not be enabled in production builds.

### Consequences

Positive:

- Keeps the PoC honest.
- Avoids accidental weaker production path.

Negative:

- Smaller supported-device set.
- More user friction during evaluation.

---

## ADR-008: Provide explicit backup instead of pretending local storage is durable

**Status:** Accepted for PoC

### Context

OPFS is browser-managed local storage. It can be deleted by the user, browser, profile reset, origin change, or device loss. WebAuthn passkeys/credentials can also be deleted.

### Decision

The PoC must provide export/import. Export encrypts a backup package with a random backup key shown to the user once.

### Backup Package Shape

```tsx
export type BackupPackageV1 = {
  magic: "LWV_BACKUP";
  version: 1;
  createdAt: string;
  encryption: {
    alg: "AES-GCM-256";
    keyFormat: "base64url-256-bit-random-user-held-key";
  };
  payload: CipherEnvelopeV1;
};
```

### Consequences

Positive:

- Recovery does not depend on the original passkey.
- Import can re-wrap the vault under a new WebAuthn PRF credential.
- Avoids weak passphrase KDF decisions in the PoC.

Negative:

- User must store backup key safely.
- Losing backup key means losing backup access.
- Backup key is high-value secret material.

---

## 13. Proposed Technical Architecture

### 13.1 High-Level Modules

```
src/
  app/
    App.tsx
    routes.tsx
  components/
    ui/                  # shadcn-generated components
    layout/
    security/
  features/
    onboarding/
    capability-check/
    vault/
    wallet-records/
    backup/
  lib/
    base64url.ts
    crypto/
      aesGcm.ts
      hkdf.ts
      envelopes.ts
      keyWrap.ts
    webauthn/
      prf.ts
      credential.ts
      capability.ts
    opfs/
      opfsRoot.ts
      vaultStore.ts
    security/
      lockTimer.ts
      redaction.ts
  workers/
    vault.worker.ts
  tests/
```

### 13.2 Runtime Flow

```
App starts
  -> capability check
  -> OPFS metadata check
      -> no vault: onboarding/create vault
      -> vault exists: locked screen
  -> unlock through WebAuthn PRF
  -> worker decrypts vault
  -> UI receives plaintext model
  -> user edits
  -> worker encrypts and writes OPFS
  -> lock clears worker and UI state
```

### 13.3 Worker Boundary

A dedicated vault worker should handle crypto and OPFS writes.

This is not a security boundary against malicious same-origin code, but it improves separation and reduces accidental leakage through UI state.

Worker responsibilities:

- derive KEK,
- unwrap DEK,
- decrypt records,
- encrypt records,
- write OPFS,
- clear in-memory keys on lock.

UI responsibilities:

- collect user intent,
- call WebAuthn APIs where browser UX requires main-thread interaction,
- display status,
- send PRF output to worker only after successful assertion,
- never persist plaintext.

---

## 14. Data Model Draft

### 14.1 Plaintext Vault Model

```tsx
export type VaultPlaintextV1 = {
  schemaVersion: 1;
  vaultId: string;
  profile: LocalProfile;
  wallets: WalletRecord[];
  preferences: VaultPreferences;
  updatedAt: string;
};

export type LocalProfile = {
  displayName?: string;
  notes?: string;
};

export type VaultPreferences = {
  defaultChainId?: number;
  lockAfterSeconds: number;
  allowNetworkLookups: boolean;
};

export type WalletRecord = {
  id: string;
  label: string;
  kind: "watch-only" | "browser-wallet" | "hardware-wallet" | "experimental-secret";
  addresses: WalletAddress[];
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletAddress = {
  chainId: number;
  address: string;
  label?: string;
};
```

### 14.2 Experimental Secret Model

Not enabled by default.

```tsx
export type ExperimentalSecretPayload = {
  type: "mnemonic" | "private-key" | "api-token";
  value: string;
  warningAcceptedAt: string;
};
```

---

## 15. WebAuthn PRF Implementation Notes

### 15.1 Credential Creation

- Use `navigator.credentials.create({ publicKey })`.
- Set `userVerification: "required"`.
- Request `extensions: { prf: {} }`.
- Check `credential.getClientExtensionResults().prf?.enabled === true`.
- Store credential ID locally as non-secret metadata.

### 15.2 PRF Evaluation on Unlock

Use `navigator.credentials.get({ publicKey })` with:

- random local challenge,
- `userVerification: "required"`,
- stored credential ID in `allowCredentials`,
- `extensions.prf.evalByCredential[credentialIdBase64Url].first = prfSalt`.

Fail if:

- no assertion is returned,
- no PRF result is returned,
- unwrap fails,
- vault decrypt fails.

### 15.3 No Server-Side Assertion Verification in PoC

This PoC uses WebAuthn PRF as a local key-release mechanism. It does not use the assertion to authenticate to a server.

The local validity check is:

```
Can the returned PRF output unwrap the DEK and decrypt the vault?
```

If backend sync is added later, implement a full server-side WebAuthn registration/authentication ceremony.

---

## 16. OPFS Implementation Notes

### 16.1 Access

```tsx
const root = await navigator.storage.getDirectory();
```

### 16.2 Write Strategy

For MVP:

- serialize full envelope,
- write through `createWritable`,
- close stream,
- re-read in tests where possible.

For later hardening:

- add journal file,
- add last-known-good manifest,
- add migration tooling,
- add write lock with `navigator.locks` where available.

### 16.3 Quota and Persistence

On onboarding:

- call `navigator.storage.estimate()` and display approximate quota/usage,
- call `navigator.storage.persist()` and display whether persistent storage was granted,
- explain that user/browser deletion still removes the vault.

---

## 17. PWA Requirements

### 17.1 Manifest

Required fields:

```json
{
  "name": "Local Wallet Vault",
  "short_name": "Wallet Vault",
  "description": "A local encrypted wallet-related vault PoC.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": []
}
```

### 17.2 Service Worker

Rules:

- Precache app shell only.
- No caching of vault data.
- No background sync for vault records in MVP.
- Notify user when an app update is ready.
- Lock vault before reload/update.

---

## 18. Security UX Copy

Use clear warnings in the app.

### 18.1 Local-Only Warning

```
This vault is stored only in this browser profile. There is no server copy. If you clear site data, lose this browser profile, or delete the passkey used for this vault, you may lose access unless you exported a backup.
```

### 18.2 XSS / Origin Warning for Developer Mode

```
This PoC protects encrypted files at rest. It does not protect against malicious JavaScript running on this origin. Once unlocked, same-origin code can read plaintext data.
```

### 18.3 Experimental Secret Warning

```
Do not store production seed phrases or high-value private keys in this PoC. Secret storage is experimental and can be compromised by XSS, malicious deployments, browser compromise, or device compromise.
```

---

## 19. Acceptance Criteria

### 19.1 Create Vault

- [ ]  On a supported browser/authenticator, user can create a vault.
- [ ]  OPFS contains metadata and encrypted files only.
- [ ]  No plaintext data appears in localStorage, cookies, Cache Storage, or logs.
- [ ]  Reload returns to locked state.

### 19.2 Unlock Vault

- [ ]  Unlock triggers WebAuthn user verification.
- [ ]  Correct authenticator decrypts vault.
- [ ]  Wrong/missing authenticator fails closed.
- [ ]  Tampered ciphertext fails closed.

### 19.3 Wallet Records

- [ ]  User can add a watch-only wallet record.
- [ ]  User can edit labels and notes.
- [ ]  Records persist after lock/unlock.
- [ ]  Records remain encrypted at rest.

### 19.4 Backup

- [ ]  User can export encrypted backup.
- [ ]  Backup cannot be imported without backup key.
- [ ]  Backup can be imported into a fresh local vault.
- [ ]  Imported vault is rewrapped under new WebAuthn credential.

### 19.5 PWA

- [ ]  App is installable.
- [ ]  App shell works offline.
- [ ]  Local vault can unlock offline, assuming authenticator is available.
- [ ]  Service worker does not cache sensitive payloads.

### 19.6 Security

- [ ]  CSP is configured.
- [ ]  No runtime third-party scripts.
- [ ]  No `dangerouslySetInnerHTML` for user content.
- [ ]  Lock clears plaintext state.
- [ ]  Tests cover crypto failure cases.

---

## 20. Open Questions

- Should experimental secret storage be included at all, or kept out of the PoC?
- Which browsers/authenticators are the initial support target?
- Should the PoC support multiple passkeys wrapping the same DEK?
- Should wallet addresses ever be sent to external RPC/API providers?
- Should the app support encrypted cloud blob backup later, still without a traditional DB?
- Should the vault be one encrypted manifest or many encrypted record files?
- Should a content hash / transparency mechanism be used to reduce malicious deployment risk?

---

## 21. Reference Implementation Checklist

```
[ ] Scaffold Vite React TS project
[ ] Initialize shadcn/ui
[ ] Add PWA plugin and manifest
[ ] Implement base64url utilities
[ ] Implement AES-GCM envelope helper
[ ] Implement HKDF helper
[ ] Implement OPFS adapter
[ ] Implement WebAuthn PRF create/get helpers
[ ] Implement capability screen
[ ] Implement create vault flow
[ ] Implement unlock flow
[ ] Implement lock/clear flow
[ ] Implement wallet record CRUD
[ ] Implement backup export/import
[ ] Add tests
[ ] Add security headers
[ ] Add threat model page
[ ] Add README warnings
```

---

## 22. References Checked

Checked on 2026-05-14:

- React versions: https://react.dev/versions
- Vite 8 announcement: https://vite.dev/blog/announcing-vite8
- Vite getting started: https://vite.dev/guide/
- TypeScript setup/latest: https://www.typescriptlang.org/download/
- shadcn CLI v4 changelog: https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
- shadcn Vite installation: https://ui.shadcn.com/docs/installation/vite
- Rolldown 1.0 announcement: https://voidzero.dev/posts/announcing-rolldown-1-0
- Rolldown getting started: https://rolldown.rs/guide/getting-started
- WebAuthn Level 3 specification: https://www.w3.org/TR/webauthn-3/
- MDN WebAuthn extensions: https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions
- MDN WebAuthn client capabilities: https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/getClientCapabilities_static
- MDN OPFS: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- W3C passkey endpoints / PRF usage details: https://www.w3.org/TR/passkey-endpoints/
- Vite PWA plugin docs: https://vite-pwa-org.netlify.app/