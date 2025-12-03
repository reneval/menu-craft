import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatPrice(priceType: string, priceAmount?: number | null): string | null {
  if (priceType === 'market_price') {
    return 'Market Price'
  }

  if (priceType === 'variable') {
    return 'Variable Price'
  }

  if (priceType === 'fixed' && priceAmount !== null && priceAmount !== undefined) {
    return `$${(priceAmount / 100).toFixed(2)}`
  }

  return null
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function formatDietaryTag(tag: string): string {
  switch (tag) {
    case 'gluten_free':
      return 'Gluten Free'
    case 'dairy_free':
      return 'Dairy Free'
    case 'nut_free':
      return 'Nut Free'
    case 'chef_pick':
      return "Chef's Pick"
    default:
      return capitalize(tag.replace(/_/g, ' '))
  }
}

export function getDietaryTagIcon(tag: string): string {
  switch (tag) {
    case 'vegetarian':
      return '🌱'
    case 'vegan':
      return '🌿'
    case 'gluten_free':
      return '🚫🌾'
    case 'dairy_free':
      return '🚫🥛'
    case 'nut_free':
      return '🚫🥜'
    case 'halal':
      return '☪️'
    case 'kosher':
      return '✡️'
    case 'spicy':
      return '🌶️'
    case 'organic':
      return '🌱'
    default:
      return ''
  }
}

export function getBadgeIcon(badge: string): string {
  switch (badge) {
    case 'popular':
      return '🔥'
    case 'new':
      return '✨'
    case 'limited':
      return '⏰'
    case 'chef_pick':
      return '👨‍🍳'
    case 'bestseller':
      return '⭐'
    case 'seasonal':
      return '🍂'
    default:
      return ''
  }
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}