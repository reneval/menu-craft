/**
 * Translation service with Redis caching for DeepL API calls
 */

import * as deepl from 'deepl-node';
import { env } from '../config/env.js';
import { redisCache } from './redis-cache.js';

export interface TranslationConfig {
  sourceLang?: string;
  preserveFormatting?: boolean;
  splitSentences?: 'off' | 'default' | 'nonewlines';
  formality?: 'default' | 'more' | 'less' | 'prefer_more' | 'prefer_less';
  glossaryId?: string;
}

export interface TranslationResult {
  text: string;
  detectedSourceLang?: string;
  billedCharacters?: number;
}

export interface BatchTranslationItem {
  id: string;
  text: string;
  targetLang: string;
  config?: TranslationConfig;
}

export interface BatchTranslationResult {
  id: string;
  result: TranslationResult | null;
  error?: string;
}

export class TranslationService {
  private translator: deepl.Translator | null = null;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = Boolean(env.DEEPL_API_KEY);

    if (this.isEnabled) {
      this.translator = new deepl.Translator(env.DEEPL_API_KEY!);
    } else {
      console.warn('DeepL API key not configured, translations will be disabled');
    }
  }

  private buildCacheKey(text: string, targetLang: string, config?: TranslationConfig): string {
    const configHash = config ? JSON.stringify(config) : '';
    // Create a simple hash of the input to keep cache keys manageable
    const textHash = Buffer.from(text).toString('base64').slice(0, 32);
    return `${textHash}:${targetLang}:${Buffer.from(configHash).toString('base64').slice(0, 16)}`;
  }

  async translateText(
    text: string,
    targetLang: string,
    config: TranslationConfig = {}
  ): Promise<TranslationResult> {
    if (!this.isEnabled || !this.translator) {
      throw new Error('Translation service is not enabled');
    }

    if (!text.trim()) {
      return { text: '' };
    }

    const cacheKey = this.buildCacheKey(text, targetLang, config);

    // Try to get from cache first
    const cached = await redisCache.getOrSet(
      cacheKey,
      async () => {
        try {
          const result = await this.translator!.translateText(
            text,
            (config.sourceLang as deepl.SourceLanguageCode) || null,
            targetLang as deepl.TargetLanguageCode,
            {
              preserveFormatting: config.preserveFormatting,
              splitSentences: config.splitSentences as any,
              formality: config.formality as any,
              glossary: config.glossaryId,
            }
          );

          return {
            text: result.text,
            detectedSourceLang: result.detectedSourceLang,
            billedCharacters: (result as any).billedCharacters,
          };
        } catch (error) {
          console.error('DeepL translation error:', error);
          throw error;
        }
      },
      {
        ttl: 24 * 60 * 60, // Cache translations for 24 hours
        namespace: 'translations',
      }
    );

    return cached;
  }

  async translateBatch(
    items: BatchTranslationItem[]
  ): Promise<BatchTranslationResult[]> {
    if (!this.isEnabled || !this.translator) {
      throw new Error('Translation service is not enabled');
    }

    if (items.length === 0) {
      return [];
    }

    const results: BatchTranslationResult[] = [];
    const cacheKeys = items.map(item =>
      this.buildCacheKey(item.text, item.targetLang, item.config)
    );

    // Check cache for all items
    const cachedResults = await redisCache.mget<TranslationResult>(
      cacheKeys,
      'translations'
    );

    const uncachedItems: Array<{ index: number; item: BatchTranslationItem }> = [];

    // Process cached results and identify uncached items
    for (let i = 0; i < items.length; i++) {
      const cached = cachedResults[i];
      const item = items[i];
      if (cached && item) {
        results[i] = {
          id: item.id,
          result: cached,
        };
      } else if (item) {
        uncachedItems.push({ index: i, item: item });
        results[i] = { id: item.id, result: null }; // Placeholder
      }
    }

    // Translate uncached items
    if (uncachedItems.length > 0) {
      console.log(`Translating ${uncachedItems.length} items via DeepL API`);

      const translationPromises = uncachedItems.map(async ({ index, item }) => {
        try {
          const result = await this.translateText(
            item.text,
            item.targetLang,
            item.config
          );

          results[index] = {
            id: item.id,
            result,
          };

          return {
            key: cacheKeys[index],
            value: result,
          };
        } catch (error) {
          console.error(`Translation failed for item ${item.id}:`, error);
          results[index] = {
            id: item.id,
            result: null,
            error: error instanceof Error ? error.message : 'Translation failed',
          };
          return null;
        }
      });

      const translationResults = await Promise.all(translationPromises);

      // Cache successful translations
      const cacheEntries = translationResults
        .filter((result): result is { key: string; value: TranslationResult } => result !== null);

      if (cacheEntries.length > 0) {
        await redisCache.mset(
          cacheEntries,
          {
            ttl: 24 * 60 * 60, // 24 hours
            namespace: 'translations',
          }
        );
      }
    }

    return results;
  }

  async getUsageStats(): Promise<{
    characterCount: number;
    characterLimit: number;
    documentCount: number;
    documentLimit: number;
  } | null> {
    if (!this.isEnabled || !this.translator) {
      return null;
    }

    try {
      const usage = await this.translator.getUsage();
      return {
        characterCount: usage.character ? usage.character.count : 0,
        characterLimit: usage.character ? usage.character.limit : 0,
        documentCount: usage.document ? usage.document.count : 0,
        documentLimit: usage.document ? usage.document.limit : 0,
      };
    } catch (error) {
      console.error('Failed to get DeepL usage stats:', error);
      return null;
    }
  }

  async getSupportedLanguages(): Promise<{
    source: Array<{ code: string; name: string }>;
    target: Array<{ code: string; name: string }>;
  } | null> {
    if (!this.isEnabled || !this.translator) {
      return null;
    }

    try {
      const [sourceLanguages, targetLanguages] = await Promise.all([
        this.translator.getSourceLanguages(),
        this.translator.getTargetLanguages(),
      ]);

      return {
        source: sourceLanguages.map(lang => ({
          code: lang.code,
          name: lang.name,
        })),
        target: targetLanguages.map(lang => ({
          code: lang.code,
          name: lang.name,
        })),
      };
    } catch (error) {
      console.error('Failed to get supported languages:', error);
      return null;
    }
  }

  async clearCache(pattern?: string): Promise<boolean> {
    try {
      if (pattern) {
        // Clear specific pattern - we'll use the namespace flush for now
        // as we don't expose the raw client
        await redisCache.flush('translations');
      } else {
        // Clear all translation cache
        await redisCache.flush('translations');
      }
      return true;
    } catch (error) {
      console.error('Failed to clear translation cache:', error);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isEnabled && this.translator !== null;
  }
}

// Singleton instance
export const translationService = new TranslationService();