import type { QrCodeStats } from '@menucraft/api-client';
import { QrCode, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface QrAnalyticsProps {
  qrCodes: QrCodeStats[];
  totalScans: number;
}

export function QrAnalytics({ qrCodes, totalScans }: QrAnalyticsProps) {
  if (qrCodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
        <QrCode className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No QR codes created yet</p>
        <p className="text-xs text-muted-foreground">
          Create QR codes from menu settings to track scans
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <QrCode className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{totalScans.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">Total QR code scans</p>
        </div>
      </div>

      {/* QR Code List */}
      <div className="space-y-2">
        {qrCodes.map((qr: QrCodeStats) => (
          <div
            key={qr.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {qr.menuName || 'Unknown menu'}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {qr.code}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {qr.scanCount.toLocaleString()} scan{qr.scanCount !== 1 ? 's' : ''}
              </p>
              {qr.lastScannedAt && (
                <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(qr.lastScannedAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
