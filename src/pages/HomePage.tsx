import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useVault } from '@/lib/vault';
import { ImportBackupDialog } from '@/components/ImportBackupDialog';

export function HomePage() {
  const { state } = useVault();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Local Wallet Vault</h1>
        <p className="text-xl text-muted-foreground">
          A local encrypted wallet-related vault using WebAuthn PRF and OPFS
        </p>
      </div>

      <Alert variant="default" className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
        <AlertTitle>⚠️ Proof of Concept</AlertTitle>
        <AlertDescription>
          This is a proof-of-concept application. Do not store production seed phrases, 
          private keys, or high-value secrets. This vault is stored only in your browser 
          and can be lost if browser data is cleared.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>🔒 Local-First Storage</CardTitle>
            <CardDescription>
              Your data never leaves your browser. All encryption happens locally.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>WebAuthn PRF for key derivation</li>
              <li>AES-GCM-256 encryption</li>
              <li>OPFS for secure storage</li>
              <li>No backend database required</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔑 Passkey Protected</CardTitle>
            <CardDescription>
              Unlock your vault using biometrics or a passkey.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>User verification required</li>
              <li>PRF-derived encryption keys</li>
              <li>No passwords to remember</li>
              <li>Hardware authenticator support</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {(state.status === 'locked' && state.hasVault) || state.status === 'unlocked' ? (
          <>
            <Link to="/unlock">
              <Button size="lg" className="w-full sm:w-auto">
                Unlock Vault
              </Button>
            </Link>
            <Link to="/capability-check">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Check Capabilities
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Link to="/capability-check">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <ImportBackupDialog
              trigger={<Button variant="outline" size="lg" className="w-full sm:w-auto">
                Import Backup
              </Button>}
            />
          </>
        )}
        <Link to="/threat-model">
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            View Security Model
          </Button>
        </Link>
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>⚠️ Important Warnings</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>This vault is stored only in this browser profile. There is no server copy.</li>
            <li>If you clear site data, lose this browser profile, or delete your passkey, 
                you may lose access unless you have a backup.</li>
            <li>This PoC does not protect against XSS, malicious same-origin JavaScript, 
                compromised dependencies, or browser/OS compromise.</li>
            <li>Do not store production seed phrases or high-value private keys.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}