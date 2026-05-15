import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useVault } from '@/lib/vault';

export function UnlockPage() {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state, unlock } = useVault();
  const navigate = useNavigate();

  // Redirect to dashboard if already unlocked
  useEffect(() => {
    if (state.status === 'unlocked') {
      navigate('/dashboard');
    }
  }, [state.status, navigate]);

  // Redirect to home if no vault exists
  useEffect(() => {
    if (state.status === 'locked' && 'hasVault' in state && !state.hasVault) {
      navigate('/');
    }
  }, [state, navigate]);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setError(null);

    try {
      await unlock();
      // Navigation will happen via useEffect when state changes
    } catch (err) {
      console.error('Unlock error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unlock vault');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Show loading state while checking vault status
  if (state.status === 'unlocking') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Unlocking...</h1>
          <p className="text-muted-foreground">
            Please complete the passkey authentication
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Unlock Your Vault</h1>
        <p className="text-muted-foreground">
          Use your passkey to unlock your encrypted vault
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vault Locked</CardTitle>
          <CardDescription>
            Your vault is encrypted and requires passkey authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to authenticate with your passkey. 
            Your passkey will be used to derive the encryption key needed 
            to unlock your vault.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> You will be prompted by your browser or device 
            to authenticate using your passkey (biometric, PIN, or security key).
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unlock Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <Button 
          size="lg" 
          className="w-full"
          onClick={handleUnlock}
          disabled={isUnlocking}
        >
          {isUnlocking ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Authenticating...
            </>
          ) : (
            'Unlock with Passkey'
          )}
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          className="w-full"
          onClick={() => navigate('/')}
          disabled={isUnlocking}
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}