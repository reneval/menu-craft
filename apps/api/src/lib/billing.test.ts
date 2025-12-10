import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FREE_PLAN_LIMITS, type PlanLimits } from './billing.js';

// Mock database
const mockFindFirst = vi.fn();
const mockSelect = vi.fn();

vi.mock('@menucraft/database', () => ({
  db: {
    query: {
      subscriptions: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
    select: (...args: unknown[]) => mockSelect(...args),
  },
  subscriptions: { organizationId: 'org_id', status: 'status' },
  plans: {},
  venues: { organizationId: 'org_id', deletedAt: 'deleted_at' },
  menus: { venueId: 'venue_id', organizationId: 'org_id', deletedAt: 'deleted_at' },
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  isNull: vi.fn((field) => ({ type: 'isNull', field })),
  count: vi.fn(() => ({ type: 'count' })),
}));

describe('FREE_PLAN_LIMITS', () => {
  it('should have correct default values', () => {
    expect(FREE_PLAN_LIMITS).toEqual({
      venues: 1,
      menusPerVenue: 2,
      languages: 1,
      customDomains: false,
      apiAccess: false,
    });
  });
});

describe('getPlanLimits', () => {
  let getPlanLimits: typeof import('./billing.js').getPlanLimits;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const module = await import('./billing.js');
    getPlanLimits = module.getPlanLimits;
  });

  it('should return FREE_PLAN_LIMITS when no subscription exists', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await getPlanLimits('org_123');

    expect(result).toEqual(FREE_PLAN_LIMITS);
  });

  it('should return FREE_PLAN_LIMITS when subscription has no plan', async () => {
    mockFindFirst.mockResolvedValueOnce({ plan: null });

    const result = await getPlanLimits('org_123');

    expect(result).toEqual(FREE_PLAN_LIMITS);
  });

  it('should return plan limits when subscription exists', async () => {
    const customLimits: PlanLimits = {
      venues: 5,
      menusPerVenue: 10,
      languages: 5,
      customDomains: true,
      apiAccess: true,
    };

    mockFindFirst.mockResolvedValueOnce({
      plan: { limits: customLimits },
    });

    const result = await getPlanLimits('org_123');

    expect(result).toEqual(customLimits);
  });
});

describe('canCreateVenue', () => {
  let canCreateVenue: typeof import('./billing.js').canCreateVenue;
  let getPlanLimits: typeof import('./billing.js').getPlanLimits;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const module = await import('./billing.js');
    canCreateVenue = module.canCreateVenue;
    getPlanLimits = module.getPlanLimits;
  });

  it('should allow unlimited venues when limit is -1', async () => {
    mockFindFirst.mockResolvedValueOnce({
      plan: {
        limits: {
          venues: -1,
          menusPerVenue: 10,
          languages: 5,
          customDomains: true,
          apiAccess: true,
        },
      },
    });

    const result = await canCreateVenue('org_123');

    expect(result).toEqual({
      allowed: true,
      current: 0,
      limit: -1,
    });
  });

  it('should allow venue creation when under limit', async () => {
    mockFindFirst.mockResolvedValueOnce(null); // Free plan
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([{ count: 0 }]),
      }),
    });

    const result = await canCreateVenue('org_123');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
    expect(result.limit).toBe(1);
  });

  it('should prevent venue creation when at limit', async () => {
    mockFindFirst.mockResolvedValueOnce(null); // Free plan (1 venue limit)
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([{ count: 1 }]),
      }),
    });

    const result = await canCreateVenue('org_123');

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(1);
    expect(result.limit).toBe(1);
  });

  it('should handle empty count result', async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([]),
      }),
    });

    const result = await canCreateVenue('org_123');

    expect(result.current).toBe(0);
  });
});

describe('canCreateMenu', () => {
  let canCreateMenu: typeof import('./billing.js').canCreateMenu;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const module = await import('./billing.js');
    canCreateMenu = module.canCreateMenu;
  });

  it('should allow unlimited menus when limit is -1', async () => {
    mockFindFirst.mockResolvedValueOnce({
      plan: {
        limits: {
          venues: 10,
          menusPerVenue: -1,
          languages: 5,
          customDomains: true,
          apiAccess: true,
        },
      },
    });

    const result = await canCreateMenu('org_123', 'venue_123');

    expect(result).toEqual({
      allowed: true,
      current: 0,
      limit: -1,
    });
  });

  it('should allow menu creation when under limit', async () => {
    mockFindFirst.mockResolvedValueOnce(null); // Free plan (2 menus per venue)
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([{ count: 1 }]),
      }),
    });

    const result = await canCreateMenu('org_123', 'venue_123');

    expect(result.allowed).toBe(true);
    expect(result.current).toBe(1);
    expect(result.limit).toBe(2);
  });

  it('should prevent menu creation when at limit', async () => {
    mockFindFirst.mockResolvedValueOnce(null); // Free plan (2 menus per venue)
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([{ count: 2 }]),
      }),
    });

    const result = await canCreateMenu('org_123', 'venue_123');

    expect(result.allowed).toBe(false);
    expect(result.current).toBe(2);
    expect(result.limit).toBe(2);
  });
});

describe('getUsageStats', () => {
  let getUsageStats: typeof import('./billing.js').getUsageStats;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const module = await import('./billing.js');
    getUsageStats = module.getUsageStats;
  });

  it('should return venue and menu counts', async () => {
    mockFindFirst.mockResolvedValueOnce(null); // Free plan

    // First call for venues
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([{ count: 1 }]),
      }),
    });

    // Second call for menus
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([{ count: 3 }]),
      }),
    });

    const result = await getUsageStats('org_123');

    expect(result).toEqual({
      venues: {
        current: 1,
        limit: 1,
      },
      totalMenus: 3,
    });
  });

  it('should handle empty results', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([]),
      }),
    });

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce([]),
      }),
    });

    const result = await getUsageStats('org_123');

    expect(result.venues.current).toBe(0);
    expect(result.totalMenus).toBe(0);
  });
});

describe('PlanLimits interface', () => {
  it('should enforce correct shape', () => {
    const limits: PlanLimits = {
      venues: 5,
      menusPerVenue: 10,
      languages: 3,
      customDomains: true,
      apiAccess: false,
    };

    expect(limits.venues).toBe(5);
    expect(limits.menusPerVenue).toBe(10);
    expect(limits.languages).toBe(3);
    expect(limits.customDomains).toBe(true);
    expect(limits.apiAccess).toBe(false);
  });

  it('should allow -1 for unlimited values', () => {
    const limits: PlanLimits = {
      venues: -1,
      menusPerVenue: -1,
      languages: -1,
      customDomains: true,
      apiAccess: true,
    };

    expect(limits.venues).toBe(-1);
    expect(limits.menusPerVenue).toBe(-1);
  });
});
