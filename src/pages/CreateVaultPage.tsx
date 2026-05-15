import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createVault } from '@/lib/vault';

export function CreateVaultPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreateVault = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await createVault();
      
      if (result.success) {
        // Navigate to unlock page after successful creation
        navigate('/unlock');
      } else {
        setError(result.error || 'Failed to create vault');
      }
    } catch (err) {
      console.error('Vault creation error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Create Your Vault</h1>
        <p className="text-muted-foreground">
          Set up a new encrypted vault protected by WebAuthn
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>
            Your vault will be encrypted and stored locally in your browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">1. Passkey Creation</h3>
            <p className="text-sm text-muted-foreground">
              You'll be prompted to create a passkey using your device's biometric 
              or security key.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">2. Key Derivation</h3>
            <p className="text-sm text-muted-foreground">
              The passkey's PRF output will be used to derive an encryption key.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">3. Local Storage</h3>
            <p className="text-sm text-muted-foreground">
              Your encrypted vault will be stored in the browser's Origin Private 
              File System (OPFS).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-yellow-600">⚠️ Important Warnings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <strong>Local-only storage:</strong> This vault is stored only in this browser profile. 
            There is no server copy. If you clear site data, lose this browser profile, or delete 
            the passkey, you may lose access unless you export a backup.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Not for production secrets:</strong> Do not store production seed phrases or 
            high-value private keys in this PoC. Secret storage is experimental.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>XSS vulnerability:</strong> This PoC protects encrypted files at rest. It does 
            not protect against malicious JavaScript running on this origin.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <Button 
          size="lg" 
          className="w-full" 
          onClick={handleCreateVault}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Creating Vault...
            </>
          ) : (
            'Create New Vault'
          )}
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          className="w-full"
          onClick={() => navigate('/capability-check')}
          disabled={isCreating}
        >
          Back to Capability Check
        </Button>
      </div>
    </div>
  );
}