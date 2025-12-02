import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '../client.js';

export interface AnalyticsSummary {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  uniqueVisitors: number;
  inRange: number;
  totalQrScans: number;
}

export interface DailyView {
  date: string;
  count: number;
}

export interface ViewByMenu {
  menuId: string;
  menuName: string;
  count: number;
}

export interface RecentView {
  id: string;
  menuId: string;
  menuName: string;
  viewedAt: string;
  referrer: string | null;
}

export interface DeviceStats {
  device: string;
  count: number;
}

export interface BrowserStats {
  browser: string;
  count: number;
}

export interface DeviceBreakdown {
  devices: DeviceStats[];
  browsers: BrowserStats[];
}

export interface QrCodeStats {
  id: string;
  code: string;
  targetType: string;
  targetId: string;
  menuName: string | null;
  scanCount: number;
  lastScannedAt: string | null;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  dailyViews: DailyView[];
  viewsByMenu: ViewByMenu[];
  recentViews: RecentView[];
  deviceBreakdown: DeviceBreakdown;
  qrCodes: QrCodeStats[];
  dateRange: DateRange;
}

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  venue: (orgId: string, venueId: string, params?: AnalyticsParams) =>
    [...analyticsKeys.all, { orgId, venueId, ...params }] as const,
};

export function useAnalytics(orgId: string, venueId: string, params?: AnalyticsParams) {
  return useQuery({
    queryKey: analyticsKeys.venue(orgId, venueId, params),
    queryFn: async () => {
      const client = getApiClient();
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.set('startDate', params.startDate);
      if (params?.endDate) searchParams.set('endDate', params.endDate);
      const query = searchParams.toString();
      const url = `/organizations/${orgId}/venues/${venueId}/analytics${query ? `?${query}` : ''}`;
      return client.get<AnalyticsData>(url);
    },
    enabled: !!orgId && !!venueId,
    refetchInterval: 60000, // Refresh every minute
  });
}

// Item Popularity Analytics

export interface ItemPopularityData {
  itemId: string;
  itemName: string;
  sectionName: string;
  sectionId: string;
  viewCount: number;
  uniqueSessions: number;
  avgDurationMs: number;
}

export interface ItemAnalyticsPeriod {
  days: number;
  startDate: string;
  endDate: string;
}

export interface ItemAnalyticsData {
  period: ItemAnalyticsPeriod;
  totalViews: number;
  items: ItemPopularityData[];
}

export interface TrendingItemData {
  itemId: string;
  itemName: string;
  sectionName: string;
  recentViews: number;
  previousViews: number;
  growthPercent: number;
}

export interface ItemAnalyticsParams {
  days?: number;
}

export const itemAnalyticsKeys = {
  all: ['itemAnalytics'] as const,
  menu: (orgId: string, venueId: string, menuId: string, params?: ItemAnalyticsParams) =>
    [...itemAnalyticsKeys.all, 'menu', { orgId, venueId, menuId, ...params }] as const,
  trending: (orgId: string, venueId: string, menuId: string) =>
    [...itemAnalyticsKeys.all, 'trending', { orgId, venueId, menuId }] as const,
};

export function useMenuItemAnalytics(
  orgId: string,
  venueId: string,
  menuId: string,
  params?: ItemAnalyticsParams
) {
  return useQuery({
    queryKey: itemAnalyticsKeys.menu(orgId, venueId, menuId, params),
    queryFn: async () => {
      const client = getApiClient();
      const searchParams = new URLSearchParams();
      if (params?.days) searchParams.set('days', params.days.toString());
      const query = searchParams.toString();
      const url = `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/analytics${query ? `?${query}` : ''}`;
      return client.get<ItemAnalyticsData>(url);
    },
    enabled: !!orgId && !!venueId && !!menuId,
    refetchInterval: 60000,
  });
}

export function useMenuTrendingItems(orgId: string, venueId: string, menuId: string) {
  return useQuery({
    queryKey: itemAnalyticsKeys.trending(orgId, venueId, menuId),
    queryFn: async () => {
      const client = getApiClient();
      const url = `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/analytics/trending`;
      return client.get<TrendingItemData[]>(url);
    },
    enabled: !!orgId && !!venueId && !!menuId,
    refetchInterval: 60000,
  });
}
