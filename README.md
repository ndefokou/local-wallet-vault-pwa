# Local Wallet Vault

A frontend-only Progressive Web App (PWA) that stores encrypted wallet-related data locally in the browser using WebAuthn PRF for key derivation and OPFS for storage.

## ⚠️ Important Security Warnings

**This is a proof-of-concept. Do not store production seed phrases, private keys, or high-value secrets in this vault.**

### What This Protects Against

- **Offline file theft**: Data is encrypted; DEK is wrapped under PRF-derived KEK
- **Browser storage inspection**: Only ciphertext is stored in OPFS
- **Accidental file exposure**: OPFS files are not user-visible files
- **Tampered ciphertext**: AES-GCM authentication detects tampering
- **Stolen backup without key**: Backup remains encrypted without the backup key

### What This Does NOT Protect Against

- **XSS on the same origin**: Malicious JavaScript can steal plaintext after unlock
- **Malicious future deployment**: A compromised deployment can request PRF and decrypt
- **Compromised dependency**: Malicious code in dependencies is not mitigated
- **Compromised browser/OS/extension**: Platform compromise is not mitigated
- **Lost browser profile without backup**: Data is lost
- **Deleted passkey without backup**: Data may be unrecoverable
- **Rollback attacks**: Older valid ciphertext can be restored

## Architecture

```
User verification (WebAuthn/passkey)
        ↓
WebAuthn PRF output
        ↓
HKDF-SHA-256 derived key-encryption key (KEK)
        ↓
Wrapped local data-encryption key (DEK)
        ↓
AES-GCM encrypted vault records
        ↓
OPFS local browser storage
```

## Technology Stack

| Area | Technology |
|------|------------|
| UI Framework | React 18.x |
| Build Tool | Vite 5.x |
| Language | TypeScript 5.x |
| UI Kit | shadcn/ui |
| PWA Plugin | vite-plugin-pwa |
| Crypto | WebCrypto API |
| Auth | WebAuthn with PRF extension |
| Storage | OPFS |

## Project Structure

```
local-wallet-vault-pwa/
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── app/
│   │   └── App.tsx
│   ├── components/
│   │   ├── ui/           # shadcn components
│   │   └── layout/       # Layout components
│   ├── features/
│   │   ├── capability-check/
│   │   ├── vault/
│   │   ├── wallet-records/
│   │   └── backup/
│   ├── lib/
│   │   ├── base64url.ts
│   │   ├── crypto/
│   │   │   ├── aesGcm.ts
│   │   │   ├── hkdf.ts
│   │   │   ├── keyWrap.ts
│   │   │   └── envelopes.ts
│   │   ├── webauthn/
│   │   │   ├── prf.ts
│   │   │   └── capability.ts
│   │   ├── opfs/
│   │   │   ├── opfsRoot.ts
│   │   │   └── vaultStore.ts
│   │   └── types/
│   │       ├── vault.ts
│   │       ├── envelope.ts
│   │       └── backup.ts
│   ├── pages/
│   └── main.tsx
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or pnpm

### Installation

```bash
cd local-wallet-vault-pwa
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

## Features

### Milestone 1: Project Skeleton ✅

- Vite React TypeScript app
- shadcn/ui initialized
- PWA manifest and service worker
- Basic route/state layout

### Milestone 2: Capability Screen

- WebAuthn detection
- PRF capability attempt
- OPFS detection
- WebCrypto detection
- Persistent storage request

### Milestone 3: Crypto Core

- Base64url utilities
- HKDF helper
- AES-GCM envelope helper
- DEK wrap/unwrap
- Tests

### Milestone 4: OPFS Storage

- OPFS adapter
- Versioned metadata file
- Encrypted manifest file
- Atomic-ish write strategy
- Storage estimate display

### Milestone 5: WebAuthn PRF Vault Create/Unlock

- Credential creation
- PRF evaluation
- KEK derivation
- Empty vault initialization
- Unlock flow

### Milestone 6: Wallet Records

- Add/edit/delete wallet record
- Encrypted save
- Search/filter in unlocked memory

### Milestone 7: Backup and Recovery

- Encrypted export
- One-time backup key display
- Import and rewrap under new passkey

### Milestone 8: Security Hardening

- CSP and headers
- No third-party scripts
- Lock timer
- Threat model page
- Negative tests

## Security Headers

For production deployment, configure these headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src 'self'; img-src 'self' data:; style-src 'self'; worker-src 'self'; manifest-src 'self'; require-trusted-types-for 'script'
Permissions-Policy: publickey-credentials-create=(self), publickey-credentials-get=(self)
Referrer-Policy: no-referrer
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-Content-Type-Options: nosniff
```

## Browser Support

This PWA requires:

- HTTPS or localhost
- WebAuthn with PRF extension support
- OPFS (Origin Private File System)
- WebCrypto API

Tested browsers:
- Chrome 108+ (with PRF support)
- Edge 108+ (with PRF support)

## License

MIT

## References

- [WebAuthn Level 3 Specification](https://www.w3.org/TR/webauthn-3/)
- [MDN WebAuthn Extensions](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions)
- [MDN OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)