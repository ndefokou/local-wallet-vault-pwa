# Local Wallet Vault PWA

A proof-of-concept Progressive Web App that stores a local encrypted copy of wallet-related information in the browser using WebAuthn PRF and OPFS.

## ⚠️ Important Warnings

**This is a proof-of-concept application. Do not store production seed phrases, private keys, or high-value secrets.**

- This vault is stored only in your browser profile. There is no server backup.
- If you clear site data, lose your browser profile, or delete your passkey, you may lose access unless you have exported a backup.
- This PoC does not protect against XSS, malicious same-origin JavaScript, compromised dependencies, or browser/OS compromise.
- Do not store production seed phrases or high-value private keys.

## Features

- **WebAuthn PRF**: Uses the Pseudo-Random Function extension for key derivation
- **AES-GCM-256 Encryption**: All data is encrypted at rest
- **OPFS Storage**: Origin Private File System for secure local storage
- **Passkey Protected**: Unlock with biometrics or security key
- **No Backend Required**: Fully local-first application
- **PWA Support**: Installable and works offline after first load
- **Export/Import**: Backup your vault with encrypted export files

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 8 with Rolldown
- **UI Components**: shadcn/ui + Tailwind CSS
- **PWA**: vite-plugin-pwa
- **Crypto**: Web Crypto API (AES-GCM-256, HKDF-SHA-256)
- **Storage**: OPFS (Origin Private File System)
- **Auth**: WebAuthn with PRF extension

## Getting Started

### Prerequisites

- Node.js 20+ or Node.js 22+
- A browser that supports WebAuthn PRF (Chrome 127+, Firefox 125+, Edge 127+)
- HTTPS or localhost for secure context

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd local-wallet-vault-pwa

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Architecture

### Key Flow

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

### OPFS Structure

```
/opfs-root/
  local-wallet-vault/
    v1/
      metadata.json       # Non-secret vault metadata
      wrapped-keys.json   # Wrapped DEK envelope
      manifest.enc.json   # Encrypted vault manifest
      records/
        <record-id>.enc.json  # Encrypted wallet records
```

### Security Model

**Threats Mitigated:**
- Offline file theft: Data is encrypted; DEK is wrapped under PRF-derived KEK
- Browser storage inspection: Only ciphertext is stored in OPFS
- Accidental file exposure: OPFS files are not user-visible
- Tampered ciphertext: AES-GCM authentication detects tampering
- Stolen backup without key: Backup remains encrypted

**Threats NOT Mitigated:**
- XSS on the same origin
- Malicious future deployment on the same origin
- Compromised dependency
- Compromised browser/OS/extension
- Lost browser profile without backup
- Deleted passkey without backup
- Rollback attacks

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run lint` - Lint code

### Project Structure

```
src/
  app/
    App.tsx              # Main app component
  components/
    ui/                  # shadcn/ui components
    layout/               # Layout components
    BackupDialog.tsx     # Export backup dialog
    ImportBackupDialog.tsx # Import backup dialog
    WalletRecordForm.tsx # Wallet record form
  features/
    capability-check/    # Browser capability checking
  lib/
    base64url.ts         # Base64url utilities
    crypto/
      aesGcm.ts          # AES-GCM encryption
      hkdf.ts            # HKDF key derivation
      keyWrap.ts         # DEK wrap/unwrap
    opfs/
      opfsRoot.ts        # OPFS utilities
      vaultStore.ts      # Vault storage operations
    security/
      lockTimer.ts       # Auto-lock timer
    types/               # TypeScript types
    vault/
      vaultCreation.ts   # Vault creation logic
      vaultUnlock.ts     # Vault unlock logic
      vaultBackup.ts     # Backup/export logic
      VaultContext.tsx   # React context for vault state
    webauthn/
      capability.ts      # WebAuthn capability detection
      prf.ts             # PRF utilities
  pages/
    HomePage.tsx         # Landing page
    CapabilityCheckPage.tsx # Capability check
    CreateVaultPage.tsx  # Vault creation
    UnlockPage.tsx       # Vault unlock
    DashboardPage.tsx    # Main dashboard
    ThreatModelPage.tsx  # Security information
```

## Testing

The project includes tests for:

- Base64url encoding/decoding
- AES-GCM encryption/decryption
- HKDF key derivation
- Key wrap/unwrap operations

Run tests with:

```bash
npm run test:run
```

## Browser Support

This PWA requires:

- HTTPS or localhost (secure context)
- WebAuthn support
- WebAuthn PRF extension support
- OPFS support
- WebCrypto API support

### Tested Browsers

- Chrome 127+ (recommended)
- Firefox 125+
- Edge 127+

## Security Headers

For production deployment, configure these headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; worker-src 'self'; manifest-src 'self'; require-trusted-types-for 'script'
Permissions-Policy: publickey-credentials-create=(self), publickey-credentials-get=(self)
Referrer-Policy: no-referrer
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

## License

This is a proof-of-concept project. Use at your own risk.

## References

- [WebAuthn Level 3 Specification](https://www.w3.org/TR/webauthn-3/)
- [MDN WebAuthn Extensions](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/WebAuthn_extensions)
- [MDN OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)