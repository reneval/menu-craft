/**
 * Redis caching service for translations and other cached data
 */

import { createClient, type RedisClientType } from 'redis';
import { env } from '../config/env.js';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  namespace?: string;
}

export class RedisCache {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 10000,
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        this.isConnected = true;
      } catch (error) {
        console.warn('Redis connection failed, caching will be disabled:', error);
        this.isConnected = false;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  private buildKey(namespace: string | undefined, key: string): string {
    const prefix = env.REDIS_KEY_PREFIX || 'menucraft';
    return namespace ? `${prefix}:${namespace}:${key}` : `${prefix}:${key}`;
  }

  async get<T = any>(key: string, namespace?: string): Promise<T | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const fullKey = this.buildKey(namespace, key);
      const value = await this.client.get(fullKey);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async set<T = any>(
    key: string,
    value: T,
    config: CacheConfig = { ttl: 3600 }
  ): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(config.namespace, key);
      const serialized = JSON.stringify(value);

      if (config.ttl > 0) {
        await this.client.setEx(fullKey, config.ttl, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }

      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key: string, namespace?: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(namespace, key);
      await this.client.del(fullKey);
      return true;
    } catch (error) {
      console.error('Redis DELETE error:', error);
      return false;
    }
  }

  async exists(key: string, namespace?: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.buildKey(namespace, key);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async flush(namespace?: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      if (namespace) {
        // Delete all keys in namespace
        const pattern = this.buildKey(namespace, '*');
        const keys = await this.client.keys(pattern);

        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } else {
        // Flush all cache (use with caution)
        await this.client.flushDb();
      }

      return true;
    } catch (error) {
      console.error('Redis FLUSH error:', error);
      return false;
    }
  }

  async getStats(): Promise<{
    connected: boolean;
    memoryUsage?: string;
    keyCount?: number;
  }> {
    const stats: any = {
      connected: this.isConnected,
    };

    if (this.isConnected) {
      try {
        const info = await this.client.info('memory');
        const keyCount = await this.client.dbSize();

        const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
        stats.memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';
        stats.keyCount = keyCount;
      } catch (error) {
        console.error('Redis STATS error:', error);
      }
    }

    return stats;
  }

  // Utility method for cache-aside pattern
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig = { ttl: 3600 }
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, config.namespace);

    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch the data
    const data = await fetcher();

    // Store in cache for next time
    await this.set(key, data, config);

    return data;
  }

  // Batch operations
  async mget<T = any>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    if (!this.isConnected || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const fullKeys = keys.map(key => this.buildKey(namespace, key));
      const values = await this.client.mGet(fullKeys);

      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Redis MGET error:', error);
      return keys.map(() => null);
    }
  }

  async mset<T = any>(
    entries: Array<{ key: string; value: T }>,
    config: CacheConfig = { ttl: 3600 }
  ): Promise<boolean> {
    if (!this.isConnected || entries.length === 0) {
      return false;
    }

    try {
      const pipeline = this.client.multi();

      for (const entry of entries) {
        const fullKey = this.buildKey(config.namespace, entry.key);
        const serialized = JSON.stringify(entry.value);

        if (config.ttl > 0) {
          pipeline.setEx(fullKey, config.ttl, serialized);
        } else {
          pipeline.set(fullKey, serialized);
        }
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Redis MSET error:', error);
      return false;
    }
  }
}

// Singleton instance
export const redisCache = new RedisCache();