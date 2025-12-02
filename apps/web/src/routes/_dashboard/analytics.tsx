import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAnalytics, useVenue, type ViewByMenu, type RecentView } from '@menucraft/api-client';
import { useCurrentOrg, useCurrentVenue } from '@/store/organization';
import { Loader2, Eye, Users, TrendingUp, Calendar, Clock, ExternalLink, QrCode, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { subDays, format } from 'date-fns';
import {
  DateRangePicker,
  type DateRangeValue,
  ViewsChart,
  DeviceBreakdown,
  QrAnalytics,
  ExportCsv,
} from '@/features/analytics/components';

export const Route = createFileRoute('/_dashboard/analytics')({
  component: AnalyticsPage,
});

function formatDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function AnalyticsPage() {
  const orgId = useCurrentOrg();
  const venueId = useCurrentVenue();

  // Default to last 30 days
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: formatDateStr(subDays(new Date(), 29)),
    endDate: formatDateStr(new Date()),
  });

  const { data: venueData } = useVenue(orgId || '', venueId || '');
  const { data, isLoading, error } = useAnalytics(orgId || '', venueId || '', {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (!venueId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-muted-foreground">Please select a venue to view analytics</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
            <p className="text-muted-foreground">Track menu views and visitor engagement</p>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-1 h-3 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Chart skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Failed to load analytics</p>
      </div>
    );
  }

  const { summary, dailyViews, viewsByMenu, recentViews, deviceBreakdown, qrCodes } = data;
  const venueName = venueData?.name || 'Venue';

  return (
    <div className="space-y-6">
      {/* Header with Date Picker and Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Track menu views and visitor engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <ExportCsv data={data} venueName={venueName} />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Range</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.inRange.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.today.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Views today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.thisWeek.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.uniqueVisitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Scans</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalQrScans.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total scans</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Views Over Time</CardTitle>
          <CardDescription>
            Daily menu views for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ViewsChart data={dailyViews} />
        </CardContent>
      </Card>

      {/* Tabs for different analytics sections */}
      <Tabs defaultValue="menus" className="space-y-4">
        <TabsList>
          <TabsTrigger value="menus">By Menu</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="qr">QR Codes</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="menus">
          <Card>
            <CardHeader>
              <CardTitle>Views by Menu</CardTitle>
              <CardDescription>Which menus are most popular</CardDescription>
            </CardHeader>
            <CardContent>
              <ViewsByMenuList data={viewsByMenu} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Device & Browser Breakdown</CardTitle>
              <CardDescription>How visitors access your menus</CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceBreakdown data={deviceBreakdown} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Performance</CardTitle>
              <CardDescription>Track scans from your QR codes</CardDescription>
            </CardHeader>
            <CardContent>
              <QrAnalytics qrCodes={qrCodes} totalScans={summary.totalQrScans} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest menu views</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentViewsList data={recentViews} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// List of views by menu
function ViewsByMenuList({ data }: { data: ViewByMenu[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.slice(0, 10).map((menu) => {
        const percentage = (menu.count / maxCount) * 100;

        return (
          <div key={menu.menuId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{menu.menuName}</span>
              <span className="text-muted-foreground">{menu.count} views</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Recent views list
function RecentViewsList({ data }: { data: RecentView[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center text-muted-foreground">
        No recent views
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((view) => {
        const viewedAt = new Date(view.viewedAt);
        const timeAgo = getTimeAgo(viewedAt);

        return (
          <div
            key={view.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{view.menuName}</p>
                {view.referrer && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ExternalLink className="h-3 w-3" />
                    {formatReferrer(view.referrer)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper: format time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Helper: format referrer URL
function formatReferrer(referrer: string): string {
  try {
    const url = new URL(referrer);
    return url.hostname;
  } catch {
    return referrer.substring(0, 30);
  }
}
