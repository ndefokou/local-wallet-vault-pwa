import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { importBackup, generateDEK } from '@/lib/vault';
import { saveVaultMetadata, saveWrappedKeys, saveManifest } from '@/lib/opfs/vaultStore';
import { init as initWasm, wrapDEK, encryptRecord, deriveKEKFromPRF } from '@/lib/wasm/index';
import { getPRFOutputByCredential, generateUserHandle, generatePRFSalt, createCredentialWithPRF } from '@/lib/webauthn/prf';
import { base64urlEncode } from '@/lib/base64url';
import type { VaultMetadata } from '@/lib/types/backup';

interface ImportBackupDialogProps {
  trigger?: React.ReactNode;
}

export function ImportBackupDialog({ trigger }: ImportBackupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'key' | 'creating'>('upload');
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [backupData, setBackupData] = useState<string | null>(null);
  const [backupKey, setBackupKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setBackupFile(file);
      setBackupData(text);
      setStep('key');
      setError(null);
    } catch (err) {
      setError('Failed to read backup file');
    }
  };

  const handleImport = async () => {
    if (!backupData) {
      setError('No backup file selected');
      return;
    }

    setError(null);
    setStep('creating');

    try {
      // Initialize WASM if needed
      await initWasm();

      // Step 1: Parse backup to get metadata
      const backup = JSON.parse(backupData);
      
      if (backup.version !== '1.0') {
        setError('Unsupported backup version');
        setStep('key');
        return;
      }

      const metadata: VaultMetadata = backup.metadata;

      // Step 2: Create a new WebAuthn credential for this vault
      const userHandle = generateUserHandle();
      const prfSalt = generatePRFSalt();

      // Create credential
      let credentialResult;
      try {
        credentialResult = await createCredentialWithPRF(userHandle);
      } catch (err) {
        setError('Failed to create passkey. Please try again.');
        setStep('key');
        return;
      }

      if (!credentialResult.prfEnabled) {
        setError('PRF extension is not enabled for this credential. Please try a different authenticator.');
        setStep('key');
        return;
      }

      // Step 3: Get PRF output
      const prfOutput = await getPRFOutputByCredential(credentialResult.credentialId, prfSalt);

      // Step 4: Derive KEK from PRF output
      const kek = deriveKEKFromPRF(prfOutput);

      // Step 5: Generate new DEK
      const dek = generateDEK();

      // Step 6: Wrap the DEK with KEK
      const wrappedKeysJson = wrapDEK(kek, dek, metadata.vaultId);
      const wrappedKeys = JSON.parse(wrappedKeysJson);

      // Step 7: Decrypt the backup envelope with the backup key
      // The backup key is the DEK that was used to encrypt the backup
      // For now, we assume the backupKey is a base64url-encoded DEK
      const backupDek = new Uint8Array(
        Array.from(atob(backupKey.trim()), c => c.charCodeAt(0))
      );

      // Step 8: Import the backup (decrypt with backup DEK)
      const result = await importBackup(backupDek, backupData);
      
      if (!result.success || !result.vault) {
        setError(result.error || 'Failed to import backup');
        setStep('key');
        return;
      }

      // Step 9: Re-encrypt the vault manifest with new DEK
      const manifestJson = JSON.stringify(result.vault);
      const manifestEnvelopeJson = await encryptRecord(dek, new TextEncoder().encode(manifestJson), metadata.vaultId, 'manifest');
      const manifestEnvelope = JSON.parse(manifestEnvelopeJson);

      // Step 10: Create new metadata with new credential
      const now = new Date().toISOString();
      const newMetadata: VaultMetadata = {
        schemaVersion: 1,
        vaultId: metadata.vaultId,
        createdAt: metadata.createdAt, // Preserve original creation time
        updatedAt: now,
        rpId: window.location.hostname,
        credentialId: credentialResult.credentialId,
        credentialUserHandle: base64urlEncode(userHandle),
        prfSalt: base64urlEncode(prfSalt),
        kdf: 'HKDF-SHA-256',
        wrapAlg: 'AES-GCM-256',
        dataAlg: 'AES-GCM-256',
      };

      // Step 11: Save to OPFS
      await saveVaultMetadata(newMetadata);
      await saveWrappedKeys(wrappedKeys);
      await saveManifest(manifestEnvelope);

      // Success - close dialog and navigate to unlock
      setIsOpen(false);
      navigate('/unlock');
    } catch (err) {
      console.error('Import failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to import backup');
      setStep('key');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('upload');
    setBackupFile(null);
    setBackupData(null);
    setBackupKey('');
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Import Backup</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Vault Backup</DialogTitle>
          <DialogDescription>
            Restore your vault from a backup file. You'll need the backup key to decrypt it.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Select a backup file (.json) that was exported from your vault.
                You'll need the backup key that was shown when the backup was created.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="backup-file">Backup File</Label>
              <Input
                id="backup-file"
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}

        {step === 'key' && backupFile && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Enter the backup key that was shown when this backup was created.
                This key is required to decrypt your vault data.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="backup-key">Backup Key</Label>
              <Input
                id="backup-key"
                type="password"
                value={backupKey}
                onChange={(e) => setBackupKey(e.target.value)}
                placeholder="Enter your backup key"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={!backupKey.trim()}>
                Import Vault
              </Button>
            </div>
          </div>
        )}

        {step === 'creating' && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Creating your vault... Please wait and do not close this window.
                You may be prompted to authenticate with your passkey.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {step !== 'creating' && step !== 'key' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}