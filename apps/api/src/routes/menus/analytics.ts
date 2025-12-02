import { type FastifyInstance } from 'fastify';
import { db, itemViews, menuItems, menuSections, eq, and, sql, gte, desc } from '@menucraft/database';
import { NotFoundError } from '../../utils/errors.js';

export async function analyticsRoutes(app: FastifyInstance) {
  // Get item popularity for a menu
  app.get('/', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const { days = '30' } = request.query as { days?: string };

    const daysAgo = parseInt(days, 10) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get view counts per item
    const viewCounts = await db
      .select({
        itemId: itemViews.itemId,
        viewCount: sql<number>`count(*)::int`,
        uniqueSessions: sql<number>`count(distinct ${itemViews.sessionId})::int`,
        avgDurationMs: sql<number>`avg(${itemViews.durationMs})::int`,
      })
      .from(itemViews)
      .where(
        and(
          eq(itemViews.menuId, menuId),
          gte(itemViews.viewedAt, startDate)
        )
      )
      .groupBy(itemViews.itemId)
      .orderBy(desc(sql`count(*)`));

    // Get item details
    const sections = await db.query.menuSections.findMany({
      where: eq(menuSections.menuId, menuId),
      with: {
        items: true,
      },
    });

    // Build item lookup map
    const itemMap = new Map<string, { name: string; sectionName: string; sectionId: string }>();
    for (const section of sections) {
      for (const item of section.items) {
        itemMap.set(item.id, {
          name: item.name,
          sectionName: section.name,
          sectionId: section.id,
        });
      }
    }

    // Combine data
    const itemPopularity = viewCounts.map((vc) => {
      const itemInfo = itemMap.get(vc.itemId);
      return {
        itemId: vc.itemId,
        itemName: itemInfo?.name || 'Unknown',
        sectionName: itemInfo?.sectionName || 'Unknown',
        sectionId: itemInfo?.sectionId,
        viewCount: vc.viewCount,
        uniqueSessions: vc.uniqueSessions,
        avgDurationMs: vc.avgDurationMs,
      };
    });

    // Calculate total views
    const totalViews = itemPopularity.reduce((sum, item) => sum + item.viewCount, 0);

    return {
      success: true,
      data: {
        period: {
          days: daysAgo,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
        totalViews,
        items: itemPopularity,
      },
    };
  });

  // Get trending items (items with growing views)
  app.get('/trending', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };

    // Compare last 7 days to previous 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get views for recent period
    const recentViews = await db
      .select({
        itemId: itemViews.itemId,
        viewCount: sql<number>`count(*)::int`,
      })
      .from(itemViews)
      .where(
        and(
          eq(itemViews.menuId, menuId),
          gte(itemViews.viewedAt, sevenDaysAgo)
        )
      )
      .groupBy(itemViews.itemId);

    // Get views for previous period
    const previousViews = await db
      .select({
        itemId: itemViews.itemId,
        viewCount: sql<number>`count(*)::int`,
      })
      .from(itemViews)
      .where(
        and(
          eq(itemViews.menuId, menuId),
          gte(itemViews.viewedAt, fourteenDaysAgo),
          sql`${itemViews.viewedAt} < ${sevenDaysAgo}`
        )
      )
      .groupBy(itemViews.itemId);

    // Build previous views map
    const previousMap = new Map(previousViews.map((v) => [v.itemId, v.viewCount]));

    // Calculate growth
    const trending = recentViews.map((recent) => {
      const previous = previousMap.get(recent.itemId) || 0;
      const growth = previous > 0
        ? ((recent.viewCount - previous) / previous) * 100
        : recent.viewCount > 0 ? 100 : 0;

      return {
        itemId: recent.itemId,
        recentViews: recent.viewCount,
        previousViews: previous,
        growthPercent: Math.round(growth),
      };
    });

    // Sort by growth, filter to positive growth
    const trendingItems = trending
      .filter((t) => t.growthPercent > 0)
      .sort((a, b) => b.growthPercent - a.growthPercent)
      .slice(0, 10);

    // Get item details
    const sections = await db.query.menuSections.findMany({
      where: eq(menuSections.menuId, menuId),
      with: {
        items: true,
      },
    });

    const itemMap = new Map<string, { name: string; sectionName: string }>();
    for (const section of sections) {
      for (const item of section.items) {
        itemMap.set(item.id, {
          name: item.name,
          sectionName: section.name,
        });
      }
    }

    const trendingWithNames = trendingItems.map((t) => {
      const itemInfo = itemMap.get(t.itemId);
      return {
        ...t,
        itemName: itemInfo?.name || 'Unknown',
        sectionName: itemInfo?.sectionName || 'Unknown',
      };
    });

    return {
      success: true,
      data: trendingWithNames,
    };
  });
}
