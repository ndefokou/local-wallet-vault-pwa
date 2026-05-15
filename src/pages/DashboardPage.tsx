import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVault } from '@/lib/vault';
import { BackupDialog } from '@/components/BackupDialog';
import { WalletRecordForm } from '@/components/WalletRecordForm';
import type { WalletRecord } from '@/lib/types/vault';

export function DashboardPage() {
  const { state, metadata, lock, addWallet, updateWallet, deleteWallet } = useVault();
  const navigate = useNavigate();
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Redirect to unlock if not unlocked
  useEffect(() => {
    if (state.status === 'locked') {
      navigate('/unlock');
    }
  }, [state.status, navigate]);

  const handleLock = () => {
    lock();
    navigate('/unlock');
  };

  const handleAddWallet = async (walletData: Omit<WalletRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsAddingWallet(true);
    setError(null);
    
    try {
      await addWallet(walletData);
      setIsAddingWallet(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add wallet');
      setIsAddingWallet(false);
      throw err;
    }
  };

  const handleUpdateWallet = async (walletData: Omit<WalletRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingWallet) return;
    
    setError(null);
    try {
      await updateWallet(editingWallet.id, walletData);
      setEditingWallet(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update wallet');
      throw err;
    }
  };

  const handleDeleteWallet = async (id: string) => {
    setError(null);
    try {
      await deleteWallet(id);
      setShowDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete wallet');
    }
  };

  // Filter wallets based on search query
  const filteredWallets = useMemo(() => {
    if (state.status !== 'unlocked') return [];
    const { vault } = state;
    
    if (!searchQuery.trim()) return vault.wallets;
    
    const query = searchQuery.toLowerCase();
    return vault.wallets.filter(w => 
      w.label.toLowerCase().includes(query) ||
      w.tags.some(t => t.toLowerCase().includes(query)) ||
      w.addresses.some(a => a.address.toLowerCase().includes(query)) ||
      (w.notes && w.notes.toLowerCase().includes(query))
    );
  }, [state, searchQuery]);

  // Show loading if not unlocked
  if (state.status !== 'unlocked') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const { vault } = state;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vault Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your wallet records
          </p>
        </div>
        <Button variant="outline" onClick={handleLock}>
          Lock Vault
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="wallets" className="w-full">
        <TabsList>
          <TabsTrigger value="wallets">Wallet Records</TabsTrigger>
          <TabsTrigger value="backup">Backup & Import</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search wallets by name, tags, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => setIsAddingWallet(true)}>
              Add Wallet
            </Button>
          </div>

          {/* Add Wallet Form */}
          {isAddingWallet && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Wallet</CardTitle>
                <CardDescription>
                  Add a new wallet record to your vault
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WalletRecordForm
                  onSave={handleAddWallet}
                  onCancel={() => setIsAddingWallet(false)}
                  isSaving={isAddingWallet}
                />
              </CardContent>
            </Card>
          )}

          {/* Edit Wallet Form */}
          {editingWallet && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Wallet</CardTitle>
                <CardDescription>
                  Update wallet record
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WalletRecordForm
                  wallet={editingWallet}
                  onSave={handleUpdateWallet}
                  onCancel={() => setEditingWallet(null)}
                />
              </CardContent>
            </Card>
          )}

          {/* Wallet List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Wallets</CardTitle>
              <CardDescription>
                {filteredWallets.length} wallet{filteredWallets.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredWallets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No wallet records found.</p>
                  {searchQuery && (
                    <p className="text-sm mt-2">
                      Try a different search term or add a new wallet.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWallets.map((wallet) => (
                    <div key={wallet.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{wallet.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            {wallet.kind.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          {wallet.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {wallet.tags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-secondary px-2 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {wallet.addresses.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {wallet.addresses.map((addr, i) => (
                                <p key={i} className="text-xs font-mono text-muted-foreground">
                                  Chain {addr.chainId}: {addr.address.slice(0, 10)}...{addr.address.slice(-8)}
                                </p>
                              ))}
                            </div>
                          )}
                          {wallet.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {wallet.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingWallet(wallet)}
                          >
                            Edit
                          </Button>
                          {showDeleteConfirm === wallet.id ? (
                            <div className="flex gap-1">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteWallet(wallet.id)}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(wallet.id)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Export Backup</CardTitle>
              <CardDescription>
                Create an encrypted backup of your vault data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BackupDialog vault={vault} metadata={metadata} />
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Import Backup</CardTitle>
              <CardDescription>
                Restore your vault from an encrypted backup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Importing a backup will create a new vault with a new passkey. 
                  You will need the backup file and the backup key to import.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Import functionality requires a fresh vault. To import a backup, 
                delete your current vault first (see Settings tab).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vault Information</CardTitle>
              <CardDescription>
                Details about your vault
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Label className="font-semibold">Vault ID</Label>
                <span className="font-mono text-sm">{metadata?.vaultId || 'Unknown'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Label className="font-semibold">Created</Label>
                <span className="text-sm">
                  {metadata?.createdAt 
                    ? new Date(metadata.createdAt).toLocaleString() 
                    : 'Unknown'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Label className="font-semibold">Last Updated</Label>
                <span className="text-sm">
                  {metadata?.updatedAt 
                    ? new Date(metadata.updatedAt).toLocaleString() 
                    : 'Unknown'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Label className="font-semibold">Wallet Count</Label>
                <span className="text-sm">{vault.wallets.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle>⚠️ Warning</AlertTitle>
                <AlertDescription>
                  Deleting your vault is permanent. There is no server backup. 
                  Make sure you have exported a backup before deleting.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                To delete your vault, you must type "DELETE LOCAL VAULT" in the confirmation dialog.
              </p>
              <DeleteVaultDialog />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeleteVaultDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirmText !== 'DELETE LOCAL VAULT') {
      return;
    }

    setIsDeleting(true);
    try {
      // Clear OPFS vault data
      const root = await navigator.storage.getDirectory();
      await root.removeEntry('local-wallet-vault', { recursive: true });
      
      // Navigate to home and refresh
      setIsOpen(false);
      navigate('/');
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete vault:', error);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button variant="destructive" onClick={() => setIsOpen(true)}>
        Delete Vault
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Delete Local Vault</CardTitle>
              <CardDescription>
                This action cannot be undone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  This will permanently delete all your wallet records. 
                  There is no server backup. Make sure you have exported a backup first.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="confirm">
                  Type "DELETE LOCAL VAULT" to confirm:
                </Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE LOCAL VAULT"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setConfirmText('');
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={confirmText !== 'DELETE LOCAL VAULT' || isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Vault'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}