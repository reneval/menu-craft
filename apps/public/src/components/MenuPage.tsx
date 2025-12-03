import React, { useEffect, useMemo } from 'react'
import { VenueMenuResponse } from '../lib/api'
import { VenueHeader } from './VenueHeader'
import { LanguageSelector } from './LanguageSelector'
import { MenuSection } from './MenuSection'
import { ThemeProvider } from './ThemeProvider'
import { SEOHead } from './SEOHead'
import { trackMenuView } from '../lib/api'

interface MenuPageProps {
  menuData: VenueMenuResponse
  embedded?: boolean
  hideHeader?: boolean
  hideFooter?: boolean
}

export function MenuPage({ menuData, embedded = false, hideHeader = false, hideFooter = false }: MenuPageProps) {
  const { venue, menu, meta } = menuData

  // Generate session ID for analytics
  const sessionId = useMemo(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Track menu view
  useEffect(() => {
    trackMenuView(venue.slug, menu.id, sessionId, document.referrer)
  }, [venue.slug, menu.id, sessionId])

  // Apply theme configuration
  useEffect(() => {
    if (menu.themeConfig && Object.keys(menu.themeConfig).length > 0) {
      Object.entries(menu.themeConfig).forEach(([key, value]) => {
        if (typeof value === 'string') {
          document.documentElement.style.setProperty(`--${key}`, value)
        }
      })
    }
  }, [menu.themeConfig])

  return (
    <ThemeProvider themeConfig={menu.themeConfig}>
      <SEOHead venue={venue} menu={menu} />

      <div className="menu-container">
        <LanguageSelector currentLang={meta.language} />

        <VenueHeader venue={venue} menuName={menu.name} />

        <main className="space-y-12">
          {menu.sections.map((section) => (
            <MenuSection
              key={section.id}
              section={section}
              venueSlug={venue.slug}
              menuId={menu.id}
              sessionId={sessionId}
            />
          ))}
        </main>

        {menu.sections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Menu is currently being updated. Please check back soon.
            </p>
          </div>
        )}
      </div>
    </ThemeProvider>
  )
}