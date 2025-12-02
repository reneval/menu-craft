import { type FastifyInstance, type FastifyError, type FastifyRequest, type FastifyReply } from 'fastify';
import { AppError } from '../utils/errors.js';
import { ErrorCodes } from '@menucraft/shared-types';
import { env } from '../config/env.js';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    async (error: FastifyError | AppError, request: FastifyRequest, reply: FastifyReply) => {
      // Log the error
      request.log.error(error);

      // Handle known app errors
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send(error.toJSON());
      }

      // Handle Fastify validation errors
      if (error.validation) {
        const details: Record<string, string[]> = {};
        for (const issue of error.validation) {
          const path = issue.instancePath.replace(/^\//, '') || '_root';
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(issue.message || 'Invalid value');
        }
        return reply.status(400).send({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Validation failed',
            details,
          },
        });
      }

      // Handle unknown errors
      const statusCode = error.statusCode || 500;
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        },
      });
    }
  );
}
