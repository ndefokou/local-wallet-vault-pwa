export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm text-muted-foreground">
          Local Wallet Vault - A local encrypted wallet-related vault PWA
        </p>
        <p className="text-sm text-muted-foreground">
          This is a proof-of-concept. Do not store production secrets.
        </p>
      </div>
    </footer>
  );
}