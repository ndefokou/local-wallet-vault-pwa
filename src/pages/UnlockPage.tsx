import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function UnlockPage() {
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
          <Button size="lg" className="w-full">
            Unlock with Passkey
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Link to="/dashboard">
          <Button variant="outline" size="lg" className="w-full">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}