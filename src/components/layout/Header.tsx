import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="font-bold text-xl">Local Wallet Vault</span>
        </Link>
        <nav className="flex items-center space-x-4">
          <Link to="/threat-model">
            <Button variant="ghost" size="sm">
              Security
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}