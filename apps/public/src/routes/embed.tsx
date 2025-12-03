import React, { useEffect, useState } from 'react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { EmbeddableMenu } from '../components/EmbeddableMenu'
import { LoadingPage } from '../components/LoadingPage'
import { ErrorPage } from '../components/ErrorPage'
import type { MenuData, EmbedConfig } from '../types'

export const Route = createFileRoute('/embed' as any)({
  component: EmbedRoute,
})

function EmbedRoute() {
  const search = useSearch({ from: '/embed' }) as any
  const [menuData, setMenuData] = useState<MenuData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const venueSlug = search.venue as string
  const menuId = search.menu as string

  // Parse embed configuration from URL parameters
  const config: EmbedConfig = {
    hideHeader: search.hideHeader === 'true',
    hideFooter: search.hideFooter !== 'false',
    compactMode: search.compactMode !== 'false',
    maxHeight: search.maxHeight || '600px',
    primaryColor: search.primaryColor || undefined,
    fontFamily: search.fontFamily || undefined,
    borderRadius: search.borderRadius || undefined,
  }

  useEffect(() => {
    if (!venueSlug) {
      setError('Venue parameter is required')
      setLoading(false)
      return
    }

    const fetchMenuData = async () => {
      try {
        setLoading(true)
        setError(null)

        let url = `/api/public/v/${venueSlug}`
        if (menuId) {
          url += `/${menuId}`
        }

        const lang = search.lang as string
        if (lang) {
          url += `?lang=${lang}`
        }

        const response = await fetch(url)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Menu not found')
          }
          throw new Error('Failed to load menu')
        }

        const data = await response.json()
        setMenuData(data)
      } catch (err) {
        console.error('Failed to load menu data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load menu')
      } finally {
        setLoading(false)
      }
    }

    fetchMenuData()
  }, [venueSlug, menuId, search])

  // Handle iframe communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from allowed origins (configure as needed)
      if (event.origin === window.location.origin) {
        return
      }

      if (event.data.type === 'requestHeight') {
        const scrollHeight = document.documentElement.scrollHeight
        const message = {
          type: 'heightUpdate',
          height: scrollHeight
        }
        const windowSource = event.source as Window
        windowSource?.postMessage(message, event.origin)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Auto-resize for iframe
  useEffect(() => {
    if (!loading && window.parent !== window) {
      const resizeObserver = new ResizeObserver(() => {
        const docHeight = document.documentElement.scrollHeight
        window.parent.postMessage({
          type: 'heightUpdate',
          height: docHeight
        }, '*')
      })

      resizeObserver.observe(document.body)

      // Initial height update
      setTimeout(() => {
        const initialHeight = document.documentElement.scrollHeight
        window.parent.postMessage({
          type: 'heightUpdate',
          height: initialHeight
        }, '*')
      }, 100)

      return () => resizeObserver.disconnect()
    }
  }, [loading])

  if (loading) {
    return <LoadingPage />
  }

  if (error) {
    return (
      <ErrorPage
        title="Unable to load menu"
        message={error}
        showRetry={true}
      />
    )
  }

  if (!menuData) {
    return (
      <ErrorPage
        title="Menu not found"
        message="The requested menu could not be found."
        showRetry={false}
      />
    )
  }

  return (
    <EmbeddableMenu
      menuData={menuData}
      config={{
        hideHeader: config.hideHeader,
        hideFooter: config.hideFooter,
        compactMode: config.compactMode,
        maxHeight: config.maxHeight,
        theme: {
          primaryColor: config.primaryColor,
          fontFamily: config.fontFamily,
          borderRadius: config.borderRadius,
        }
      }}
    />
  )
}