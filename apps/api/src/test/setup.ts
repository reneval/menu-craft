import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/menucraft_test';
process.env.CLERK_SECRET_KEY = 'test_clerk_secret';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';

// Mock external services
vi.mock('@clerk/fastify', () => ({
  clerkPlugin: vi.fn(() => async () => {}),
  getAuth: vi.fn(() => ({
    userId: 'test_user_id',
    orgId: 'test_org_id',
    sessionClaims: {
      org_id: 'test_org_id',
      metadata: { organizationId: 'test_org_id' },
    },
  })),
}));

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        create: vi.fn().mockResolvedValue({ id: 'cus_test' }),
        retrieve: vi.fn().mockResolvedValue({ id: 'cus_test' }),
      },
      subscriptions: {
        create: vi.fn().mockResolvedValue({ id: 'sub_test', status: 'active' }),
        retrieve: vi.fn().mockResolvedValue({ id: 'sub_test', status: 'active' }),
        update: vi.fn().mockResolvedValue({ id: 'sub_test', status: 'active' }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com' }),
        },
      },
      billingPortal: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com' }),
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    })),
  };
});

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mocked AI response' }],
      }),
    },
  })),
}));

// Mock DeepL
vi.mock('deepl-node', () => ({
  default: vi.fn().mockImplementation(() => ({
    translateText: vi.fn().mockResolvedValue({ text: 'Translated text' }),
  })),
}));

// Mock Redis
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
    isOpen: true,
  })),
}));

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email_test' }),
    },
  })),
}));

// Global test hooks
beforeAll(async () => {
  // Setup test database connection if needed
});

afterAll(async () => {
  // Cleanup test database connection
});

afterEach(() => {
  // Reset mocks between tests
  vi.clearAllMocks();
});

// Custom matchers and utilities
declare global {
  namespace Vi {
    interface Assertion {
      toBeValidUUID(): void;
    }
  }
}
