import { type FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post(
    '/',
    {
      schema: {
        description: 'Upload an image file',
        tags: ['uploads'],
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  filename: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded',
          },
        });
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
          },
        });
      }

      // Get file extension from mimetype
      const ext = data.mimetype.split('/')[1] === 'jpeg' ? 'jpg' : data.mimetype.split('/')[1];
      const filename = `${randomUUID()}.${ext}`;
      const filepath = path.join(UPLOADS_DIR, filename);

      // Track file size during upload
      let size = 0;
      const chunks: Buffer[] = [];

      for await (const chunk of data.file) {
        size += chunk.length;
        if (size > MAX_FILE_SIZE) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            },
          });
        }
        chunks.push(chunk);
      }

      // Write file to disk
      const writeStream = createWriteStream(filepath);
      for (const chunk of chunks) {
        writeStream.write(chunk);
      }
      writeStream.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const url = `/uploads/${filename}`;

      return reply.send({
        success: true,
        data: {
          url,
          filename,
        },
      });
    }
  );
}
