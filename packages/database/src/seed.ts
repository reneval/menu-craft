import { db, postgresClient } from './client';
import { plans } from './schema/plans';
import { organizations } from './schema/organizations';
import { users, organizationUsers } from './schema/users';
import { venues } from './schema/venues';
import { menus } from './schema/menus';
import { menuSections } from './schema/menu-sections';
import { menuItems } from './schema/menu-items';

async function seed() {
  console.log('Seeding database...');

  // Seed plans
  await db.insert(plans).values([
    {
      name: 'Free',
      slug: 'free',
      stripePriceId: 'price_free',
      monthlyPrice: 0,
      features: ['1 venue', '2 menus per venue', 'QR codes', 'Basic theming'],
      limits: {
        venues: 1,
        menusPerVenue: 2,
        languages: 1,
        customDomains: false,
        apiAccess: false,
      },
      isActive: true,
    },
    {
      name: 'Pro',
      slug: 'pro',
      stripePriceId: 'price_pro_monthly',
      monthlyPrice: 2900, // $29
      features: [
        '5 venues',
        'Unlimited menus',
        'Multi-language',
        'Custom theming',
        'Analytics',
        'Priority support',
      ],
      limits: {
        venues: 5,
        menusPerVenue: -1, // unlimited
        languages: 10,
        customDomains: false,
        apiAccess: true,
      },
      isActive: true,
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      stripePriceId: 'price_enterprise_monthly',
      monthlyPrice: 9900, // $99
      features: [
        'Unlimited venues',
        'Unlimited menus',
        'All languages',
        'Custom domains',
        'API access',
        'White-label',
        'Dedicated support',
      ],
      limits: {
        venues: -1,
        menusPerVenue: -1,
        languages: -1,
        customDomains: true,
        apiAccess: true,
      },
      isActive: true,
    },
  ]).onConflictDoNothing();

  // Seed demo organization
  const [org] = await db.insert(organizations).values({
    name: 'Demo Restaurant Group',
    slug: 'demo-restaurant',
    settings: {},
  }).onConflictDoNothing().returning();

  if (org) {
    console.log('Created demo organization:', org.id);

    // Create demo user
    const [user] = await db.insert(users).values({
      clerkUserId: 'demo_user_123',
      email: 'demo@menucraft.io',
      firstName: 'Demo',
      lastName: 'User',
    }).onConflictDoNothing().returning();

    if (user) {
      await db.insert(organizationUsers).values({
        organizationId: org.id,
        userId: user.id,
        role: 'owner',
      }).onConflictDoNothing();
    }

    // Create demo venue
    const [venue] = await db.insert(venues).values({
      organizationId: org.id,
      name: 'The Italian Place',
      slug: 'italian-place',
      timezone: 'America/New_York',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
      },
    }).onConflictDoNothing().returning();

    if (venue) {
      console.log('Created demo venue:', venue.id);

      // Create demo menu
      const [menu] = await db.insert(menus).values({
        organizationId: org.id,
        venueId: venue.id,
        name: 'Dinner Menu',
        slug: 'dinner',
        status: 'published',
        themeConfig: {},
      }).onConflictDoNothing().returning();

      if (menu) {
        console.log('Created demo menu:', menu.id);

        // Create sections
        const [appetizers] = await db.insert(menuSections).values({
          organizationId: org.id,
          menuId: menu.id,
          name: 'Appetizers',
          description: 'Start your meal with our delicious starters',
          sortOrder: 0,
        }).returning();

        const [mains] = await db.insert(menuSections).values({
          organizationId: org.id,
          menuId: menu.id,
          name: 'Main Courses',
          description: 'Our signature Italian dishes',
          sortOrder: 1,
        }).returning();

        const [desserts] = await db.insert(menuSections).values({
          organizationId: org.id,
          menuId: menu.id,
          name: 'Desserts',
          description: 'Sweet endings to your meal',
          sortOrder: 2,
        }).returning();

        // Create items
        if (appetizers) {
          await db.insert(menuItems).values([
            {
              organizationId: org.id,
              sectionId: appetizers.id,
              name: 'Bruschetta',
              description: 'Toasted bread with fresh tomatoes, basil, and garlic',
              priceType: 'fixed',
              priceAmount: 1200,
              dietaryTags: ['vegetarian'],
              allergens: ['gluten'],
              sortOrder: 0,
            },
            {
              organizationId: org.id,
              sectionId: appetizers.id,
              name: 'Calamari Fritti',
              description: 'Crispy fried squid with marinara sauce',
              priceType: 'fixed',
              priceAmount: 1600,
              dietaryTags: [],
              allergens: ['gluten', 'crustaceans'],
              sortOrder: 1,
            },
            {
              organizationId: org.id,
              sectionId: appetizers.id,
              name: 'Caprese Salad',
              description: 'Fresh mozzarella, tomatoes, and basil with balsamic glaze',
              priceType: 'fixed',
              priceAmount: 1400,
              dietaryTags: ['vegetarian', 'gluten_free'],
              allergens: ['milk'],
              sortOrder: 2,
            },
          ]);
        }

        if (mains) {
          await db.insert(menuItems).values([
            {
              organizationId: org.id,
              sectionId: mains.id,
              name: 'Spaghetti Carbonara',
              description: 'Classic Roman pasta with eggs, pecorino, guanciale, and black pepper',
              priceType: 'fixed',
              priceAmount: 2200,
              dietaryTags: [],
              allergens: ['gluten', 'eggs', 'milk'],
              sortOrder: 0,
            },
            {
              organizationId: org.id,
              sectionId: mains.id,
              name: 'Margherita Pizza',
              description: 'San Marzano tomatoes, fresh mozzarella, basil, and olive oil',
              priceType: 'fixed',
              priceAmount: 1800,
              dietaryTags: ['vegetarian'],
              allergens: ['gluten', 'milk'],
              sortOrder: 1,
            },
            {
              organizationId: org.id,
              sectionId: mains.id,
              name: 'Osso Buco',
              description: 'Braised veal shanks with gremolata and risotto Milanese',
              priceType: 'fixed',
              priceAmount: 3600,
              dietaryTags: ['gluten_free'],
              allergens: ['milk'],
              sortOrder: 2,
            },
            {
              organizationId: org.id,
              sectionId: mains.id,
              name: 'Eggplant Parmigiana',
              description: 'Layers of breaded eggplant, marinara, and melted mozzarella',
              priceType: 'fixed',
              priceAmount: 2000,
              dietaryTags: ['vegetarian'],
              allergens: ['gluten', 'milk', 'eggs'],
              sortOrder: 3,
            },
          ]);
        }

        if (desserts) {
          await db.insert(menuItems).values([
            {
              organizationId: org.id,
              sectionId: desserts.id,
              name: 'Tiramisu',
              description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone',
              priceType: 'fixed',
              priceAmount: 1000,
              dietaryTags: ['vegetarian'],
              allergens: ['gluten', 'eggs', 'milk'],
              sortOrder: 0,
            },
            {
              organizationId: org.id,
              sectionId: desserts.id,
              name: 'Panna Cotta',
              description: 'Vanilla cream custard with berry compote',
              priceType: 'fixed',
              priceAmount: 900,
              dietaryTags: ['vegetarian', 'gluten_free'],
              allergens: ['milk'],
              sortOrder: 1,
            },
            {
              organizationId: org.id,
              sectionId: desserts.id,
              name: 'Gelato Trio',
              description: 'Three scoops of our house-made gelato',
              priceType: 'fixed',
              priceAmount: 800,
              dietaryTags: ['vegetarian', 'gluten_free'],
              allergens: ['milk', 'nuts'],
              sortOrder: 2,
            },
          ]);
        }

        console.log('Created demo menu items');
      }
    }
  }

  console.log('Seed complete!');
  await postgresClient.end();
}

seed().catch((err) => {
  console.error('Seed failed!', err);
  process.exit(1);
});
