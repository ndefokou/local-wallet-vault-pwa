/**
 * WebAuthn capability detection utilities
 */

export interface CapabilityResult {
  name: string;
  description: string;
  supported: boolean;
  required: boolean;
}

/**
 * Check if the browser is in a secure context (HTTPS or localhost)
 */
export function checkSecureContext(): boolean {
  return window.isSecureContext;
}

/**
 * Check if WebAuthn is available
 */
export function checkWebAuthnAvailable(): boolean {
  return typeof window.PublicKeyCredential !== 'undefined';
}

/**
 * Check if WebAuthn PRF is available
 */
export async function checkPRFAvailable(): Promise<boolean> {
  if (!checkWebAuthnAvailable()) {
    return false;
  }
  
  // Check if getClientCapabilities is available
  if (typeof PublicKeyCredential.getClientCapabilities === 'function') {
    try {
      const capabilities = await PublicKeyCredential.getClientCapabilities();
      // The capability key is "extension:prf" not "prf"
      return capabilities?.['extension:prf'] === true;
    } catch {
      return false;
    }
  }
  
  // Fallback: assume PRF might be available if WebAuthn is available
  // Actual PRF support will be verified during credential creation
  return true;
}

/**
 * Check if OPFS is available
 */
export function checkOPFSAvailable(): boolean {
  return 'storage' in navigator && 
         'getDirectory' in (navigator.storage || {});
}

/**
 * Check if WebCrypto is available
 */
export function checkWebCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined';
}

/**
 * Check if persistent storage can be requested
 */
export async function checkPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Get storage estimate
 */
export async function getStorageEstimate(): Promise<{ quota: number; usage: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota ?? 0,
        usage: estimate.usage ?? 0,
      };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Check all required capabilities
 */
export async function checkAllCapabilities(): Promise<CapabilityResult[]> {
  const results: CapabilityResult[] = [];
  
  // Check HTTPS / Secure Context
  results.push({
    name: 'HTTPS / Secure Context',
    description: 'Required for WebAuthn and OPFS',
    supported: checkSecureContext(),
    required: true,
  });
  
  // Check WebAuthn
  results.push({
    name: 'WebAuthn',
    description: 'Passkey authentication support',
    supported: checkWebAuthnAvailable(),
    required: true,
  });
  
  // Check WebAuthn PRF
  results.push({
    name: 'WebAuthn PRF',
    description: 'Pseudo-random function extension',
    supported: await checkPRFAvailable(),
    required: true,
  });
  
  // Check OPFS
  results.push({
    name: 'OPFS',
    description: 'Origin Private File System',
    supported: checkOPFSAvailable(),
    required: true,
  });
  
  // Check WebCrypto
  results.push({
    name: 'WebCrypto',
    description: 'Cryptographic operations',
    supported: checkWebCryptoAvailable(),
    required: true,
  });
  
  // Check Persistent Storage
  results.push({
    name: 'Persistent Storage',
    description: 'Request persistent storage',
    supported: await checkPersistentStorage(),
    required: false,
  });
  
  return results;
}

/**
 * Check if all required capabilities are supported
 */
export function allRequiredCapabilitiesSupported(results: CapabilityResult[]): boolean {
  return results.every(result => !result.required || result.supported);
}