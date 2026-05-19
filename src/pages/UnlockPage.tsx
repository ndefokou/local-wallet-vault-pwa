import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-fade-in">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Unlocking...</h1>
          <p className="text-muted-foreground">
            Please complete the passkey authentication
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in">
      {/* Animated Lock Icon */}
      <div className="relative">
        <div className="pulse-ring">
          <div className="relative w-24 h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
            <Lock className="h-12 w-12 text-amber-500" />
            {/* Amber glow effect */}
            <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Unlock Your Vault</h1>
        <p className="text-muted-foreground max-w-xs">
          Use your passkey to unlock your encrypted vault
        </p>
      </div>

      {/* Info Card */}
      <div className="w-full max-w-sm space-y-4">
        <div className="surface p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Passkey Authentication</p>
              <p className="text-xs text-muted-foreground">
                Biometric or security key required
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="w-full max-w-sm p-4 rounded-2xl bg-red-500/10 border border-red-500/25">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Unlock Button */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleUnlock}
          disabled={isUnlocking}
          className="btn-amber w-full relative overflow-hidden"
        >
          {isUnlocking ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <Fingerprint className="h-5 w-5" />
              <span>Unlock with Passkey</span>
            </>
          )}
        </button>

        <p className="text-xs text-center text-muted-foreground">
          You'll be prompted by your browser or device to authenticate
        </p>
      </div>
    </div>
  );
}