import geoip from 'geoip-lite';

export interface GeoLocation {
  country: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  ll: [number, number] | null; // [latitude, longitude]
}

/**
 * Look up geographic location from an IP address.
 * Uses the free MaxMind GeoLite database bundled with geoip-lite.
 */
export function lookupGeo(ip: string): GeoLocation {
  // Handle localhost and private IPs
  if (isPrivateIP(ip)) {
    return {
      country: null,
      city: null,
      region: null,
      timezone: null,
      ll: null,
    };
  }

  const geo = geoip.lookup(ip);

  if (!geo) {
    return {
      country: null,
      city: null,
      region: null,
      timezone: null,
      ll: null,
    };
  }

  return {
    country: geo.country || null,
    city: geo.city || null,
    region: geo.region || null,
    timezone: geo.timezone || null,
    ll: geo.ll || null,
  };
}

/**
 * Get just the country code from an IP address.
 */
export function lookupCountry(ip: string): string | null {
  const geo = lookupGeo(ip);
  return geo.country;
}

/**
 * Get the real client IP from request headers.
 * Handles proxies and load balancers.
 */
export function getClientIP(request: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}): string {
  // Check common proxy headers
  const xForwardedFor = request.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor.split(',')[0];
    if (ips) return ips.trim();
  }

  const xRealIP = request.headers['x-real-ip'];
  if (xRealIP) {
    const ip = Array.isArray(xRealIP) ? xRealIP[0] : xRealIP;
    if (ip) return ip;
  }

  const cfConnectingIP = request.headers['cf-connecting-ip'];
  if (cfConnectingIP) {
    const ip = Array.isArray(cfConnectingIP) ? cfConnectingIP[0] : cfConnectingIP;
    if (ip) return ip;
  }

  return request.ip || '127.0.0.1';
}

/**
 * Check if an IP is private/local.
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  if (
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('172.22.') ||
    ip.startsWith('172.23.') ||
    ip.startsWith('172.24.') ||
    ip.startsWith('172.25.') ||
    ip.startsWith('172.26.') ||
    ip.startsWith('172.27.') ||
    ip.startsWith('172.28.') ||
    ip.startsWith('172.29.') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.') ||
    ip.startsWith('192.168.') ||
    ip === '127.0.0.1' ||
    ip === 'localhost' ||
    ip === '::1'
  ) {
    return true;
  }

  return false;
}

/**
 * Country name mapping for common ISO codes.
 */
export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  BE: 'Belgium',
  AT: 'Austria',
  CH: 'Switzerland',
  PT: 'Portugal',
  GR: 'Greece',
  PL: 'Poland',
  CZ: 'Czech Republic',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  IN: 'India',
  BR: 'Brazil',
  MX: 'Mexico',
  AR: 'Argentina',
  RU: 'Russia',
  UA: 'Ukraine',
  TR: 'Turkey',
  IL: 'Israel',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  ZA: 'South Africa',
  SG: 'Singapore',
  MY: 'Malaysia',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  ID: 'Indonesia',
  HK: 'Hong Kong',
  TW: 'Taiwan',
};

export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code;
}
