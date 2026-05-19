import { useState, useEffect, useCallback } from 'react';

export interface ServiceWorkerStatus {
  isRegistered: boolean;
  needsUpdate: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorker() {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isRegistered: false,
    needsUpdate: false,
    isOffline: false,
    registration: null,
  });

  useEffect(() => {
    // Set initial online status after component mounts (ensures window is available)
    setStatus(s => ({ ...s, isOffline: !navigator.onLine }));

    // Update online/offline status
    const handleOnline = () => setStatus(s => ({ ...s, isOffline: false }));
    const handleOffline = () => setStatus(s => ({ ...s, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          setStatus(s => ({
            ...s,
            isRegistered: true,
            registration
          }));

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available
                  setStatus(s => ({ ...s, needsUpdate: true }));
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // Listen for controller changes (when a new SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (status.registration?.waiting) {
      // Send skip waiting message to the waiting service worker
      status.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [status.registration]);

  return {
    ...status,
    updateServiceWorker,
  };
}