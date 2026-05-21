import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Key, Database, AlertTriangle, Loader2 } from 'lucide-react';
import { createVault } from '@/lib/vault';
import { useVault } from '@/lib/vault';

export function CreateVaultPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshState } = useVault();

  const handleCreateVault = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await createVault();
      
      if (result.success) {
        // Refresh the vault state so the app knows a vault now exists
        await refreshState();
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

  const steps = [
    {
      icon: Fingerprint,
      title: 'Passkey Creation',
      description: 'Create a passkey using your device\'s biometric or security key.',
    },
    {
      icon: Key,
      title: 'Key Derivation',
      description: 'The passkey\'s PRF output derives an AES-256-GCM encryption key.',
    },
    {
      icon: Database,
      title: 'Local Storage',
      description: 'Your encrypted vault is stored in the browser\'s OPFS.',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Create Your Vault</h1>
        <p className="text-muted-foreground">
          Set up a new encrypted vault protected by WebAuthn
        </p>
      </div>

      {/* Step Indicator */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={index} 
            className="flex items-start gap-4 p-4 rounded-2xl surface animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
              <step.icon className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-amber-500">Step {index + 1}</span>
              </div>
              <h3 className="font-semibold text-sm">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Warning Callout */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3 animate-fade-in delay-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-amber-500">Important Warnings</span>
        </div>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span><strong>Local-only storage:</strong> Data is stored only in this browser. Clearing site data will delete your vault.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span><strong>Not for production:</strong> Do not store production seed phrases or high-value private keys.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span><strong>XSS vulnerability:</strong> This PoC does not protect against malicious JavaScript on this origin.</span>
          </li>
        </ul>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 animate-fade-in">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* CTA Button */}
      <div className="space-y-3 animate-fade-in delay-300">
        <button
          onClick={handleCreateVault}
          disabled={isCreating}
          className="btn-amber w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Creating Vault...</span>
            </>
          ) : (
            <>
              <Fingerprint className="h-5 w-5" />
              <span>Create Vault with Passkey</span>
            </>
          )}
        </button>
        <p className="text-xs text-center text-muted-foreground">
          You'll be prompted to create a passkey using your device
        </p>
      </div>
    </div>
  );
}