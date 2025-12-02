import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMenuItemAnalytics, useMenuTrendingItems, type ItemPopularityData, type TrendingItemData } from '@menucraft/api-client';
import { Eye, TrendingUp, Clock, Users, Flame, BarChart3 } from 'lucide-react';
import { useState } from 'react';

interface ItemPopularityCardProps {
  orgId: string;
  venueId: string;
  menuId: string;
}

export function ItemPopularityCard({ orgId, venueId, menuId }: ItemPopularityCardProps) {
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useMenuItemAnalytics(orgId, venueId, menuId, { days });
  const { data: trendingData, isLoading: trendingLoading } = useMenuTrendingItems(orgId, venueId, menuId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Item Popularity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No analytics data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const { items, totalViews, period } = data;
  const trending = trendingData || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Item Popularity
            </CardTitle>
            <CardDescription>
              See which items get the most attention from customers
            </CardDescription>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="popular" className="space-y-4">
          <TabsList>
            <TabsTrigger value="popular">
              <Eye className="mr-2 h-4 w-4" />
              Most Viewed
            </TabsTrigger>
            <TabsTrigger value="trending">
              <Flame className="mr-2 h-4 w-4" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="popular" className="space-y-1">
            {items.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No item views recorded yet
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Total item views: {totalViews.toLocaleString()}</span>
                  <span>{period.days} days</span>
                </div>
                <PopularItemsList items={items} maxCount={items[0]?.viewCount || 1} />
              </>
            )}
          </TabsContent>

          <TabsContent value="trending" className="space-y-1">
            {trendingLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : trending.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No trending items yet - check back later
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Items with growing views (last 7 days vs previous 7 days)
                </p>
                <TrendingItemsList items={trending} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PopularItemsList({ items, maxCount }: { items: ItemPopularityData[]; maxCount: number }) {
  return (
    <div className="space-y-3">
      {items.slice(0, 10).map((item, index) => {
        const percentage = (item.viewCount / maxCount) * 100;
        const avgDuration = item.avgDurationMs ? Math.round(item.avgDurationMs / 1000) : 0;

        return (
          <div key={item.itemId} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <span className="font-medium">{item.itemName}</span>
                <span className="text-muted-foreground">({item.sectionName})</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="flex items-center gap-1" title="Unique visitors">
                  <Users className="h-3 w-3" />
                  {item.uniqueSessions}
                </span>
                {avgDuration > 0 && (
                  <span className="flex items-center gap-1" title="Average view time">
                    <Clock className="h-3 w-3" />
                    {avgDuration}s
                  </span>
                )}
                <span className="flex items-center gap-1" title="Total views">
                  <Eye className="h-3 w-3" />
                  {item.viewCount}
                </span>
              </div>
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

function TrendingItemsList({ items }: { items: TrendingItemData[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.itemId}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">{item.itemName}</p>
              <p className="text-xs text-muted-foreground">{item.sectionName}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 font-medium text-green-600">
              <TrendingUp className="h-3 w-3" />
              +{item.growthPercent}%
            </div>
            <p className="text-xs text-muted-foreground">
              {item.previousViews} &rarr; {item.recentViews} views
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
