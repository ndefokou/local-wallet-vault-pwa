// Vault Types

export type VaultPlaintextV1 = {
  schemaVersion: 1;
  vaultId: string;
  profile: LocalProfile;
  wallets: WalletRecord[];
  preferences: VaultPreferences;
  updatedAt: string;
};

export type LocalProfile = {
  displayName?: string;
  notes?: string;
};

export type VaultPreferences = {
  defaultChainId?: number;
  lockAfterSeconds: number;
  allowNetworkLookups: boolean;
};

export type WalletRecord = {
  id: string;
  label: string;
  kind: 'watch-only' | 'browser-wallet' | 'hardware-wallet' | 'experimental-secret';
  addresses: WalletAddress[];
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletAddress = {
  chainId: number;
  address: string;
  label?: string;
};

export type ExperimentalSecretPayload = {
  type: 'mnemonic' | 'private-key' | 'api-token';
  value: string;
  warningAcceptedAt: string;
};