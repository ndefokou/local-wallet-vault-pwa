import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { WalletRecord, WalletAddress } from '@/lib/types/vault';

interface WalletRecordFormProps {
  wallet?: WalletRecord;
  onSave: (wallet: Omit<WalletRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function WalletRecordForm({ wallet, onSave, onCancel, isSaving = false }: WalletRecordFormProps) {
  const [label, setLabel] = useState(wallet?.label || '');
  const [kind, setKind] = useState<WalletRecord['kind']>(wallet?.kind || 'watch-only');
  const [notes, setNotes] = useState(wallet?.notes || '');
  const [tags, setTags] = useState(wallet?.tags.join(', ') || '');
  const [addresses, setAddresses] = useState<WalletAddress[]>(wallet?.addresses || []);
  const [newAddress, setNewAddress] = useState('');
  const [newChainId, setNewChainId] = useState('1');
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddAddress = () => {
    if (!newAddress.trim()) {
      setError('Address cannot be empty');
      return;
    }

    const newAddr: WalletAddress = {
      chainId: parseInt(newChainId, 10) || 1,
      address: newAddress.trim(),
    };
    if (newAddressLabel.trim()) {
      newAddr.label = newAddressLabel.trim();
    }
    setAddresses([...addresses, newAddr]);
    setNewAddress('');
    setNewAddressLabel('');
    setError(null);
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError('Label is required');
      return;
    }

    const walletData: Omit<WalletRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      label: label.trim(),
      kind,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      addresses,
    };
    if (notes.trim()) {
      walletData.notes = notes.trim();
    }
    await onSave(walletData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="label">Wallet Label</Label>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="My Wallet"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="kind">Wallet Type</Label>
          <select
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as WalletRecord['kind'])}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="watch-only">Watch Only</option>
            <option value="browser-wallet">Browser Wallet</option>
            <option value="hardware-wallet">Hardware Wallet</option>
            <option value="experimental-secret">Experimental Secret</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about this wallet..."
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="personal, main, defi"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Addresses</CardTitle>
            <CardDescription>
              Add blockchain addresses for this wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {addresses.length > 0 && (
              <div className="space-y-2">
                {addresses.map((addr, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-mono text-sm">{addr.address}</p>
                      <p className="text-xs text-muted-foreground">
                        Chain ID: {addr.chainId}
                        {addr.label && ` • ${addr.label}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAddress(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="chainId">Chain ID</Label>
                  <Input
                    id="chainId"
                    value={newChainId}
                    onChange={(e) => setNewChainId(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="addressLabel">Label (optional)</Label>
                  <Input
                    id="addressLabel"
                    value={newAddressLabel}
                    onChange={(e) => setNewAddressLabel(e.target.value)}
                    placeholder="Main"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="address"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="0x..."
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleAddAddress}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : wallet ? 'Update Wallet' : 'Add Wallet'}
        </Button>
      </div>
    </form>
  );
}