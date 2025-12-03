import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MenuPage } from '../components/MenuPage'
import { ErrorPage } from '../components/ErrorPage'
import { LoadingPage } from '../components/LoadingPage'
import { fetchVenueMenu } from '../lib/api'

export const Route = createFileRoute('/$venueSlug')({
  component: VenueMenuPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      lang: (search.lang as string) || 'en',
    }
  },
})

function VenueMenuPage() {
  const params = Route.useParams() as any
  const search = Route.useSearch() as any
  const venueSlug = params.venueSlug as string
  const lang = search.lang as string

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