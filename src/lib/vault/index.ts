export { VaultProvider, useVault } from './VaultContext';
export { createVault, type CreateVaultResult } from './vaultCreation';
export { unlockVault, type UnlockResult } from './vaultUnlock';
export {
  createBackup,
  importBackup,
  generateBackupKey,
  downloadBackup,
  type BackupResult,
  type ImportResult
} from './vaultBackup';