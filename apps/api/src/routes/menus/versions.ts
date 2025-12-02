import { type FastifyInstance } from 'fastify';
import { db, menuVersions, menus, eq, and, isNull, desc } from '@menucraft/database';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';
import {
  createMenuVersion,
  getMenuVersionHistory,
  getMenuVersion,
  restoreMenuVersion,
  compareVersions,
  compareVersionsDetailed,
  type MenuSnapshot,
  type DetailedChanges,
} from '../../lib/menu-versions.js';
import { z } from 'zod';
import { validate } from '../../utils/validation.js';

const CreateVersionSchema = z.object({
  description: z.string().optional(),
});

export async function versionRoutes(app: FastifyInstance) {
  // List versions for a menu
  app.get('/', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    // Verify menu exists
    const menu = await db.query.menus.findFirst({
      where: and(eq(menus.id, menuId), eq(menus.organizationId, orgId), isNull(menus.deletedAt)),
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    const offset = (page - 1) * limit;
    const { versions, total } = await getMenuVersionHistory(menuId, limit, offset);

    return {
      success: true,
      data: {
        versions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  });

  // Create a manual version/checkpoint
  app.post('/', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const body = validate(CreateVersionSchema, request.body);
    const tenantOrgId = request.tenantContext?.organizationId;
    const userId = request.tenantContext?.userId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    // Verify menu exists
    const menu = await db.query.menus.findFirst({
      where: and(eq(menus.id, menuId), eq(menus.organizationId, orgId), isNull(menus.deletedAt)),
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    const version = await createMenuVersion(
      menuId,
      orgId,
      'manual_save',
      body.description || 'Manual checkpoint',
      userId
    );

    if (!version) {
      return { success: false, error: { code: 'VERSION_FAILED', message: 'Failed to create version' } };
    }

    await request.audit({
      action: 'menu.update',
      resourceType: 'menu_version',
      resourceId: version.id,
      metadata: { menuId, version: version.version, type: 'manual_save' },
    });

    return { success: true, data: version };
  });

  // Get a specific version
  app.get('/:versionId', async (request) => {
    const { orgId, menuId, versionId } = request.params as {
      orgId: string;
      menuId: string;
      versionId: string;
    };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    const version = await getMenuVersion(versionId);

    if (!version || version.menuId !== menuId || version.organizationId !== orgId) {
      throw new NotFoundError('Version');
    }

    return { success: true, data: version };
  });

  // Restore menu to a specific version
  app.post('/:versionId/restore', async (request) => {
    const { orgId, menuId, versionId } = request.params as {
      orgId: string;
      menuId: string;
      versionId: string;
    };
    const tenantOrgId = request.tenantContext?.organizationId;
    const userId = request.tenantContext?.userId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    // Verify version belongs to this menu and org
    const version = await db.query.menuVersions.findFirst({
      where: and(
        eq(menuVersions.id, versionId),
        eq(menuVersions.menuId, menuId),
        eq(menuVersions.organizationId, orgId)
      ),
    });

    if (!version) {
      throw new NotFoundError('Version');
    }

    const result = await restoreMenuVersion(versionId, userId);

    if (!result.success) {
      return { success: false, error: { code: 'RESTORE_FAILED', message: result.error } };
    }

    await request.audit({
      action: 'menu.update',
      resourceType: 'menu',
      resourceId: menuId,
      metadata: { action: 'restored', fromVersion: version.version, newVersionId: result.newVersionId },
    });

    return {
      success: true,
      data: {
        message: `Menu restored to version ${version.version}`,
        newVersionId: result.newVersionId,
      },
    };
  });

  // Compare two versions
  app.get('/compare/:versionAId/:versionBId', async (request) => {
    const { orgId, menuId, versionAId, versionBId } = request.params as {
      orgId: string;
      menuId: string;
      versionAId: string;
      versionBId: string;
    };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    // Fetch both versions
    const [versionA, versionB] = await Promise.all([
      db.query.menuVersions.findFirst({
        where: and(
          eq(menuVersions.id, versionAId),
          eq(menuVersions.menuId, menuId),
          eq(menuVersions.organizationId, orgId)
        ),
      }),
      db.query.menuVersions.findFirst({
        where: and(
          eq(menuVersions.id, versionBId),
          eq(menuVersions.menuId, menuId),
          eq(menuVersions.organizationId, orgId)
        ),
      }),
    ]);

    if (!versionA || !versionB) {
      throw new NotFoundError('One or both versions not found');
    }

    const comparison = compareVersions(
      versionA.snapshot as MenuSnapshot,
      versionB.snapshot as MenuSnapshot
    );

    return {
      success: true,
      data: {
        versionA: { id: versionA.id, version: versionA.version, createdAt: versionA.createdAt },
        versionB: { id: versionB.id, version: versionB.version, createdAt: versionB.createdAt },
        comparison,
      },
    };
  });

  // Get latest version snapshot (current state)
  app.get('/current', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    const { createMenuSnapshot } = await import('../../lib/menu-versions.js');
    const snapshot = await createMenuSnapshot(menuId);

    if (!snapshot) {
      throw new NotFoundError('Menu');
    }

    return { success: true, data: snapshot };
  });

  // Get publish preview - compare current state to last published version
  app.get('/publish-preview', async (request) => {
    const { orgId, menuId } = request.params as { orgId: string; menuId: string };
    const tenantOrgId = request.tenantContext?.organizationId;

    if (tenantOrgId !== orgId) {
      throw new ForbiddenError('Access denied');
    }

    // Verify menu exists
    const menu = await db.query.menus.findFirst({
      where: and(eq(menus.id, menuId), eq(menus.organizationId, orgId), isNull(menus.deletedAt)),
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Get current snapshot
    const { createMenuSnapshot } = await import('../../lib/menu-versions.js');
    const currentSnapshot = await createMenuSnapshot(menuId);

    if (!currentSnapshot) {
      throw new NotFoundError('Menu');
    }

    // Get last published version
    const lastPublished = await db.query.menuVersions.findFirst({
      where: and(
        eq(menuVersions.menuId, menuId),
        eq(menuVersions.changeType, 'publish')
      ),
      orderBy: [desc(menuVersions.version)],
    });

    // If never published, return everything as new
    if (!lastPublished) {
      const totalSections = currentSnapshot.sections.length;
      const totalItems = currentSnapshot.sections.reduce((sum, s) => sum + s.items.length, 0);

      // Create detailed changes for first publish
      const detailedChanges: DetailedChanges = {
        menuChanges: {},
        sections: {
          added: currentSnapshot.sections.map((s) => ({
            id: s.id,
            name: s.name,
            items: s.items.map((item) => ({
              id: item.id,
              name: item.name,
              sectionName: s.name,
            })),
          })),
          removed: [],
          modified: [],
          unchanged: [],
        },
        summary: {
          sectionsAdded: totalSections,
          sectionsRemoved: 0,
          sectionsModified: 0,
          itemsAdded: totalItems,
          itemsRemoved: 0,
          itemsModified: 0,
        },
      };

      return {
        success: true,
        data: {
          isFirstPublish: true,
          currentSnapshot,
          lastPublishedAt: null,
          // Legacy format for backward compatibility
          changes: {
            menuChanges: {},
            sectionsAdded: currentSnapshot.sections.map((s) => s.name),
            sectionsRemoved: [],
            sectionsModified: [],
            itemsAdded: totalItems,
            itemsRemoved: 0,
            itemsModified: 0,
          },
          // New detailed format
          detailedChanges,
          summary: {
            totalSections,
            totalItems,
            hasChanges: true,
          },
        },
      };
    }

    // Compare current to last published
    const publishedSnapshot = lastPublished.snapshot as MenuSnapshot;
    const detailedChanges = compareVersionsDetailed(publishedSnapshot, currentSnapshot);

    // Legacy format for backward compatibility
    const changes = {
      menuChanges: detailedChanges.menuChanges,
      sectionsAdded: detailedChanges.sections.added.map(s => s.name),
      sectionsRemoved: detailedChanges.sections.removed.map(s => s.name),
      sectionsModified: detailedChanges.sections.modified.map(s => s.name),
      itemsAdded: detailedChanges.summary.itemsAdded,
      itemsRemoved: detailedChanges.summary.itemsRemoved,
      itemsModified: detailedChanges.summary.itemsModified,
    };

    const hasChanges =
      Object.keys(changes.menuChanges).length > 0 ||
      changes.sectionsAdded.length > 0 ||
      changes.sectionsRemoved.length > 0 ||
      changes.sectionsModified.length > 0 ||
      changes.itemsAdded > 0 ||
      changes.itemsRemoved > 0 ||
      changes.itemsModified > 0;

    return {
      success: true,
      data: {
        isFirstPublish: false,
        currentSnapshot,
        lastPublishedAt: lastPublished.createdAt,
        lastPublishedVersion: lastPublished.version,
        changes,
        detailedChanges,
        summary: {
          totalSections: currentSnapshot.sections.length,
          totalItems: currentSnapshot.sections.reduce((sum, s) => sum + s.items.length, 0),
          hasChanges,
        },
      },
    };
  });
}
