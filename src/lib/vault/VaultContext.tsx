import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { VaultMetadata } from '../types/backup';
import type { VaultPlaintextV1, WalletRecord } from '../types/vault';
import { loadVaultMetadata, vaultExists, saveManifest } from '../opfs/vaultStore';
import { init as initWasm, unlockVault as unlockVaultCore, encryptRecord } from './vaultWasm';
import { LockTimer, ActivityTracker } from '../security/lockTimer';

export type VaultState = 
  | { status: 'locked'; hasVault: boolean }
  | { status: 'unlocking'; hasVault: true }
  | { status: 'unlocked'; vault: VaultPlaintextV1; dek: Uint8Array }
  | { status: 'error'; error: string };

interface VaultContextValue {
  state: VaultState;
  metadata: VaultMetadata | null;
  unlock: () => Promise<void>;
  lock: () => void;
  createVault: () => Promise<void>;
  addWallet: (wallet: Omit<WalletRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateWallet: (id: string, updates: Partial<WalletRecord>) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;
  refreshState: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VaultState>({ status: 'locked', hasVault: false });
  const [metadata, setMetadata] = useState<VaultMetadata | null>(null);
  const [dek, setDek] = useState<Uint8Array | null>(null);
  const [vault, setVault] = useState<VaultPlaintextV1 | null>(null);
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [wasmError, setWasmError] = useState<string | null>(null);
  
  // Lock timer refs
  const lockTimerRef = useRef<LockTimer | null>(null);
  const activityTrackerRef = useRef<ActivityTracker | null>(null);

  // Initialize WASM module
  useEffect(() => {
    initWasm()
      .then(() => {
        setWasmInitialized(true);
        console.log('WASM module initialized successfully');
      })
      .catch((error) => {
        console.error('Failed to initialize WASM module:', error);
        setWasmError(error instanceof Error ? error.message : 'Failed to initialize WASM module');
      });
  }, []);

  // Initialize lock timer
  useEffect(() => {
    lockTimerRef.current = new LockTimer(300); // 5 minutes default
    activityTrackerRef.current = new ActivityTracker(lockTimerRef.current);
    
    return () => {
      if (lockTimerRef.current) {
        lockTimerRef.current.stop();
      }
      if (activityTrackerRef.current) {
        activityTrackerRef.current.stop();
      }
    };
  }, []);

  // Start/stop lock timer based on vault state
  useEffect(() => {
    if (state.status === 'unlocked' && lockTimerRef.current) {
      lockTimerRef.current.setCallback(() => {
        lock();
      });
      lockTimerRef.current.start();
      activityTrackerRef.current?.start();
    } else if (state.status === 'locked' && lockTimerRef.current) {
      lockTimerRef.current.stop();
      activityTrackerRef.current?.stop();
    }
  }, [state.status]);

  const refreshState = useCallback(async () => {
    // Wait for WASM to be initialized
    if (!wasmInitialized) {
      return;
    }
    
    if (wasmError) {
      setState({ status: 'error', error: wasmError });
      return;
    }
    
    try {
      const hasVault = await vaultExists();
      if (hasVault) {
        const meta = await loadVaultMetadata();
        setMetadata(meta);
        setState({ status: 'locked', hasVault: true });
      } else {
        setMetadata(null);
        setState({ status: 'locked', hasVault: false });
      }
    } catch (error) {
      console.error('Failed to refresh vault state:', error);
      setState({ status: 'error', error: 'Failed to check vault status' });
    }
  }, [wasmInitialized, wasmError]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const unlock = useCallback(async () => {
    if (state.status !== 'locked') {
      return;
    }
    
    const hasVault = state.hasVault;
    if (!hasVault) {
      return;
    }

    setState({ status: 'unlocking', hasVault: true });

    try {
      const result = await unlockVaultCore();
      
      if (result.success && result.vault && result.dek) {
        setVault(result.vault);
        setDek(result.dek);
        // Load metadata separately from OPFS
        const meta = await loadVaultMetadata();
        setMetadata(meta);
        setState({ status: 'unlocked', vault: result.vault, dek: result.dek });
      } else {
        setState({ status: 'locked', hasVault: true });
        throw new Error(result.error || 'Unlock failed');
      }
    } catch (error) {
      setState({ status: 'locked', hasVault: true });
      throw error;
    }
  }, [state]);

  const lock = useCallback(() => {
    setVault(null);
    setDek(null);
    setState(prev => {
      if (prev.status === 'unlocked') {
        return { status: 'locked', hasVault: true };
      }
      return prev;
    });
  }, []);

  const createVault = useCallback(async () => {
    // This is handled by the CreateVaultPage component
    throw new Error('Use CreateVaultPage for vault creation');
  }, []);

  const saveVault = useCallback(async (updatedVault: VaultPlaintextV1) => {
    if (!dek || !metadata) {
      throw new Error('Vault is not unlocked');
    }

    // Encrypt and save manifest using WASM
    const plaintext = new TextEncoder().encode(JSON.stringify(updatedVault));
    const result = await encryptRecord(dek, plaintext, metadata.vaultId, 'manifest');
    
    if (result.success && result.data) {
      const envelope = JSON.parse(result.data);
      await saveManifest(envelope);
      setVault(updatedVault);
      // Update state to include the new vault data
      setState({ status: 'unlocked', vault: updatedVault, dek });
    } else {
      throw new Error(result.error || 'Failed to save vault');
    }
  }, [dek, metadata]);

  const addWallet = useCallback(async (wallet: Omit<WalletRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!dek || !metadata || !vault) {
      throw new Error('Vault is not unlocked');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newWallet: WalletRecord = {
      ...wallet,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const updatedVault: VaultPlaintextV1 = {
      ...vault,
      wallets: [...vault.wallets, newWallet],
      updatedAt: now,
    };

    await saveVault(updatedVault);
  }, [dek, metadata, vault, saveVault]);

  const updateWallet = useCallback(async (id: string, updates: Partial<WalletRecord>) => {
    if (!dek || !metadata || !vault) {
      throw new Error('Vault is not unlocked');
    }

    const now = new Date().toISOString();
    const updatedWallets = vault.wallets.map(w => 
      w.id === id ? { ...w, ...updates, updatedAt: now } : w
    );

    const updatedVault: VaultPlaintextV1 = {
      ...vault,
      wallets: updatedWallets,
      updatedAt: now,
    };

    await saveVault(updatedVault);
  }, [dek, metadata, vault, saveVault]);

  const deleteWallet = useCallback(async (id: string) => {
    if (!dek || !metadata || !vault) {
      throw new Error('Vault is not unlocked');
    }

    const now = new Date().toISOString();
    const updatedWallets = vault.wallets.filter(w => w.id !== id);

    const updatedVault: VaultPlaintextV1 = {
      ...vault,
      wallets: updatedWallets,
      updatedAt: now,
    };

    await saveVault(updatedVault);
  }, [dek, metadata, vault, saveVault]);

  const value: VaultContextValue = {
    state,
    metadata,
    unlock,
    lock,
    createVault,
    addWallet,
    updateWallet,
    deleteWallet,
    refreshState,
  };

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault(): VaultContextValue {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}