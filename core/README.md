# Local Wallet Vault Core

Rust/WebAssembly core for the Local Wallet Vault PWA. Provides cryptographic operations and vault management logic.

## Architecture

This crate is compiled to WebAssembly and used by the TypeScript frontend. The browser-specific APIs (OPFS, WebAuthn) remain in TypeScript, while the security-critical crypto operations are implemented in Rust.

## Structure

```
core/
├── Cargo.toml
├── src/
│   ├── lib.rs              # Crate entry point
│   ├── base64url.rs        # Base64URL encoding/decoding
│   ├── error.rs            # Error types
│   ├── crypto/
│   │   ├── mod.rs
│   │   ├── aes_gcm.rs      # AES-GCM-256 encryption
│   │   ├── hkdf.rs         # HKDF-SHA-256 key derivation
│   │   └── key_wrap.rs     # DEK wrapping
│   ├── types/
│   │   ├── mod.rs
│   │   ├── envelope.rs     # CipherEnvelopeV1
│   │   ├── vault.rs       # VaultPlaintextV1
│   │   └── backup.rs      # VaultMetadata
│   ├── vault/
│   │   ├── mod.rs
│   │   ├── creation.rs     # Vault creation logic
│   │   └── unlock.rs      # Vault unlock logic
│   └── wasm.rs            # WASM bindings
└── wasm/
    └── bindings.rs        # wasm-bindgen exports
```

## Building

```bash
# Build for development
npm run build:wasm

# Build for production (optimized)
npm run build:wasm:release
```

## Usage in TypeScript

```typescript
import { init, createVault, unlockVault } from './lib/wasm';

// Initialize WASM module
await init();

// Create vault (crypto in WASM, OPFS/WebAuthn in TS)
const result = await createVault(prfOutput, credentialId, userHandle);

// Unlock vault
const unlockResult = await unlockVault(prfOutput, metadataJson, wrappedKeysJson, manifestJson);
```

## Security

- All cryptographic operations use audited Rust crates (`aes-gcm`, `hkdf`, `sha2`)
- Memory safety guaranteed by Rust's ownership model
- No data leaves the browser (local-first architecture)
- Keys derived from WebAuthn PRF (hardware-backed)

## Testing

```bash
# Run Rust tests
cd core && cargo test

# Run WASM tests
cd core && wasm-pack test --headless
```

## License

MIT