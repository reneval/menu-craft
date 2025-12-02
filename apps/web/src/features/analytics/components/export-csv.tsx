import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { AnalyticsData } from '@menucraft/api-client';

interface ExportCsvProps {
  data: AnalyticsData;
  venueName: string;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ExportCsv({ data, venueName }: ExportCsvProps) {
  const handleExport = () => {
    const { dateRange, summary, dailyViews, viewsByMenu, deviceBreakdown, qrCodes } = data;

    let csv = '';

    // Header
    csv += `Analytics Export for ${escapeCsv(venueName)}\n`;
    csv += `Date Range: ${dateRange.startDate} to ${dateRange.endDate}\n`;
    csv += `Generated: ${new Date().toISOString()}\n\n`;

    // Summary
    csv += 'SUMMARY\n';
    csv += 'Metric,Value\n';
    csv += `Total Views (All Time),${summary.total}\n`;
    csv += `Views Today,${summary.today}\n`;
    csv += `Views This Week,${summary.thisWeek}\n`;
    csv += `Views This Month,${summary.thisMonth}\n`;
    csv += `Views in Selected Range,${summary.inRange}\n`;
    csv += `Unique Visitors (in range),${summary.uniqueVisitors}\n`;
    csv += `Total QR Scans,${summary.totalQrScans}\n\n`;

    // Daily Views
    csv += 'DAILY VIEWS\n';
    csv += 'Date,Views\n';
    for (const day of dailyViews) {
      csv += `${escapeCsv(day.date)},${day.count}\n`;
    }
    csv += '\n';

    // Views by Menu
    csv += 'VIEWS BY MENU\n';
    csv += 'Menu Name,Menu ID,Views\n';
    for (const menu of viewsByMenu) {
      csv += `${escapeCsv(menu.menuName)},${escapeCsv(menu.menuId)},${menu.count}\n`;
    }
    csv += '\n';

    // Device Breakdown
    csv += 'DEVICE BREAKDOWN\n';
    csv += 'Device Type,Count\n';
    for (const device of deviceBreakdown.devices) {
      csv += `${escapeCsv(device.device)},${device.count}\n`;
    }
    csv += '\n';

    csv += 'BROWSER BREAKDOWN\n';
    csv += 'Browser,Count\n';
    for (const browser of deviceBreakdown.browsers) {
      csv += `${escapeCsv(browser.browser)},${browser.count}\n`;
    }
    csv += '\n';

    // QR Codes
    if (qrCodes.length > 0) {
      csv += 'QR CODE SCANS\n';
      csv += 'Code,Menu Name,Scan Count,Last Scanned\n';
      for (const qr of qrCodes) {
        csv += `${escapeCsv(qr.code)},${escapeCsv(qr.menuName)},${qr.scanCount},${escapeCsv(qr.lastScannedAt)}\n`;
      }
    }

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const safeVenueName = venueName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `analytics-${safeVenueName}-${dateStr}.csv`;

    downloadCsv(csv, filename);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
