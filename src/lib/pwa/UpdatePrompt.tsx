import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceWorker } from './useServiceWorker';

export function UpdatePrompt() {
  const { needsUpdate, updateServiceWorker } = useServiceWorker();

  if (!needsUpdate) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 shadow-lg z-50 border-primary">
      <CardHeader>
        <CardTitle className="text-lg">Update Available</CardTitle>
        <CardDescription>
          A new version of Wallet Vault is available.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Update now to get the latest features and security improvements.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={updateServiceWorker} className="w-full">
          Update Now
        </Button>
      </CardFooter>
    </Card>
  );
}