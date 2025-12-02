import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVenues, useCreateQrCode } from '@menucraft/api-client';
import { useCurrentOrg, useCurrentVenue } from '@/store/organization';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Store, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface CreateQrCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateQrCodeDialog({ open, onOpenChange }: CreateQrCodeDialogProps) {
  const orgId = useCurrentOrg();
  const currentVenueId = useCurrentVenue();
  const { data: venues } = useVenues(orgId || '');
  const createQrCode = useCreateQrCode(orgId || '');

  const [targetType, setTargetType] = useState<'venue' | 'menu'>('venue');
  const [targetId, setTargetId] = useState<string>('');

  // Auto-select current venue when dialog opens
  useEffect(() => {
    if (open && currentVenueId) {
      setTargetId(currentVenueId);
    } else if (open && venues && venues.length > 0 && venues[0]) {
      setTargetId(venues[0].id);
    }
  }, [open, currentVenueId, venues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetId) return;

    createQrCode.mutate(
      { targetType, targetId },
      {
        onSuccess: () => {
          toast({
            title: 'QR code created',
            description: 'Your new QR code is ready to use.',
            variant: 'success',
          });
          setTargetId('');
          setTargetType('venue');
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: 'Failed to create QR code',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  // Preview URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const previewUrl = `${apiUrl}/public/qr/preview`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create QR Code</DialogTitle>
          <DialogDescription>
            Generate a QR code that links directly to your menu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Target Type Selection */}
            <div className="space-y-2">
              <Label>Link To</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as 'venue' | 'menu')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venue">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Venue
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                QR codes linked to venues will always show the currently active menu.
              </p>
            </div>

            {/* Venue Selection */}
            <div className="space-y-2">
              <Label>Venue</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues?.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* QR Preview */}
            {targetId && (
              <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-4">
                <QrCode className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  QR code will be generated after creation
                </p>
                <div className="rounded-lg border bg-white p-3">
                  <QRCodeSVG value={previewUrl} size={120} level="H" />
                </div>
                <p className="text-xs text-muted-foreground">Preview</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!targetId || createQrCode.isPending}>
              {createQrCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create QR Code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
