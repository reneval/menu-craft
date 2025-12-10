import { type FastifyInstance } from 'fastify';
import { db, menuViews, venues, menus, qrCodes, eq, and, gte, lte, sql, desc, isNull } from '@menucraft/database';
import { UAParser } from 'ua-parser-js';

interface DeviceStats {
  device: string;
  count: number;
}

interface BrowserStats {
  browser: string;
  count: number;
}

interface QrCodeStats {
  id: string;
  code: string;
  targetType: string;
  targetId: string;
  menuName: string | null;
  scanCount: number;
  lastScannedAt: string | null;
}

interface CountryStats {
  country: string;
  countryName: string;
  count: number;
}

interface LanguageStats {
  language: string;
  count: number;
}

// Country names for display
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  BE: 'Belgium',
  AT: 'Austria',
  CH: 'Switzerland',
  PT: 'Portugal',
  GR: 'Greece',
  PL: 'Poland',
  CZ: 'Czech Republic',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  IN: 'India',
  BR: 'Brazil',
  MX: 'Mexico',
  AR: 'Argentina',
  RU: 'Russia',
  UA: 'Ukraine',
  TR: 'Turkey',
  IL: 'Israel',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  ZA: 'South Africa',
  SG: 'Singapore',
  MY: 'Malaysia',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  ID: 'Indonesia',
  HK: 'Hong Kong',
  TW: 'Taiwan',
};

function parseUserAgents(userAgents: (string | null)[]): { devices: DeviceStats[]; browsers: BrowserStats[] } {
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const parser = new UAParser();

  for (const ua of userAgents) {
    if (!ua) {
      deviceCounts['Unknown'] = (deviceCounts['Unknown'] || 0) + 1;
      browserCounts['Unknown'] = (browserCounts['Unknown'] || 0) + 1;
      continue;
    }

    parser.setUA(ua);
    const result = parser.getResult();

    // Device type
    const deviceType = result.device.type || 'Desktop';
    const deviceName = deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
    deviceCounts[deviceName] = (deviceCounts[deviceName] || 0) + 1;

    // Browser
    const browserName = result.browser.name || 'Unknown';
    browserCounts[browserName] = (browserCounts[browserName] || 0) + 1;
  }

  const devices = Object.entries(deviceCounts)
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  const browsers = Object.entries(browserCounts)
    .map(([browser, count]) => ({ browser, count }))
    .sort((a, b) => b.count - a.count);

  return { devices, browsers };
}

export async function analyticsRoutes(app: FastifyInstance) {
  // Get analytics overview for a venue
  app.get('/', async (request) => {
    const { orgId, venueId } = request.params as { orgId: string; venueId: string };
    const { startDate, endDate } = request.query as { startDate?: string; endDate?: string };

    // Verify venue belongs to org
    const venue = await db.query.venues.findFirst({
      where: and(
        eq(venues.id, venueId),
        eq(venues.organizationId, orgId),
        isNull(venues.deletedAt)
      ),
    });

    if (!venue) {
      return { success: false, error: 'Venue not found' };
    }

    // Parse date range or use defaults
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Default to last 30 days if no dates provided
    const rangeStart = startDate ? new Date(startDate) : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const rangeEnd = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();

    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total views for this venue (all time)
    const [totalViews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(menuViews)
      .where(eq(menuViews.venueId, venueId));

    // Views today
    const [todayViews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(menuViews)
      .where(and(
        eq(menuViews.venueId, venueId),
        gte(menuViews.viewedAt, today)
      ));

    // Views this week
    const [weekViews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(menuViews)
      .where(and(
        eq(menuViews.venueId, venueId),
        gte(menuViews.viewedAt, weekAgo)
      ));

    // Views this month
    const [monthViews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(menuViews)
      .where(and(
        eq(menuViews.venueId, venueId),
        gte(menuViews.viewedAt, monthAgo)
      ));

    // Unique sessions in range
    const [uniqueSessions] = await db
      .select({ count: sql<number>`count(distinct session_id)::int` })
      .from(menuViews)
      .where(and(
        eq(menuViews.venueId, venueId),
        gte(menuViews.viewedAt, rangeStart),
        lte(menuViews.viewedAt, rangeEnd)
      ));

    // Views in range
    const [rangeViews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(menuViews)
      .where(and(
        eq(menuViews.venueId, venueId),
        gte(menuViews.viewedAt, rangeStart),
        lte(menuViews.viewedAt, rangeEnd)
      ));

    // Views by day for the selected range
    const dailyViews = await db
      .select({
        date: sql<string>`date_trunc('day', ${menuViews.viewedAt})::date::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(menuViews)
      .where(and(
        eq(menuViews.venueId, venueId),
        gte(menuViews.viewedAt, rangeStart),
        lte(menuViews.viewedAt, rangeEnd)
      ))
      .groupBy(sql`date_trunc('day', ${menuViews.viewedAt})`)
      .orderBy(sql`date_trunc('day', ${menuViews.viewedAt})`);

    // Views by menu in range
    const viewsByMenu = await db
      .select({
        menuId: menuViews.menuId,
        menuName: menus.name,
        count: sql<number>`count(*)::int`,
      })
      .from(menuViews)
      .innerJoin(menus, eq(menuViews.menuId, menus.id))
      .where(and(
        eq(menuViews.venueId, venueId),
        gte(menuViews.viewedAt, rangeStart),
        lte(menuViews.viewedAt, rangeEnd)
      ))
      .groupBy(menuViews.menuId, menus.name)
      .orderBy(desc(sql`count(*)`));

    // Recent views (last 10)
    const recentViews = await db
      .select({
        id: menuViews.id,
        menuId: menuViews.menuId,
        menuName: menus.name,
        viewedAt: menuViews.viewedAt,
        referrer: menuViews.referrer,
        userAgent: menuViews.userAgent,
      })
      .from(menuViews)
      .innerJoin(menus, eq(menuViews.menuId, menus.id))
      .where(eq(menuViews.venueId, venueId))
      .orderBy(desc(menuViews.viewedAt))
      .limit(10);

    // Get user agents for device breakdown
    const userAgentsResult = await db
      .select({ userAgent: menuViews.userAgent })
      .from(menuViews)
      .where(and(
        eq(menuViews.venueId, venueId),
        gte(menuViews.viewedAt, rangeStart),
        lte(menuViews.viewedAt, rangeEnd)
      ));

    const { devices, browsers } = parseUserAgents(userAgentsResult.map(r => r.userAgent));

    // Views by country in range
    const viewsByCountry = await db
      .select({
        country: menuViews.country,
        count: sql<number>`count(*)::int`,
      })
      .from(menuViews)
      .where(and(
        eq(menuViews.venueId, venueId),
        gte(menuViews.viewedAt, rangeStart),
        lte(menuViews.viewedAt, rangeEnd),
        sql`${menuViews.country} IS NOT NULL`
      ))
      .groupBy(menuViews.country)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    const countryStats: CountryStats[] = viewsByCountry.map(c => ({
      country: c.country!,
      countryName: COUNTRY_NAMES[c.country!] || c.country!,
      count: c.count,
    }));

    // Views by language in range
    const viewsByLanguage = await db
      .select({
        language: menuViews.language,
        count: sql<number>`count(*)::int`,
      })
      .from(menuViews)
      .where(and(
        eq(menuViews.venueId, venueId),
        gte(menuViews.viewedAt, rangeStart),
        lte(menuViews.viewedAt, rangeEnd),
        sql`${menuViews.language} IS NOT NULL`
      ))
      .groupBy(menuViews.language)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    const languageStats: LanguageStats[] = viewsByLanguage.map(l => ({
      language: l.language!,
      count: l.count,
    }));

    // Get all menus for this venue
    const venueMenus = await db.query.menus.findMany({
      where: and(
        eq(menus.venueId, venueId),
        isNull(menus.deletedAt)
      ),
    });

    const menuIds = venueMenus.map(m => m.id);
    const menuNameMap = new Map(venueMenus.map(m => [m.id, m.name]));

    // Get QR codes for these menus
    let qrCodeStats: QrCodeStats[] = [];
    if (menuIds.length > 0) {
      const qrCodesResult = await db
        .select()
        .from(qrCodes)
        .where(and(
          eq(qrCodes.organizationId, orgId),
          sql`${qrCodes.targetId} = ANY(${sql.raw(`ARRAY[${menuIds.map(id => `'${id}'::uuid`).join(',')}]`)})`
        ))
        .orderBy(desc(qrCodes.scanCount));

      qrCodeStats = qrCodesResult.map(qr => ({
        id: qr.id,
        code: qr.code,
        targetType: qr.targetType,
        targetId: qr.targetId,
        menuName: menuNameMap.get(qr.targetId) || null,
        scanCount: qr.scanCount,
        lastScannedAt: qr.lastScannedAt?.toISOString() || null,
      }));
    }

    // Calculate total QR scans
    const totalQrScans = qrCodeStats.reduce((sum, qr) => sum + qr.scanCount, 0);

    return {
      success: true,
      data: {
        summary: {
          total: totalViews?.count || 0,
          today: todayViews?.count || 0,
          thisWeek: weekViews?.count || 0,
          thisMonth: monthViews?.count || 0,
          uniqueVisitors: uniqueSessions?.count || 0,
          inRange: rangeViews?.count || 0,
          totalQrScans,
        },
        dailyViews,
        viewsByMenu,
        recentViews: recentViews.map(v => ({
          id: v.id,
          menuId: v.menuId,
          menuName: v.menuName,
          viewedAt: v.viewedAt,
          referrer: v.referrer,
        })),
        deviceBreakdown: {
          devices,
          browsers,
        },
        geographicBreakdown: {
          countries: countryStats,
          languages: languageStats,
        },
        qrCodes: qrCodeStats,
        dateRange: {
          startDate: rangeStart.toISOString().split('T')[0],
          endDate: rangeEnd.toISOString().split('T')[0],
        },
      },
    };
  });
}
