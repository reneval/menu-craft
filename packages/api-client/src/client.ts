import type { ApiResponse, ApiError as ApiErrorType } from '@menucraft/shared-types';

export interface ApiClientConfig {
  baseUrl: string;
  getAuthToken?: () => string | null | Promise<string | null>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isApiError<T>(response: ApiResponse<T>): response is ApiErrorType {
  return response.success === false;
}

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.config.getAuthToken) {
      const token = await this.config.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers = await this.getHeaders();

    // For POST/PATCH with no body, send empty object to satisfy Fastify's JSON parser
    // This is needed because we always set Content-Type: application/json
    const requestBody = body !== undefined ? body : (method === 'POST' || method === 'PATCH' ? {} : undefined);

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody !== undefined ? JSON.stringify(requestBody) : undefined,
    });

    const data = await response.json() as ApiResponse<T>;

    if (!response.ok || isApiError(data)) {
      const errorData = isApiError(data) ? data : null;
      throw new ApiError(
        response.status,
        errorData?.error?.code || 'UNKNOWN_ERROR',
        errorData?.error?.message || 'An unknown error occurred'
      );
    }

    return data.data;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}

let apiClient: ApiClient | null = null;

export function initApiClient(config: ApiClientConfig): ApiClient {
  apiClient = new ApiClient(config);
  return apiClient;
}

export function getApiClient(): ApiClient {
  if (!apiClient) {
    throw new Error('API client not initialized. Call initApiClient first.');
  }
  return apiClient;
}
