import { useServiceWorker } from './useServiceWorker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const { isOffline } = useServiceWorker();

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>You're Offline</AlertTitle>
        <AlertDescription>
          Some features may be limited. Your data is still safe locally.
        </AlertDescription>
      </Alert>
    </div>
  );
}