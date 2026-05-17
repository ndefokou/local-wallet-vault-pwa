/**
 * Vault module exports
 */
export { VaultProvider, useVault } from './VaultContext';
export {
  init,
  createVault,
  unlockVault,
  saveWalletRecord,
  loadWalletRecord,
  generateDEK,
  hasVault,
  getVaultMetadata,
  encryptRecord,
  createBackup,
  downloadBackup,
  importBackup
} from './vaultWasm';
export type { CreateVaultResult, UnlockVaultResult } from './vaultWasm';