import { type ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errors.js';

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const issue of error.issues) {
        const path = issue.path.join('.') || '_root';
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(issue.message);
      }
      throw new ValidationError(details);
    }
    throw error;
  }
}
