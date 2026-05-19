import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Fingerprint, HardDrive, AlertTriangle, ArrowRight, Upload } from 'lucide-react';
import { useVault } from '@/lib/vault';
import { ImportBackupDialog } from '@/components/ImportBackupDialog';

export function HomePage() {
  const { state } = useVault();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-4 animate-fade-in">
        {/* Animated icon with pulse ring */}
        <div className="relative inline-flex items-center justify-center">
          <div className="pulse-ring">
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-slate-800 border border-slate-700 shadow-lg">
              <ShieldCheck className="h-10 w-10 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Gradient heading */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text">Local Wallet Vault</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Secure, encrypted wallet storage using WebAuthn PRF and OPFS. 
            Your keys never leave your device.
          </p>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="animate-fade-in delay-100">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-500">Proof of Concept</p>
            <p className="text-xs text-muted-foreground">
              Do not store production seed phrases or high-value secrets. 
              Data is stored only in your browser and can be lost.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in delay-200">
        <div className="glass p-4 rounded-2xl space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Lock className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="font-semibold text-sm">Local-First</h3>
          <p className="text-xs text-muted-foreground">
            Data never leaves your browser. All encryption happens locally.
          </p>
        </div>

        <div className="glass p-4 rounded-2xl space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Fingerprint className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="font-semibold text-sm">Passkey Protected</h3>
          <p className="text-xs text-muted-foreground">
            Unlock with biometrics or security key. No passwords to remember.
          </p>
        </div>

        <div className="glass p-4 rounded-2xl space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <HardDrive className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="font-semibold text-sm">OPFS Storage</h3>
          <p className="text-xs text-muted-foreground">
            Encrypted vault stored in Origin Private File System.
          </p>
        </div>

        <div className="glass p-4 rounded-2xl space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
          </div>
          <h3 className="font-semibold text-sm">AES-GCM-256</h3>
          <p className="text-xs text-muted-foreground">
            Military-grade encryption for your sensitive data.
          </p>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="space-y-3 animate-fade-in delay-300">
        {(state.status === 'locked' && state.hasVault) || state.status === 'unlocked' ? (
          <>
            <Link to="/unlock" className="block">
              <button className="btn-amber w-full">
                <Lock className="h-5 w-5" />
                Unlock Vault
              </button>
            </Link>
            <Link to="/capability-check" className="block">
              <button className="btn-ghost w-full">
                Check Capabilities
              </button>
            </Link>
          </>
        ) : (
          <>
            <Link to="/capability-check" className="block">
              <button className="btn-amber w-full">
                <ArrowRight className="h-5 w-5" />
                Get Started
              </button>
            </Link>
            <ImportBackupDialog
              trigger={
                <button className="btn-ghost w-full">
                  <Upload className="h-5 w-5" />
                  Import Backup
                </button>
              }
            />
          </>
        )}
        <Link to="/threat-model" className="block">
          <button className="btn-ghost w-full">
            View Security Model
          </button>
        </Link>
      </div>
    </div>
  );
}