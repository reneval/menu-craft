import { QRCodeSVG } from 'qrcode.react';
import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  title?: string;
  showDownload?: boolean;
  downloadFileName?: string;
}

export function QRCodeDisplay({
  value,
  size = 200,
  title,
  showDownload = true,
  downloadFileName = 'qr-code',
}: QRCodeDisplayProps) {
  const svgRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current.querySelector('svg');
    if (!svg) return;

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with padding
    const padding = 20;
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2;

    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, padding, padding, size, size);
      URL.revokeObjectURL(svgUrl);

      // Download the image
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${downloadFileName}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = svgUrl;
  }, [size, downloadFileName]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={svgRef}
        className="rounded-lg border bg-white p-4"
      >
        <QRCodeSVG
          value={value}
          size={size}
          level="H"
          includeMargin={false}
        />
      </div>
      {title && (
        <p className="text-sm text-muted-foreground">{title}</p>
      )}
      {showDownload && (
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download QR Code
        </Button>
      )}
    </div>
  );
}
