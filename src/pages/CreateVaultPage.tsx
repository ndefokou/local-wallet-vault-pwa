import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function CreateVaultPage() {
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

      <div className="flex flex-col gap-4">
        <Button size="lg" className="w-full">
          Create New Vault
        </Button>
        <Link to="/capability-check">
          <Button variant="outline" size="lg" className="w-full">
            Back to Capability Check
          </Button>
        </Link>
      </div>
    </div>
  );
}