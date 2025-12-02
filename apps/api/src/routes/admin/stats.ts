import { type FastifyInstance } from 'fastify';
import { db, organizations, users, venues, menus, subscriptions, menuViews, count, sql, gte, and } from '@menucraft/database';

export async function statsRoutes(app: FastifyInstance) {
  // Get dashboard overview stats
  app.get('/', async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      totalOrgs,
      totalUsers,
      totalVenues,
      totalMenus,
      activeSubscriptions,
      newOrgsThisMonth,
      newUsersThisMonth,
      menuViewsThisWeek,
    ] = await Promise.all([
      db.select({ count: count() }).from(organizations),
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(venues),
      db.select({ count: count() }).from(menus),
      db
        .select({ count: count() })
        .from(subscriptions)
        .where(sql`${subscriptions.status} = 'active'`),
      db
        .select({ count: count() })
        .from(organizations)
        .where(gte(organizations.createdAt, thirtyDaysAgo)),
      db
        .select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, thirtyDaysAgo)),
      db
        .select({ count: count() })
        .from(menuViews)
        .where(gte(menuViews.viewedAt, sevenDaysAgo)),
    ]);

    return {
      success: true,
      data: {
        totals: {
          organizations: totalOrgs[0]?.count ?? 0,
          users: totalUsers[0]?.count ?? 0,
          venues: totalVenues[0]?.count ?? 0,
          menus: totalMenus[0]?.count ?? 0,
          activeSubscriptions: activeSubscriptions[0]?.count ?? 0,
        },
        growth: {
          newOrganizationsLast30Days: newOrgsThisMonth[0]?.count ?? 0,
          newUsersLast30Days: newUsersThisMonth[0]?.count ?? 0,
        },
        activity: {
          menuViewsLast7Days: menuViewsThisWeek[0]?.count ?? 0,
        },
      },
    };
  });

  // Get growth chart data
  app.get('/growth', async (request) => {
    const { days = 30 } = request.query as { days?: number };
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get daily signups
    const dailySignups = await db
      .select({
        date: sql<string>`DATE(${organizations.createdAt})`,
        count: count(),
      })
      .from(organizations)
      .where(gte(organizations.createdAt, startDate))
      .groupBy(sql`DATE(${organizations.createdAt})`)
      .orderBy(sql`DATE(${organizations.createdAt})`);

    return {
      success: true,
      data: {
        period: { days, startDate: startDate.toISOString() },
        dailySignups,
      },
    };
  });
}
