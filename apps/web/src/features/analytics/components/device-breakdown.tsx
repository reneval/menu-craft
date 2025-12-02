import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DeviceBreakdown as DeviceBreakdownData, DeviceStats, BrowserStats } from '@menucraft/api-client';
import { Smartphone, Monitor, Tablet, Globe } from 'lucide-react';

interface DeviceBreakdownProps {
  data: DeviceBreakdownData;
}

const DEVICE_COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(340, 70%, 50%)',
  'hsl(30, 80%, 55%)',
];

const BROWSER_COLORS = [
  'hsl(var(--primary))',
  'hsl(220, 70%, 50%)',
  'hsl(160, 60%, 45%)',
  'hsl(40, 80%, 50%)',
  'hsl(300, 60%, 50%)',
  'hsl(0, 70%, 50%)',
];

function getDeviceIcon(device: string) {
  switch (device.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    case 'desktop':
      return <Monitor className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
}

export function DeviceBreakdown({ data }: DeviceBreakdownProps) {
  const { devices, browsers } = data;

  const totalDevices = devices.reduce((sum: number, d: DeviceStats) => sum + d.count, 0);
  const totalBrowsers = browsers.reduce((sum: number, b: BrowserStats) => sum + b.count, 0);

  if (totalDevices === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No device data available</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Device Types */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Device Types</h4>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={devices as unknown as Record<string, unknown>[]}
                dataKey="count"
                nameKey="device"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
              >
                {devices.map((_: DeviceStats, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={DEVICE_COLORS[index % DEVICE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0]?.payload as { device: string; count: number };
                  const percent = ((data.count / totalDevices) * 100).toFixed(1);
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="text-sm font-medium">{data.device}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.count} ({percent}%)
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3">
          {devices.map((device: DeviceStats, index: number) => (
            <div key={device.device} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: DEVICE_COLORS[index % DEVICE_COLORS.length] }}
              />
              <span className="flex items-center gap-1 text-sm">
                {getDeviceIcon(device.device)}
                {device.device}
              </span>
              <span className="text-sm text-muted-foreground">
                ({((device.count / totalDevices) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Browser Distribution */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Browsers</h4>
        <div className="space-y-2">
          {browsers.slice(0, 5).map((browser: BrowserStats, index: number) => {
            const percent = (browser.count / totalBrowsers) * 100;
            return (
              <div key={browser.browser} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{browser.browser}</span>
                  <span className="text-muted-foreground">
                    {browser.count} ({percent.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: BROWSER_COLORS[index % BROWSER_COLORS.length],
                    }}
                  />
                </div>
              </div>
            );
          })}
          {browsers.length > 5 && (
            <p className="text-xs text-muted-foreground">
              +{browsers.length - 5} more browser{browsers.length - 5 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
