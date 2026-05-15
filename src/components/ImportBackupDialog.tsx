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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { importBackup } from '@/lib/vault';
import { saveVaultMetadata, saveWrappedKeys, saveManifest } from '@/lib/opfs/vaultStore';
import { generateAESKey, createEnvelope } from '@/lib/crypto/aesGcm';
import { wrapDEK } from '@/lib/crypto/keyWrap';
import { deriveKeyHKDF } from '@/lib/crypto/hkdf';
import { getPRFOutputByCredential, generateUserHandle, generatePRFSalt } from '@/lib/webauthn/prf';
import { base64urlEncode } from '@/lib/base64url';
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
    if (!backupData || !backupKey.trim()) {
      setError('Please enter the backup key');
      return;
    }

    setError(null);
    setStep('creating');

    try {
      // Step 1: Decrypt the backup
      const result = await importBackup(backupData, backupKey.trim());
      
      if (!result.success || !result.vault) {
        setError(result.error || 'Failed to import backup');
        setStep('key');
        return;
      }

      // Step 2: Create a new WebAuthn credential for this vault
      const userHandle = generateUserHandle();
      const prfSalt = generatePRFSalt();

      // Create credential
      let credentialResult;
      try {
        const { createCredentialWithPRF } = await import('@/lib/webauthn/prf');
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

      // Step 3: Get PRF output and derive KEK
      const prfOutput = await getPRFOutputByCredential(credentialResult.credentialId, prfSalt);
      const kek = await deriveKeyHKDF(
        prfOutput,
        new Uint8Array(32),
        'local-wallet-vault:kek:v1',
        32
      );

      // Step 4: Generate new DEK and wrap it
      const dek = await generateAESKey();
      const wrappedKeys = await wrapDEK(kek, dek, result.vault.vaultId);

      // Step 5: Create metadata
      const now = new Date().toISOString();
      const metadata: import('@/lib/types/backup').VaultMetadata = {
        schemaVersion: 1,
        vaultId: result.vault.vaultId,
        createdAt: now, // Use current time for new vault
        updatedAt: now,
        rpId: window.location.hostname,
        credentialId: credentialResult.credentialId,
        credentialUserHandle: base64urlEncode(userHandle),
        prfSalt: base64urlEncode(prfSalt),
        kdf: 'HKDF-SHA-256',
        wrapAlg: 'AES-GCM-256',
        dataAlg: 'AES-GCM-256',
      };

      // Step 6: Encrypt vault manifest
      const manifestEnvelope = await createEnvelope(
        dek,
        new TextEncoder().encode(JSON.stringify(result.vault)),
        result.vault.vaultId,
        'manifest'
      );

      // Step 7: Save to OPFS
      await saveVaultMetadata(metadata);
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
            Restore your vault from an encrypted backup file
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Importing a backup will create a new vault with a new passkey. 
                You will need both the backup file and the backup key.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="backup-file">Backup File</Label>
              <input
                ref={fileInputRef}
                id="backup-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                {backupFile ? backupFile.name : 'Select Backup File'}
              </Button>
            </div>
          </div>
        )}

        {step === 'key' && (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>Backup Key Required</AlertTitle>
              <AlertDescription>
                Enter the backup key that was shown when you created the backup.
                This is a base64url-encoded string.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="backup-key">Backup Key</Label>
              <Input
                id="backup-key"
                type="password"
                value={backupKey}
                onChange={(e) => setBackupKey(e.target.value)}
                placeholder="Enter your backup key..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleImport}>
                Import Vault
              </Button>
            </div>
          </div>
        )}

        {step === 'creating' && (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Creating vault... Please complete the passkey authentication when prompted.
            </p>
            <div className="animate-pulse">Processing...</div>
          </div>
        )}

        {step !== 'creating' && step !== 'key' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}