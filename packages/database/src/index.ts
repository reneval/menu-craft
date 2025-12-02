export { db, postgresClient, type Database } from './client';
export * from './schema/index';

// Re-export drizzle-orm operators to avoid version mismatch issues
export { eq, and, or, not, isNull, isNotNull, inArray, notInArray, exists, notExists, between, notBetween, like, notLike, ilike, notIlike, gt, gte, lt, lte, ne, desc, asc, count, sum, avg, min, max, sql } from 'drizzle-orm';
