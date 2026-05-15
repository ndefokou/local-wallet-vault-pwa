/**
 * WebAuthn PRF (Pseudo-Random Function) utilities
 */

import { base64urlEncode, base64urlDecode, generateRandomBytes } from '../base64url';

const RP_ID = window.location.hostname;
const USER_VERIFICATION = 'required' as const;

/**
 * Create a new WebAuthn credential with PRF extension
 */
export async function createCredentialWithPRF(
  userHandle: Uint8Array
): Promise<{
  credential: PublicKeyCredential;
  credentialId: string;
  prfEnabled: boolean;
}> {
  const challenge = generateRandomBytes(32);
  
  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    rp: {
      name: 'Local Wallet Vault',
      id: RP_ID,
    },
    user: {
      id: userHandle.buffer as ArrayBuffer,
      name: `vault-${Date.now()}`,
      displayName: 'Vault User',
    },
    challenge: challenge.buffer as ArrayBuffer,
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      // Allow both platform (built-in) and cross-platform (security key) authenticators
      // by not specifying authenticatorAttachment
      userVerification: USER_VERIFICATION,
    },
    // Don't require attestation - it's not needed for this use case
    attestation: 'none',
    extensions: {
      prf: {},
    },
  };
  
  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  }) as PublicKeyCredential;
  
  // Check if PRF is enabled
  const clientExtensionResults = credential.getClientExtensionResults();
  const prfEnabled = clientExtensionResults.prf?.enabled === true;
  
  // Get credential ID as base64url
  const credentialId = base64urlEncode(new Uint8Array(credential.rawId));
  
  return {
    credential,
    credentialId,
    prfEnabled,
  };
}

/**
 * Get PRF output from an assertion
 */
export async function getPRFOutput(
  credentialId: string,
  prfSalt: Uint8Array
): Promise<Uint8Array> {
  const challenge = generateRandomBytes(32);
  const credentialIdBuffer = base64urlDecode(credentialId);
  
  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: challenge.buffer as ArrayBuffer,
    rpId: RP_ID,
    userVerification: USER_VERIFICATION,
    allowCredentials: [
      {
        id: credentialIdBuffer.buffer as ArrayBuffer,
        type: 'public-key',
      },
    ],
    extensions: {
      prf: {
        eval: {
          first: prfSalt.buffer as ArrayBuffer,
        },
      },
    },
  };
  
  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  }) as PublicKeyCredential;
  
  const clientExtensionResults = assertion.getClientExtensionResults();
  
  if (!clientExtensionResults.prf?.results?.first) {
    throw new Error('PRF output not available');
  }
  
  const prfOutput = clientExtensionResults.prf.results.first;
  return new Uint8Array(prfOutput instanceof ArrayBuffer ? prfOutput : prfOutput.buffer);
}

/**
 * Get PRF output using evalByCredential
 */
export async function getPRFOutputByCredential(
  credentialId: string,
  prfSalt: Uint8Array
): Promise<Uint8Array> {
  const challenge = generateRandomBytes(32);
  const credentialIdBuffer = base64urlDecode(credentialId);
  const credentialIdBase64url = base64urlEncode(credentialIdBuffer);
  
  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: challenge.buffer as ArrayBuffer,
    rpId: RP_ID,
    userVerification: USER_VERIFICATION,
    allowCredentials: [
      {
        id: credentialIdBuffer.buffer as ArrayBuffer,
        type: 'public-key',
      },
    ],
    extensions: {
      prf: {
        evalByCredential: {
          [credentialIdBase64url]: {
            first: prfSalt.buffer as ArrayBuffer,
          },
        },
      },
    },
  };
  
  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  }) as PublicKeyCredential;
  
  const clientExtensionResults = assertion.getClientExtensionResults();
  
  if (!clientExtensionResults.prf?.results?.first) {
    throw new Error('PRF output not available');
  }
  
  const prfOutput = clientExtensionResults.prf.results.first;
  return new Uint8Array(prfOutput instanceof ArrayBuffer ? prfOutput : prfOutput.buffer);
}

/**
 * Generate a random user handle for WebAuthn
 */
export function generateUserHandle(): Uint8Array {
  return generateRandomBytes(32);
}

/**
 * Generate a random PRF salt
 */
export function generatePRFSalt(): Uint8Array {
  return generateRandomBytes(32);
}