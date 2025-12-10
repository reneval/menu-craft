import { describe, it, expect } from 'vitest';
import {
  createPaginatedResponse,
  decodeCursor,
  encodeCursor,
} from './pagination.js';

describe('createPaginatedResponse', () => {
  it('should return items without hasMore when under limit', () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];

    const result = createPaginatedResponse(items, 10);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
  });

  it('should return items with hasMore when at limit', () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ];

    const result = createPaginatedResponse(items, 2);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextCursor).toBe('2'); // Last item's ID
  });

  it('should not include extra item in data', () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' }, // Extra item to indicate hasMore
    ];

    const result = createPaginatedResponse(items, 2);

    expect(result.data).toHaveLength(2);
    expect(result.data.map(item => item.id)).toEqual(['1', '2']);
  });

  it('should handle empty array', () => {
    const items: { id: string; name: string }[] = [];

    const result = createPaginatedResponse(items, 10);

    expect(result.data).toHaveLength(0);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBeNull();
  });

  it('should handle single item under limit', () => {
    const items = [{ id: '1', name: 'Item 1' }];

    const result = createPaginatedResponse(items, 10);

    expect(result.data).toHaveLength(1);
    expect(result.pagination.hasMore).toBe(false);
  });

  it('should handle exact limit count', () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];

    const result = createPaginatedResponse(items, 2);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.hasMore).toBe(false);
  });

  it('should set nextCursor to last item ID', () => {
    const items = [
      { id: 'abc-123', name: 'Item 1' },
      { id: 'def-456', name: 'Item 2' },
      { id: 'ghi-789', name: 'Item 3' },
    ];

    const result = createPaginatedResponse(items, 2);

    expect(result.pagination.nextCursor).toBe('def-456');
  });

  it('should work with UUID IDs', () => {
    const items = [
      { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Item 1' },
      { id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', name: 'Item 2' },
      { id: '6ba7b811-9dad-11d1-80b4-00c04fd430c8', name: 'Item 3' },
    ];

    const result = createPaginatedResponse(items, 2);

    expect(result.pagination.nextCursor).toBe('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
  });
});

describe('encodeCursor', () => {
  it('should encode string to base64url', () => {
    const cursor = encodeCursor('test-id-123');

    expect(cursor).toBeDefined();
    expect(typeof cursor).toBe('string');
    // base64url doesn't have + or /
    expect(cursor).not.toContain('+');
    expect(cursor).not.toContain('/');
  });

  it('should handle UUID strings', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const encoded = encodeCursor(uuid);

    expect(encoded).toBeDefined();
  });

  it('should handle empty string', () => {
    const cursor = encodeCursor('');

    expect(cursor).toBeDefined();
  });

  it('should handle special characters', () => {
    const cursor = encodeCursor('test+id/123=');

    expect(cursor).toBeDefined();
    expect(typeof cursor).toBe('string');
  });
});

describe('decodeCursor', () => {
  it('should decode base64url to string', () => {
    const original = 'test-id-123';
    const encoded = encodeCursor(original);
    const decoded = decodeCursor(encoded);

    expect(decoded).toBe(original);
  });

  it('should handle UUID strings', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const encoded = encodeCursor(uuid);
    const decoded = decodeCursor(encoded);

    expect(decoded).toBe(uuid);
  });

  it('should handle various cursor formats', () => {
    // The function attempts base64url decoding but doesn't throw on invalid input
    // It will return decoded bytes even for non-base64 strings
    const result = decodeCursor('test');
    expect(typeof result).toBe('string');
  });

  it('should handle empty string', () => {
    const result = decodeCursor('');

    expect(result).toBe('');
  });
});

describe('cursor encoding roundtrip', () => {
  it('should encode and decode correctly', () => {
    const testValues = [
      'simple-id',
      '550e8400-e29b-41d4-a716-446655440000',
      'id-with-special-chars!@#$%',
      '123456789',
      'a',
    ];

    for (const value of testValues) {
      const encoded = encodeCursor(value);
      const decoded = decodeCursor(encoded);
      expect(decoded).toBe(value);
    }
  });
});
