import { type PaginatedResponse } from '@menucraft/shared-types';

export interface PaginationOptions {
  cursor?: string;
  limit: number;
}

export function createPaginatedResponse<T extends { id: string }>(
  items: T[],
  limit: number
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const lastItem = data[data.length - 1];

  return {
    data,
    pagination: {
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      hasMore,
    },
  };
}

export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64url').toString('utf-8');
  } catch {
    return cursor;
  }
}

export function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf-8').toString('base64url');
}
