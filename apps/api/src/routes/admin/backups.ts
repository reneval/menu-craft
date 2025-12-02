import { type FastifyInstance } from 'fastify';
import { db, backups, type NewBackup, eq, desc } from '@menucraft/database';
import { requireSuperAdminPermission } from '../../plugins/super-admin.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { env } from '../../config/env.js';
import path from 'path';
import { existsSync, mkdirSync, statSync } from 'fs';

const execAsync = promisify(exec);

// Ensure backups directory exists
const BACKUPS_DIR = path.join(process.cwd(), 'backups');
if (!existsSync(BACKUPS_DIR)) {
  mkdirSync(BACKUPS_DIR, { recursive: true });
}

export async function backupsRoutes(app: FastifyInstance) {
  // All routes require backup permission
  app.addHook('preHandler', requireSuperAdminPermission('canManageBackups'));

  // List all backups
  app.get('/', async (request) => {
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
    const offset = (page - 1) * limit;

    const backupList = await db.query.backups.findMany({
      limit,
      offset,
      orderBy: [desc(backups.createdAt)],
    });

    return { success: true, data: backupList };
  });

  // Get backup details
  app.get('/:backupId', async (request) => {
    const { backupId } = request.params as { backupId: string };

    const backup = await db.query.backups.findFirst({
      where: eq(backups.id, backupId),
    });

    if (!backup) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Backup not found' } };
    }

    return { success: true, data: backup };
  });

  // Trigger manual backup
  app.post('/create', async (request) => {
    const userId = request.superAdmin?.userId;

    // Create backup record
    const [backup] = await db
      .insert(backups)
      .values({
        type: 'manual',
        status: 'pending',
        triggeredBy: userId,
      } as NewBackup)
      .returning();

    if (!backup) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create backup record' } };
    }

    // Start backup process asynchronously
    runBackup(backup.id).catch((err) => {
      console.error('Backup failed:', err);
    });

    await request.audit({
      action: 'settings.update',
      resourceType: 'backup',
      resourceId: backup.id,
      metadata: { action: 'triggered_backup' },
    });

    return {
      success: true,
      data: backup,
      message: 'Backup started. Check status for progress.',
    };
  });

  // Delete old backup
  app.delete('/:backupId', async (request) => {
    const { backupId } = request.params as { backupId: string };

    const backup = await db.query.backups.findFirst({
      where: eq(backups.id, backupId),
    });

    if (!backup) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Backup not found' } };
    }

    // Delete the file if it exists
    if (backup.filename) {
      const filePath = path.join(BACKUPS_DIR, backup.filename);
      try {
        const { unlink } = await import('fs/promises');
        await unlink(filePath);
      } catch {
        // File might not exist
      }
    }

    await db.delete(backups).where(eq(backups.id, backupId));

    await request.audit({
      action: 'settings.update',
      resourceType: 'backup',
      resourceId: backupId,
      metadata: { action: 'deleted_backup' },
    });

    return { success: true, message: 'Backup deleted' };
  });
}

/**
 * Run the actual backup process
 */
async function runBackup(backupId: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql.gz`;
  const filePath = path.join(BACKUPS_DIR, filename);

  // Update status to in_progress
  await db
    .update(backups)
    .set({
      status: 'in_progress',
      startedAt: new Date(),
      filename,
    })
    .where(eq(backups.id, backupId));

  try {
    // Parse DATABASE_URL to extract connection details
    const dbUrl = new URL(env.DATABASE_URL);
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1);
    const user = dbUrl.username;
    const password = dbUrl.password;

    // Run pg_dump
    const pgDumpCmd = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -Fc | gzip > ${filePath}`;

    await execAsync(pgDumpCmd);

    // Get file size
    const stats = statSync(filePath);
    const sizeBytes = stats.size;

    // Update backup record
    await db
      .update(backups)
      .set({
        status: 'completed',
        completedAt: new Date(),
        sizeBytes,
        storageUrl: filePath, // For local storage; would be S3 URL in production
      })
      .where(eq(backups.id, backupId));

    console.log(`Backup completed: ${filename} (${sizeBytes} bytes)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await db
      .update(backups)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorMessage,
      })
      .where(eq(backups.id, backupId));

    console.error(`Backup failed for ${backupId}:`, errorMessage);
    throw error;
  }
}
