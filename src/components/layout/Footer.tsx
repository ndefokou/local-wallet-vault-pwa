import { AlertTriangle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-1">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span className="text-amber-500 font-medium">PoC</span>
          </div>
          <span>Local Wallet Vault — Not for production secrets</span>
        </div>
      </div>
    </footer>
  );
}