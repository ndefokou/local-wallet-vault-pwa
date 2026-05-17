import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { downloadBackup, encryptRecord } from '@/lib/vault';
import type { VaultPlaintextV1 } from '@/lib/types/vault';
import type { VaultMetadata } from '@/lib/types/backup';

interface BackupDialogProps {
  vault: VaultPlaintextV1;
  metadata: VaultMetadata | null;
  dek: Uint8Array | null;
  trigger?: React.ReactNode;
}

export function BackupDialog({ vault, metadata, dek, trigger }: BackupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'confirm' | 'key' | 'done'>('confirm');
  const [backupKey, setBackupKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBackup = async () => {
    if (!metadata) {
      setError('Vault metadata not available');
      return;
    }
    if (!dek) {
      setError('Vault is locked. Please unlock first.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create backup envelope
      const vaultJson = JSON.stringify(vault);
      const plaintext = new TextEncoder().encode(vaultJson);
      const result = await encryptRecord(dek, plaintext, metadata.vaultId, 'backup');
      
      if (!result.success || !result.data) {
        setError(result.error || 'Failed to create backup');
        return;
      }
      
      const envelope = JSON.parse(result.data);
      
      // Create backup package
      const backup = {
        version: '1.0',
        metadata,
        envelope,
        createdAt: new Date().toISOString(),
      };
      
      const backupData = JSON.stringify(backup);
      setBackupKey(backupData);
      downloadBackup(backupData, `backup-${metadata.vaultId}.json`);
      setStep('key');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('confirm');
    setBackupKey(null);
    setError(null);
  };

  const handleCopyKey = () => {
    if (backupKey) {
      navigator.clipboard.writeText(backupKey);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Export Backup</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Vault Backup</DialogTitle>
          <DialogDescription>
            Create an encrypted backup of your vault data
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Your backup will be encrypted with a randomly generated key. 
                You must store this key separately from the backup file.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              The backup file will be downloaded automatically. You will then be shown 
              the backup key which you must save securely.
            </p>
          </div>
        )}

        {step === 'key' && backupKey && (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>Save Your Backup Key</AlertTitle>
              <AlertDescription>
                Store this key securely and separately from your backup file. 
                You will need both the backup file and this key to restore your vault.
              </AlertDescription>
            </Alert>
            <div className="p-4 bg-muted rounded-lg">
              <code className="text-sm break-all">{backupKey}</code>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>Warning:</strong> This key will not be shown again. 
              Copy it now and store it securely.
            </p>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreateBackup} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Backup'}
              </Button>
            </>
          )}
          {step === 'key' && (
            <>
              <Button variant="outline" onClick={handleCopyKey}>
                Copy Key
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}