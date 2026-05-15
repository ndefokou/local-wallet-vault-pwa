import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ThreatModelPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Security & Threat Model</h1>
        <p className="text-muted-foreground">
          Understanding what this PoC protects against and its limitations
        </p>
      </div>

      <Alert className="bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
        <AlertTitle>⚠️ Critical Warning</AlertTitle>
        <AlertDescription>
          This is a proof-of-concept. Do not store production seed phrases, 
          private keys, or high-value secrets in this vault.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>✅ Threats Mitigated</CardTitle>
            <CardDescription>
              This PoC provides protection against the following threats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>Offline file theft:</strong> Data is encrypted; DEK is wrapped 
                under PRF-derived KEK
              </li>
              <li>
                <strong>Browser storage inspection:</strong> Only ciphertext is stored 
                in OPFS
              </li>
              <li>
                <strong>Accidental file exposure:</strong> OPFS files are not 
                user-visible files
              </li>
              <li>
                <strong>Tampered ciphertext:</strong> AES-GCM authentication detects 
                tampering
              </li>
              <li>
                <strong>Stolen backup without key:</strong> Backup remains encrypted 
                without the backup key
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>❌ Threats NOT Mitigated</CardTitle>
            <CardDescription>
              This PoC does NOT protect against these threats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>XSS on the same origin:</strong> Malicious JavaScript can steal 
                plaintext after unlock
              </li>
              <li>
                <strong>Malicious future deployment:</strong> A compromised deployment 
                can request PRF and decrypt
              </li>
              <li>
                <strong>Compromised dependency:</strong> Malicious code in dependencies 
                is not mitigated
              </li>
              <li>
                <strong>Compromised browser/OS/extension:</strong> Platform compromise 
                is not mitigated
              </li>
              <li>
                <strong>Lost browser profile without backup:</strong> Data is lost
              </li>
              <li>
                <strong>Deleted passkey without backup:</strong> Data may be unrecoverable
              </li>
              <li>
                <strong>Rollback attacks:</strong> Older valid ciphertext can be restored
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔐 Security Boundaries</CardTitle>
            <CardDescription>
              What the security model relies on
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Browser WebAuthn implementation</li>
              <li>Browser WebCrypto implementation</li>
              <li>Browser OPFS implementation</li>
              <li>Authenticator/passkey provider</li>
              <li>Static app bundle served from trusted origin</li>
              <li>User's OS and browser profile</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Data Storage</CardTitle>
            <CardDescription>
              Where your data is stored
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>OPFS:</strong> Origin Private File System - browser-managed 
                local storage
              </li>
              <li>
                <strong>Not synced:</strong> Data does not leave your browser
              </li>
              <li>
                <strong>Not backed up:</strong> No automatic cloud backup
              </li>
              <li>
                <strong>Can be deleted:</strong> Browser/site data clearing removes 
                the vault
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔑 Key Derivation</CardTitle>
            <CardDescription>
              How encryption keys are derived
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">
                The vault uses a wrapped key model:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>WebAuthn PRF output from passkey authentication</li>
                <li>HKDF-SHA-256 derives Key-Encryption Key (KEK)</li>
                <li>KEK unwraps Data-Encryption Key (DEK)</li>
                <li>DEK decrypts vault records with AES-GCM-256</li>
              </ol>
              <p className="text-sm text-muted-foreground">
                The DEK never leaves memory in plaintext. The PRF output is never stored.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}