import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CapabilityStatus {
  name: string;
  description: string;
  supported: boolean | null;
  required: boolean;
}

export function CapabilityCheckPage() {
  const [capabilities, setCapabilities] = useState<CapabilityStatus[]>([
    { name: 'HTTPS / Secure Context', description: 'Required for WebAuthn and OPFS', supported: null, required: true },
    { name: 'WebAuthn', description: 'Passkey authentication support', supported: null, required: true },
    { name: 'WebAuthn PRF', description: 'Pseudo-random function extension', supported: null, required: true },
    { name: 'OPFS', description: 'Origin Private File System', supported: null, required: true },
    { name: 'WebCrypto', description: 'Cryptographic operations', supported: null, required: true },
    { name: 'Persistent Storage', description: 'Request persistent storage', supported: null, required: false },
  ]);

  const [checking, setChecking] = useState(true);
  const [allRequired, setAllRequired] = useState(false);

  useEffect(() => {
    checkCapabilities();
  }, []);

  async function checkCapabilities() {
    setChecking(true);
    
    const results: CapabilityStatus[] = [];

    // Check HTTPS
    const isHTTPS = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';
    results.push({
      name: 'HTTPS / Secure Context',
      description: 'Required for WebAuthn and OPFS',
      supported: isHTTPS,
      required: true,
    });

    // Check WebAuthn
    const hasWebAuthn = typeof window.PublicKeyCredential !== 'undefined';
    results.push({
      name: 'WebAuthn',
      description: 'Passkey authentication support',
      supported: hasWebAuthn,
      required: true,
    });

    // Check WebAuthn PRF
    let hasPRF = false;
    if (hasWebAuthn && typeof PublicKeyCredential.getClientCapabilities === 'function') {
      try {
        const capabilities = await PublicKeyCredential.getClientCapabilities();
        hasPRF = capabilities?.prf === true;
      } catch {
        hasPRF = false;
      }
    }
    results.push({
      name: 'WebAuthn PRF',
      description: 'Pseudo-random function extension',
      supported: hasPRF,
      required: true,
    });

    // Check OPFS
    const hasOPFS = 'storage' in navigator && 'getDirectory' in (navigator.storage || {});
    results.push({
      name: 'OPFS',
      description: 'Origin Private File System',
      supported: hasOPFS,
      required: true,
    });

    // Check WebCrypto
    const hasWebCrypto = typeof crypto !== 'undefined' && 
                         typeof crypto.subtle !== 'undefined';
    results.push({
      name: 'WebCrypto',
      description: 'Cryptographic operations',
      supported: hasWebCrypto,
      required: true,
    });

    // Check Persistent Storage
    let hasPersistent = false;
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        hasPersistent = await navigator.storage.persist();
      } catch {
        hasPersistent = false;
      }
    }
    results.push({
      name: 'Persistent Storage',
      description: 'Request persistent storage',
      supported: hasPersistent,
      required: false,
    });

    setCapabilities(results);
    setChecking(false);
    
    // Check if all required capabilities are supported
    setAllRequired(results.every(c => !c.required || c.supported === true));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Capability Check</h1>
        <p className="text-muted-foreground">
          Verifying your browser supports all required features
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Browser Capabilities</CardTitle>
          <CardDescription>
            {checking ? 'Checking capabilities...' : 'Capability check complete'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {capabilities.map((cap) => (
              <div key={cap.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{cap.name}</div>
                  <div className="text-sm text-muted-foreground">{cap.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  {cap.supported === null ? (
                    <span className="text-muted-foreground">Checking...</span>
                  ) : cap.supported ? (
                    <span className="text-green-600 dark:text-green-400">✓ Supported</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">
                      {cap.required ? '✗ Required' : '○ Optional'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!checking && (
        <div className="flex flex-col gap-4">
          {allRequired ? (
            <Link to="/create-vault">
              <Button size="lg" className="w-full">
                Continue to Create Vault
              </Button>
            </Link>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                Your browser does not meet all required capabilities. Please use a 
                modern browser with WebAuthn PRF support.
              </p>
              <Button size="lg" className="w-full" disabled>
                Browser Not Supported
              </Button>
            </div>
          )}
          <Link to="/">
            <Button variant="outline" size="lg" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}