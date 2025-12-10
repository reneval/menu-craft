import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { MenuPage } from '../components/MenuPage'
import { ErrorPage } from '../components/ErrorPage'
import { LoadingPage } from '../components/LoadingPage'
import { fetchVenueMenu } from '../lib/api'

// Supported languages (should match what menus can be translated to)
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']

/**
 * Detect the user's preferred language from browser settings
 * Returns the first supported language found, or 'en' as default
 */
function detectBrowserLanguage(): string {
  if (typeof navigator === 'undefined') return 'en'

  // navigator.languages is an array of preferred languages
  const browserLanguages = navigator.languages || [navigator.language]

  for (const lang of browserLanguages) {
    // Extract the base language code (e.g., 'en-US' -> 'en')
    const baseLanguage = lang?.split('-')[0]?.toLowerCase()
    if (baseLanguage && SUPPORTED_LANGUAGES.includes(baseLanguage)) {
      return baseLanguage
    }
  }

  return 'en'
}

export const Route = createFileRoute('/$venueSlug')({
  component: VenueMenuPage,
  validateSearch: (search: Record<string, unknown>) => {
    // If lang is explicitly set in URL, use it
    // Otherwise we'll detect on client side
    return {
      lang: (search.lang as string) || undefined,
    }
  },
})

function VenueMenuPage() {
  const params = Route.useParams() as any
  const search = Route.useSearch() as any
  const navigate = useNavigate()
  const venueSlug = params.venueSlug as string
  const hasRedirected = useRef(false)

  // Detect browser language if not set in URL
  const lang = search.lang || detectBrowserLanguage()

  // If no lang in URL, update URL with detected language (once)
  useEffect(() => {
    if (!search.lang && !hasRedirected.current) {
      hasRedirected.current = true
      const detectedLang = detectBrowserLanguage()
      // Update URL with detected language (without full navigation)
      navigate({
        to: '/$venueSlug',
        params: { venueSlug },
        search: { lang: detectedLang },
        replace: true, // Don't add to history
      })
    }
  }, [search.lang, venueSlug, navigate])

  const {
    data,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['venue-menu', venueSlug, lang],
    queryFn: () => fetchVenueMenu(venueSlug, lang),
    retry: 1,
  })

  if (isLoading) {
    return <LoadingPage />
  }

  if (isError || !data?.success) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Unable to load menu. Please try again later.'

    const is404 = errorMessage.includes('404') || errorMessage.includes('not found')

    return (
      <ErrorPage
        title={is404 ? 'Restaurant Not Found' : 'Menu Unavailable'}
        message={is404
          ? 'The restaurant you\'re looking for doesn\'t exist or has been moved.'
          : errorMessage
        }
        showRetry={!is404}
      />
    )
  }

  return <MenuPage menuData={data.data} />
}
