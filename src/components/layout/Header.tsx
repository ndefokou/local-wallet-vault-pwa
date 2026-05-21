import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Unlock, Shield } from 'lucide-react';
import { useVault } from '@/lib/vault';

export function Header() {
  const { state, lock } = useVault();
  const location = useLocation();
  
  const isUnlocked = state.status === 'unlocked';
  const isLocked = state.status === 'locked' && state.hasVault;
  const showLockButton = isUnlocked && location.pathname !== '/';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <ShieldCheck className="h-7 w-7 text-amber-500 transition-transform group-hover:scale-105" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="gradient-text">Vault</span>
          </span>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Lock status pill */}
          {isUnlocked && (
            <div className="badge badge-amber gap-1.5">
              <Unlock className="h-3 w-3" />
              <span className="text-xs font-medium">Unlocked</span>
            </div>
          )}
          {isLocked && (
            <div className="badge badge-slate gap-1.5">
              <Lock className="h-3 w-3" />
              <span className="text-xs font-medium">Locked</span>
            </div>
          )}

          {/* Lock button (when unlocked and not on home) */}
          {showLockButton && (
            <button
              onClick={() => lock()}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-amber-500 hover:bg-slate-800/50 transition-colors"
            >
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          )}

          {/* Security link */}
          <Link
            to="/threat-model"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-slate-800/50 transition-colors"
          >
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </Link>
        </div>
      </div>
    </header>
  );
}