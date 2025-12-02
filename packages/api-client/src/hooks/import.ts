import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiClient, ApiError } from '../client.js';
import { menuKeys } from './menus.js';

// Types for photo import
export interface ExtractedMenuItem {
  name: string;
  description?: string;
  price?: string;
  dietaryTags?: string[];
}

export interface ExtractedMenuSection {
  name: string;
  items: ExtractedMenuItem[];
}

export interface PhotoImportPreviewResult {
  rows: CsvRow[];
  sections: ExtractedMenuSection[];
  confidence: 'high' | 'medium' | 'low';
  warnings?: string[];
  totalItems: number;
  totalSections: number;
}

export interface PhotoImportResult {
  message: string;
  stats: ImportStats;
  extracted: {
    sections: ExtractedMenuSection[];
    confidence: 'high' | 'medium' | 'low';
    warnings?: string[];
  };
}

export interface CsvRow {
  section: string;
  name: string;
  description?: string;
  price?: string;
  priceType?: 'fixed' | 'variable' | 'market_price';
  dietaryTags?: string;
  allergens?: string;
  available?: string;
}

export interface ImportInput {
  rows: CsvRow[];
  mode: 'append' | 'replace';
}

export interface ImportStats {
  sectionsCreated: number;
  sectionsUpdated: number;
  itemsCreated: number;
}

export interface ImportResult {
  message: string;
  stats: ImportStats;
}

export interface TemplateColumn {
  name: string;
  description: string;
  required: boolean;
}

export interface TemplateData {
  template: string;
  columns: TemplateColumn[];
}

export const importKeys = {
  all: ['import'] as const,
  template: (orgId: string, venueId: string, menuId: string) =>
    [...importKeys.all, 'template', orgId, venueId, menuId] as const,
};

export function useImportTemplate(
  orgId: string,
  venueId: string,
  menuId: string,
  enabled = true
) {
  return useQuery({
    queryKey: importKeys.template(orgId, venueId, menuId),
    queryFn: async () => {
      const client = getApiClient();
      return client.get<TemplateData>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/import/template`
      );
    },
    enabled: enabled && !!orgId && !!venueId && !!menuId,
    staleTime: Infinity, // Template doesn't change
  });
}

export function useImportCsv(
  orgId: string,
  venueId: string,
  menuId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ImportInput) => {
      const client = getApiClient();
      return client.post<ImportResult>(
        `/organizations/${orgId}/venues/${venueId}/menus/${menuId}/import`,
        input
      );
    },
    onSuccess: () => {
      // Invalidate menu query to refresh sections and items
      queryClient.invalidateQueries({
        queryKey: menuKeys.detail(orgId, venueId, menuId),
      });
    },
  });
}

// CSV parsing utility
export function parseCsv(csvText: string): CsvRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const headerLine = lines[0]!;
  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim());

  // Validate required headers
  const requiredHeaders = ['section', 'name'];
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`Missing required column: ${required}`);
    }
  }

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Skip rows without section or name
    if (!row.section?.trim() || !row.name?.trim()) {
      continue;
    }

    rows.push({
      section: row.section!,
      name: row.name!,
      description: row.description || '',
      price: row.price || '',
      priceType: (row.pricetype || row['price_type'] || 'fixed') as 'fixed' | 'variable' | 'market_price',
      dietaryTags: row.dietarytags || row['dietary_tags'] || row.dietary || '',
      allergens: row.allergens || '',
      available: row.available || 'true',
    });
  }

  if (rows.length === 0) {
    throw new Error('No valid data rows found in CSV');
  }

  return rows;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Photo import preview - extracts menu data without importing
export function useImportPhotoPreview(
  orgId: string,
  venueId: string,
  menuId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<PhotoImportPreviewResult> => {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(
        `${getApiClient().baseUrl}/organizations/${orgId}/venues/${venueId}/menus/${menuId}/import/photo/preview`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
        throw new ApiError(
          response.status,
          error.error?.code || 'EXTRACTION_FAILED',
          error.error?.message || 'Failed to extract menu from photo'
        );
      }

      const result = await response.json();
      return result.data as PhotoImportPreviewResult;
    },
  });
}

// Photo import - extracts and imports menu data
export function useImportFromPhoto(
  orgId: string,
  venueId: string,
  menuId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { file: File; mode: 'append' | 'replace' }): Promise<PhotoImportResult> => {
      const formData = new FormData();
      formData.append('photo', params.file);
      formData.append('mode', params.mode);

      const response = await fetch(
        `${getApiClient().baseUrl}/organizations/${orgId}/venues/${venueId}/menus/${menuId}/import/photo`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
        throw new ApiError(
          response.status,
          error.error?.code || 'IMPORT_FAILED',
          error.error?.message || 'Failed to import menu from photo'
        );
      }

      const result = await response.json();
      return result.data as PhotoImportResult;
    },
    onSuccess: () => {
      // Invalidate menu query to refresh sections and items
      queryClient.invalidateQueries({
        queryKey: menuKeys.detail(orgId, venueId, menuId),
      });
    },
  });
}
