// Type declaration for import.meta.env
declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL?: string;
      [key: string]: any;
    };
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface VenueData {
  id: string
  name: string
  slug: string
  logoUrl?: string
  timezone: string
}

export interface MenuData {
  id: string
  name: string
  themeConfig: Record<string, any>
  sections: MenuSection[]
}

export interface MenuSection {
  id: string
  name: string
  description?: string
  items: MenuItem[]
}

export interface MenuItem {
  id: string
  name: string
  description?: string
  priceType: 'fixed' | 'variable' | 'market_price'
  priceAmount?: number
  dietaryTags: string[]
  allergens: string[]
  badges: string[]
  imageUrl?: string
  options: MenuItemOption[]
}

export interface MenuItemOption {
  group: string
  options: Array<{
    id: string
    name: string
    priceModifier: number
  }>
}

export interface VenueMenuResponse {
  venue: VenueData
  menu: MenuData
  meta: {
    language: string
    generatedAt: string
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: {
    code: string
    message: string
  }
}

export async function fetchVenueMenu(
  venueSlug: string,
  lang: string = 'en'
): Promise<ApiResponse<VenueMenuResponse>> {
  const url = new URL(`${API_BASE_URL}/public/v/${venueSlug}/menu`)
  url.searchParams.set('lang', lang)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Restaurant not found')
    }
    throw new Error(`Failed to load menu: ${response.statusText}`)
  }

  return response.json()
}

export async function fetchVenueInfo(venueSlug: string): Promise<ApiResponse<VenueData>> {
  const response = await fetch(`${API_BASE_URL}/public/v/${venueSlug}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Restaurant not found')
    }
    throw new Error(`Failed to load restaurant info: ${response.statusText}`)
  }

  return response.json()
}

export async function trackMenuView(
  venueSlug: string,
  menuId: string,
  sessionId?: string,
  referrer?: string
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/public/v/${venueSlug}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        menuId,
        sessionId: sessionId || generateSessionId(),
        referrer,
      }),
    })
  } catch (error) {
    // Silently fail tracking to avoid disrupting user experience
    console.warn('Failed to track menu view:', error)
  }
}

export async function trackItemViews(
  venueSlug: string,
  menuId: string,
  items: Array<{ itemId: string; durationMs?: number }>,
  sessionId?: string
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/public/v/${venueSlug}/track-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        menuId,
        items,
        sessionId: sessionId || generateSessionId(),
      }),
    })
  } catch (error) {
    // Silently fail tracking to avoid disrupting user experience
    console.warn('Failed to track item views:', error)
  }
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}