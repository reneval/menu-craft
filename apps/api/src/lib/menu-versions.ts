import {
  db,
  menus,
  menuSections,
  menuItems,
  menuItemOptions,
  menuVersions,
  eq,
  and,
  desc,
  asc,
  isNull,
  type NewMenuVersion,
} from '@menucraft/database';

export type ChangeType = 'manual_save' | 'publish' | 'auto_save' | 'rollback';

export interface MenuSnapshot {
  menu: {
    name: string;
    slug: string;
    status: string;
    themeConfig: Record<string, unknown>;
    defaultLanguage: string;
    enabledLanguages: string[];
    sortOrder: number;
  };
  sections: Array<{
    id: string;
    name: string;
    description: string | null;
    sortOrder: number;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      priceType: string;
      priceAmount: number | null;
      dietaryTags: string[];
      allergens: string[];
      imageUrl: string | null;
      isAvailable: boolean;
      sortOrder: number;
      options: Array<{
        id: string;
        optionGroup: string;
        name: string;
        priceModifier: number | null;
        sortOrder: number;
      }>;
    }>;
  }>;
}

/**
 * Create a snapshot of the current menu state
 */
export async function createMenuSnapshot(menuId: string): Promise<MenuSnapshot | null> {
  const menu = await db.query.menus.findFirst({
    where: and(eq(menus.id, menuId), isNull(menus.deletedAt)),
    with: {
      sections: {
        orderBy: [asc(menuSections.sortOrder)],
        with: {
          items: {
            orderBy: [asc(menuItems.sortOrder)],
            with: {
              options: {
                orderBy: [asc(menuItemOptions.sortOrder)],
              },
            },
          },
        },
      },
    },
  });

  if (!menu) return null;

  const snapshot: MenuSnapshot = {
    menu: {
      name: menu.name,
      slug: menu.slug,
      status: menu.status,
      themeConfig: menu.themeConfig as Record<string, unknown>,
      defaultLanguage: menu.defaultLanguage,
      enabledLanguages: menu.enabledLanguages as string[],
      sortOrder: menu.sortOrder,
    },
    sections: menu.sections.map((section) => ({
      id: section.id,
      name: section.name,
      description: section.description,
      sortOrder: section.sortOrder,
      items: section.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        priceType: item.priceType,
        priceAmount: item.priceAmount,
        dietaryTags: (item.dietaryTags as string[]) || [],
        allergens: (item.allergens as string[]) || [],
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
        options: item.options.map((opt) => ({
          id: opt.id,
          optionGroup: opt.optionGroup,
          name: opt.name,
          priceModifier: opt.priceModifier,
          sortOrder: opt.sortOrder,
        })),
      })),
    })),
  };

  return snapshot;
}

/**
 * Get the next version number for a menu
 */
async function getNextVersionNumber(menuId: string): Promise<number> {
  const latestVersion = await db.query.menuVersions.findFirst({
    where: eq(menuVersions.menuId, menuId),
    orderBy: [desc(menuVersions.version)],
  });

  return latestVersion ? latestVersion.version + 1 : 1;
}

/**
 * Create a new version for a menu
 */
export async function createMenuVersion(
  menuId: string,
  organizationId: string,
  changeType: ChangeType,
  changeDescription?: string,
  createdBy?: string
): Promise<{ id: string; version: number } | null> {
  const snapshot = await createMenuSnapshot(menuId);
  if (!snapshot) return null;

  const version = await getNextVersionNumber(menuId);
  const snapshotString = JSON.stringify(snapshot);
  const snapshotSize = Buffer.byteLength(snapshotString, 'utf8');

  const [newVersion] = await db
    .insert(menuVersions)
    .values({
      menuId,
      organizationId,
      version,
      changeType,
      changeDescription,
      createdBy,
      snapshot,
      snapshotSize,
    } as NewMenuVersion)
    .returning();

  if (!newVersion) return null;

  return { id: newVersion.id, version: newVersion.version };
}

/**
 * Get version history for a menu
 */
export async function getMenuVersionHistory(
  menuId: string,
  limit = 20,
  offset = 0
): Promise<{
  versions: Array<{
    id: string;
    version: number;
    changeType: string;
    changeDescription: string | null;
    createdAt: Date;
    snapshotSize: number | null;
  }>;
  total: number;
}> {
  const versions = await db.query.menuVersions.findMany({
    where: eq(menuVersions.menuId, menuId),
    orderBy: [desc(menuVersions.version)],
    limit,
    offset,
    columns: {
      id: true,
      version: true,
      changeType: true,
      changeDescription: true,
      createdAt: true,
      snapshotSize: true,
    },
    with: {
      createdByUser: {
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Get total count
  const allVersions = await db.query.menuVersions.findMany({
    where: eq(menuVersions.menuId, menuId),
    columns: { id: true },
  });

  return {
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      changeType: v.changeType,
      changeDescription: v.changeDescription,
      createdAt: v.createdAt,
      snapshotSize: v.snapshotSize,
      createdBy: v.createdByUser,
    })),
    total: allVersions.length,
  };
}

/**
 * Get a specific version
 */
export async function getMenuVersion(versionId: string) {
  return db.query.menuVersions.findFirst({
    where: eq(menuVersions.id, versionId),
    with: {
      createdByUser: {
        columns: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

/**
 * Restore a menu to a specific version
 * This creates new records (not a true restore) to maintain data integrity
 */
export async function restoreMenuVersion(
  versionId: string,
  userId?: string
): Promise<{ success: boolean; newVersionId?: string; error?: string }> {
  const version = await db.query.menuVersions.findFirst({
    where: eq(menuVersions.id, versionId),
  });

  if (!version) {
    return { success: false, error: 'Version not found' };
  }

  const snapshot = version.snapshot as MenuSnapshot;
  const menuId = version.menuId;

  // First, create a backup of current state before rollback
  await createMenuVersion(
    menuId,
    version.organizationId,
    'rollback',
    `Backup before rollback to version ${version.version}`,
    userId
  );

  // Update the menu basic info
  await db
    .update(menus)
    .set({
      name: snapshot.menu.name,
      slug: snapshot.menu.slug,
      status: snapshot.menu.status as 'draft' | 'published',
      themeConfig: snapshot.menu.themeConfig,
      defaultLanguage: snapshot.menu.defaultLanguage,
      enabledLanguages: snapshot.menu.enabledLanguages,
      sortOrder: snapshot.menu.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(menus.id, menuId));

  // Delete all existing sections (cascade deletes items and options)
  const existingSections = await db.query.menuSections.findMany({
    where: eq(menuSections.menuId, menuId),
    columns: { id: true },
  });

  for (const section of existingSections) {
    await db.delete(menuSections).where(eq(menuSections.id, section.id));
  }

  // Recreate sections, items, and options from snapshot
  for (const sectionData of snapshot.sections) {
    const [newSection] = await db
      .insert(menuSections)
      .values({
        organizationId: version.organizationId,
        menuId,
        name: sectionData.name,
        description: sectionData.description,
        sortOrder: sectionData.sortOrder,
      })
      .returning();

    if (!newSection) continue;

    for (const itemData of sectionData.items) {
      const [newItem] = await db
        .insert(menuItems)
        .values({
          organizationId: version.organizationId,
          sectionId: newSection.id,
          name: itemData.name,
          description: itemData.description,
          priceType: itemData.priceType as 'fixed' | 'variable' | 'market_price',
          priceAmount: itemData.priceAmount,
          dietaryTags: itemData.dietaryTags,
          allergens: itemData.allergens,
          imageUrl: itemData.imageUrl,
          isAvailable: itemData.isAvailable,
          sortOrder: itemData.sortOrder,
        })
        .returning();

      if (!newItem) continue;

      for (const optionData of itemData.options) {
        await db.insert(menuItemOptions).values({
          organizationId: version.organizationId,
          menuItemId: newItem.id,
          optionGroup: optionData.optionGroup,
          name: optionData.name,
          priceModifier: optionData.priceModifier ?? undefined,
          sortOrder: optionData.sortOrder,
        });
      }
    }
  }

  // Create a new version marking the rollback
  const newVersion = await createMenuVersion(
    menuId,
    version.organizationId,
    'rollback',
    `Rolled back to version ${version.version}`,
    userId
  );

  return { success: true, newVersionId: newVersion?.id };
}

// Types for detailed diff
export interface ItemChange {
  id: string;
  name: string;
  sectionName: string;
  changes?: {
    name?: { from: string; to: string };
    description?: { from: string | null; to: string | null };
    priceAmount?: { from: number | null; to: number | null };
    priceType?: { from: string; to: string };
    isAvailable?: { from: boolean; to: boolean };
    dietaryTags?: { from: string[]; to: string[] };
  };
}

export interface SectionChange {
  id: string;
  name: string;
  changes?: {
    name?: { from: string; to: string };
    description?: { from: string | null; to: string | null };
  };
  items: ItemChange[];
}

export interface DetailedChanges {
  menuChanges: Record<string, { from: unknown; to: unknown }>;
  sections: {
    added: SectionChange[];
    removed: SectionChange[];
    modified: SectionChange[];
    unchanged: SectionChange[];
  };
  summary: {
    sectionsAdded: number;
    sectionsRemoved: number;
    sectionsModified: number;
    itemsAdded: number;
    itemsRemoved: number;
    itemsModified: number;
  };
}

/**
 * Compare two versions and return the differences (legacy - for backward compatibility)
 */
export function compareVersions(
  versionA: MenuSnapshot,
  versionB: MenuSnapshot
): {
  menuChanges: Record<string, { from: unknown; to: unknown }>;
  sectionsAdded: string[];
  sectionsRemoved: string[];
  sectionsModified: string[];
  itemsAdded: number;
  itemsRemoved: number;
  itemsModified: number;
} {
  const detailed = compareVersionsDetailed(versionA, versionB);

  return {
    menuChanges: detailed.menuChanges,
    sectionsAdded: detailed.sections.added.map(s => s.name),
    sectionsRemoved: detailed.sections.removed.map(s => s.name),
    sectionsModified: detailed.sections.modified.map(s => s.name),
    itemsAdded: detailed.summary.itemsAdded,
    itemsRemoved: detailed.summary.itemsRemoved,
    itemsModified: detailed.summary.itemsModified,
  };
}

/**
 * Compare two versions and return detailed differences including item-level changes
 */
export function compareVersionsDetailed(
  versionA: MenuSnapshot,
  versionB: MenuSnapshot
): DetailedChanges {
  const changes: DetailedChanges = {
    menuChanges: {},
    sections: {
      added: [],
      removed: [],
      modified: [],
      unchanged: [],
    },
    summary: {
      sectionsAdded: 0,
      sectionsRemoved: 0,
      sectionsModified: 0,
      itemsAdded: 0,
      itemsRemoved: 0,
      itemsModified: 0,
    },
  };

  // Compare menu properties
  const menuProps = ['name', 'slug', 'status', 'defaultLanguage', 'sortOrder'] as const;
  for (const prop of menuProps) {
    if (versionA.menu[prop] !== versionB.menu[prop]) {
      changes.menuChanges[prop] = {
        from: versionA.menu[prop],
        to: versionB.menu[prop],
      };
    }
  }

  // Compare sections
  const sectionsA = new Map(versionA.sections.map((s) => [s.id, s]));
  const sectionsB = new Map(versionB.sections.map((s) => [s.id, s]));

  // Process sections in B (current)
  for (const [id, sectionB] of sectionsB) {
    if (!sectionsA.has(id)) {
      // New section
      const addedSection: SectionChange = {
        id: sectionB.id,
        name: sectionB.name,
        items: sectionB.items.map(item => ({
          id: item.id,
          name: item.name,
          sectionName: sectionB.name,
        })),
      };
      changes.sections.added.push(addedSection);
      changes.summary.sectionsAdded++;
      changes.summary.itemsAdded += sectionB.items.length;
    } else {
      // Existing section - check for modifications
      const sectionA = sectionsA.get(id)!;
      const sectionChanges: SectionChange['changes'] = {};

      if (sectionB.name !== sectionA.name) {
        sectionChanges.name = { from: sectionA.name, to: sectionB.name };
      }
      if (sectionB.description !== sectionA.description) {
        sectionChanges.description = { from: sectionA.description, to: sectionB.description };
      }

      // Compare items within section
      const itemsA = new Map(sectionA.items.map((i) => [i.id, i]));
      const itemsB = new Map(sectionB.items.map((i) => [i.id, i]));

      const addedItems: ItemChange[] = [];
      const removedItems: ItemChange[] = [];
      const modifiedItems: ItemChange[] = [];

      // Check for added and modified items
      for (const [itemId, itemB] of itemsB) {
        if (!itemsA.has(itemId)) {
          addedItems.push({
            id: itemB.id,
            name: itemB.name,
            sectionName: sectionB.name,
          });
          changes.summary.itemsAdded++;
        } else {
          const itemA = itemsA.get(itemId)!;
          const itemChanges: ItemChange['changes'] = {};

          if (itemB.name !== itemA.name) {
            itemChanges.name = { from: itemA.name, to: itemB.name };
          }
          if (itemB.description !== itemA.description) {
            itemChanges.description = { from: itemA.description, to: itemB.description };
          }
          if (itemB.priceAmount !== itemA.priceAmount) {
            itemChanges.priceAmount = { from: itemA.priceAmount, to: itemB.priceAmount };
          }
          if (itemB.priceType !== itemA.priceType) {
            itemChanges.priceType = { from: itemA.priceType, to: itemB.priceType };
          }
          if (itemB.isAvailable !== itemA.isAvailable) {
            itemChanges.isAvailable = { from: itemA.isAvailable, to: itemB.isAvailable };
          }
          if (JSON.stringify(itemB.dietaryTags) !== JSON.stringify(itemA.dietaryTags)) {
            itemChanges.dietaryTags = { from: itemA.dietaryTags, to: itemB.dietaryTags };
          }

          if (Object.keys(itemChanges).length > 0) {
            modifiedItems.push({
              id: itemB.id,
              name: itemB.name,
              sectionName: sectionB.name,
              changes: itemChanges,
            });
            changes.summary.itemsModified++;
          }
        }
      }

      // Check for removed items
      for (const [itemId, itemA] of itemsA) {
        if (!itemsB.has(itemId)) {
          removedItems.push({
            id: itemA.id,
            name: itemA.name,
            sectionName: sectionA.name,
          });
          changes.summary.itemsRemoved++;
        }
      }

      const hasSectionChanges = Object.keys(sectionChanges).length > 0;
      const hasItemChanges = addedItems.length > 0 || removedItems.length > 0 || modifiedItems.length > 0;

      if (hasSectionChanges || hasItemChanges) {
        changes.sections.modified.push({
          id: sectionB.id,
          name: sectionB.name,
          changes: hasSectionChanges ? sectionChanges : undefined,
          items: [...addedItems, ...modifiedItems, ...removedItems].map(item => ({
            ...item,
            _type: addedItems.includes(item) ? 'added' : modifiedItems.includes(item) ? 'modified' : 'removed',
          })) as ItemChange[],
        });
        changes.summary.sectionsModified++;
      } else {
        changes.sections.unchanged.push({
          id: sectionB.id,
          name: sectionB.name,
          items: [],
        });
      }
    }
  }

  // Check for removed sections
  for (const [id, sectionA] of sectionsA) {
    if (!sectionsB.has(id)) {
      const removedSection: SectionChange = {
        id: sectionA.id,
        name: sectionA.name,
        items: sectionA.items.map(item => ({
          id: item.id,
          name: item.name,
          sectionName: sectionA.name,
        })),
      };
      changes.sections.removed.push(removedSection);
      changes.summary.sectionsRemoved++;
      changes.summary.itemsRemoved += sectionA.items.length;
    }
  }

  return changes;
}
