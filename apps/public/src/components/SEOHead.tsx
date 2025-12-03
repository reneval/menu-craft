import React from 'react'
import { Helmet } from 'react-helmet-async'
import { VenueData, MenuData } from '../lib/api'

interface SEOHeadProps {
  venue: VenueData
  menu: MenuData
}

export function SEOHead({ venue, menu }: SEOHeadProps) {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // Generate page title and description
  const title = `${venue.name} - ${menu.name}`
  const description = `View the complete menu for ${venue.name}. Browse our selection of delicious items with prices and detailed descriptions.`

  // Extract unique dietary tags and allergens for keywords
  const allDietaryTags = menu.sections.flatMap(section =>
    section.items.flatMap(item => item.dietaryTags)
  )
  const uniqueDietaryTags = [...new Set(allDietaryTags)]

  const keywords = [
    venue.name,
    'menu',
    'restaurant',
    'food',
    'dining',
    ...uniqueDietaryTags,
    ...menu.sections.map(s => s.name)
  ].join(', ')

  // Generate restaurant schema.org structured data
  const restaurantSchema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: venue.name,
    url: baseUrl,
    ...(venue.logoUrl && {
      logo: venue.logoUrl,
      image: venue.logoUrl
    }),
    hasMenu: {
      '@type': 'Menu',
      name: menu.name,
      url: currentUrl,
      hasMenuSection: menu.sections.map(section => ({
        '@type': 'MenuSection',
        name: section.name,
        ...(section.description && { description: section.description }),
        hasMenuItem: section.items.map(item => {
          const menuItem: any = {
            '@type': 'MenuItem',
            name: item.name,
            ...(item.description && { description: item.description }),
            ...(item.imageUrl && { image: item.imageUrl }),
          }

          // Add pricing information
          if (item.priceType === 'fixed' && item.priceAmount !== null && item.priceAmount !== undefined) {
            menuItem.offers = {
              '@type': 'Offer',
              price: (item.priceAmount / 100).toFixed(2),
              priceCurrency: 'USD'
            }
          } else if (item.priceType === 'variable') {
            menuItem.offers = {
              '@type': 'Offer',
              priceSpecification: {
                '@type': 'PriceSpecification',
                priceCurrency: 'USD',
                description: 'Variable pricing'
              }
            }
          } else if (item.priceType === 'market_price') {
            menuItem.offers = {
              '@type': 'Offer',
              priceSpecification: {
                '@type': 'PriceSpecification',
                priceCurrency: 'USD',
                description: 'Market price'
              }
            }
          }

          // Add dietary information
          if (item.dietaryTags.length > 0) {
            menuItem.suitableForDiet = item.dietaryTags.map(tag => {
              switch (tag) {
                case 'vegetarian':
                  return 'https://schema.org/VegetarianDiet'
                case 'vegan':
                  return 'https://schema.org/VeganDiet'
                case 'gluten_free':
                  return 'https://schema.org/GlutenFreeDiet'
                case 'dairy_free':
                  return 'https://schema.org/DiabeticDiet' // Closest match
                case 'halal':
                  return 'https://schema.org/HalalDiet'
                case 'kosher':
                  return 'https://schema.org/KosherDiet'
                default:
                  return `https://schema.org/${tag}Diet`
              }
            })
          }

          // Add nutrition information if allergens are specified
          if (item.allergens.length > 0) {
            menuItem.nutrition = {
              '@type': 'NutritionInformation',
              allergenInfo: item.allergens.join(', ')
            }
          }

          return menuItem
        })
      }))
    }
  }

  // Generate breadcrumb schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: venue.name,
        item: currentUrl
      }
    ]
  }

  // Generate organization schema for the restaurant
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    '@id': `${baseUrl}#organization`,
    name: venue.name,
    url: baseUrl,
    ...(venue.logoUrl && { logo: venue.logoUrl }),
    servesCuisine: uniqueDietaryTags.length > 0 ? uniqueDietaryTags : undefined,
    hasMenu: `${currentUrl}#menu`
  }

  // Generate WebSite schema for enhanced search appearance
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}#website`,
    name: `${venue.name} Menu`,
    url: baseUrl,
    publisher: {
      '@id': `${baseUrl}#organization`
    }
  }

  return (
    <Helmet>
      {/* Basic meta tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph tags for social sharing */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content={venue.name} />
      {venue.logoUrl && <meta property="og:image" content={venue.logoUrl} />}
      {venue.logoUrl && <meta property="og:image:alt" content={`${venue.name} logo`} />}
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {venue.logoUrl && <meta name="twitter:image" content={venue.logoUrl} />}
      {venue.logoUrl && <meta name="twitter:image:alt" content={`${venue.name} logo`} />}

      {/* Additional meta tags for mobile and app integration */}
      <meta name="theme-color" content="#000000" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={venue.name} />

      {/* Geo tags if venue has location data */}
      <meta name="geo.region" content="US" />
      <meta name="geo.placename" content={venue.name} />

      {/* JSON-LD structured data */}
      <script type="application/ld+json">
        {JSON.stringify(restaurantSchema, null, 2)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema, null, 2)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema, null, 2)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema, null, 2)}
      </script>

      {/* Preload critical resources */}
      <link rel="preload" as="font" type="font/woff2" href="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2" crossOrigin="anonymous" />

      {/* DNS prefetch for performance */}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

      {venue.logoUrl && (
        <link rel="preload" as="image" href={venue.logoUrl} />
      )}

      {/* Add language alternatives if translations are available */}
      <link rel="alternate" hrefLang="en" href={currentUrl} />

      {/* Manifest for PWA */}
      <link rel="manifest" href="/manifest.json" />

      {/* Favicon */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    </Helmet>
  )
}