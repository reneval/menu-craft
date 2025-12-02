import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, QrCode as QrCodeIcon, Loader2, Trash2, Copy, ExternalLink, ScanLine } from 'lucide-react';
import { useQrCodes, useDeleteQrCode, type QrCodeWithTarget } from '@menucraft/api-client';
import { useCurrentOrg } from '@/store/organization';
import { QRCodeDisplay } from '@/components/qr-code';
import { CreateQrCodeDialog } from '@/features/qr-codes/components/create-qr-dialog';
import { toast } from '@/components/ui/use-toast';

export const Route = createFileRoute('/_dashboard/qr-codes/')({
  component: QrCodesPage,
});

function QrCodesPage() {
  const orgId = useCurrentOrg();
  const { data: qrCodes, isLoading, error } = useQrCodes(orgId || '');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteQrCode = useDeleteQrCode(orgId || '');

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteQrCode.mutateAsync(deleteId);
      toast({ title: 'QR code deleted' });
    } catch {
      toast({ title: 'Failed to delete QR code', variant: 'destructive' });
    }
    setDeleteId(null);
  };

  const handleCopyLink = async (code: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const link = `${apiUrl}/public/qr/${code}`;
    await navigator.clipboard.writeText(link);
    toast({ title: 'Link copied to clipboard' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive">Failed to load QR codes</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const codeList = qrCodes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">QR Codes</h2>
          <p className="text-muted-foreground">Generate and manage QR codes for your venues and menus</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create QR Code
        </Button>
      </div>

      {codeList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCodeIcon className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No QR codes yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a QR code to let customers easily access your menus.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create QR Code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {codeList.map((qrCode) => (
            <QrCodeCard
              key={qrCode.id}
              qrCode={qrCode}
              onCopyLink={() => handleCopyLink(qrCode.code)}
              onDelete={() => setDeleteId(qrCode.id)}
            />
          ))}
        </div>
      )}

      <CreateQrCodeDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete QR Code?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this QR code. Anyone scanning it will see an error.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteQrCode.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteQrCode.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteQrCode.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface QrCodeCardProps {
  qrCode: QrCodeWithTarget;
  onCopyLink: () => void;
  onDelete: () => void;
}

function QrCodeCard({ qrCode, onCopyLink, onDelete }: QrCodeCardProps) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const qrUrl = `${apiUrl}/public/qr/${qrCode.code}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{qrCode.targetName}</CardTitle>
            <CardDescription className="capitalize">{qrCode.targetType}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <QRCodeDisplay value={qrUrl} size={150} showDownload={true} downloadFileName={`qr-${qrCode.targetName}`} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ScanLine className="h-4 w-4" />
            <span>{qrCode.scanCount} scans</span>
          </div>
          {qrCode.lastScannedAt && (
            <span className="text-xs text-muted-foreground">
              Last: {new Date(qrCode.lastScannedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={qrUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
