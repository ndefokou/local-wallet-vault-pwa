import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vault Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your wallet records
          </p>
        </div>
        <Button variant="outline">
          Lock Vault
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallet Records</CardTitle>
          <CardDescription>
            Your encrypted wallet records are stored locally
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No wallet records yet.</p>
            <p className="text-sm mt-2">
              Add your first wallet record to get started.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export Backup</CardTitle>
            <CardDescription>
              Create an encrypted backup of your vault
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Export Backup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Backup</CardTitle>
            <CardDescription>
              Restore your vault from a backup file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Import Backup
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}