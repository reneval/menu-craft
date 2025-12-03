import React, { useEffect } from 'react'
import { MenuPage } from './MenuPage'
import type { MenuData } from '../types'

interface EmbeddableMenuProps {
  menuData: MenuData
  config?: {
    hideHeader?: boolean
    hideFooter?: boolean
    compactMode?: boolean
    maxHeight?: string
    theme?: {
      primaryColor?: string
      fontFamily?: string
      borderRadius?: string
    }
  }
}

export function EmbeddableMenu({ menuData, config = {} }: EmbeddableMenuProps) {
  const {
    hideHeader = false,
    hideFooter = true,
    compactMode = true,
    maxHeight = '600px',
    theme = {}
  } = config

  useEffect(() => {
    // Apply embed-specific styles
    if (theme.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', theme.primaryColor)
    }
    if (theme.fontFamily) {
      document.documentElement.style.setProperty('--font-family', theme.fontFamily)
    }
    if (theme.borderRadius) {
      document.documentElement.style.setProperty('--border-radius', theme.borderRadius)
    }

    // Add embed-specific body classes
    document.body.classList.add('embedded-menu')
    if (compactMode) {
      document.body.classList.add('compact-mode')
    }

    return () => {
      document.body.classList.remove('embedded-menu', 'compact-mode')
    }
  }, [theme, compactMode])

  // Enhanced styles for embedded mode
  const embeddedStyles = `
    .embedded-menu {
      margin: 0;
      padding: 0;
      font-family: var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      background: transparent;
      overflow-x: hidden;
    }

    .compact-mode .menu-section {
      margin-bottom: 1.5rem;
    }

    .compact-mode .menu-item {
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .compact-mode .item-name {
      font-size: 0.95rem;
    }

    .compact-mode .item-description {
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .embed-container {
      max-height: ${maxHeight};
      overflow-y: auto;
      border: 1px solid #e5e7eb;
      border-radius: var(--border-radius, 0.5rem);
      background: white;
    }

    .embed-scrollbar::-webkit-scrollbar {
      width: 6px;
    }

    .embed-scrollbar::-webkit-scrollbar-track {
      background: #f1f5f9;
    }

    .embed-scrollbar::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .embed-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    /* Hide elements in embed mode */
    .embedded-menu .venue-navigation,
    .embedded-menu .menu-selector {
      display: ${hideHeader ? 'none' : 'block'};
    }

    .embedded-menu .footer,
    .embedded-menu .branding {
      display: ${hideFooter ? 'none' : 'block'};
    }

    /* Responsive adjustments for embeds */
    @media (max-width: 640px) {
      .embed-container {
        border-left: none;
        border-right: none;
        border-radius: 0;
      }

      .compact-mode .menu-item {
        padding: 0.5rem;
      }
    }
  `

  return (
    <>
      <style>{embeddedStyles}</style>
      <div className="embed-container embed-scrollbar">
        <MenuPage
          menuData={{
            ...menuData,
            meta: {
              language: 'en',
              generatedAt: new Date().toISOString()
            }
          } as any}
          embedded={true}
          hideHeader={hideHeader}
          hideFooter={hideFooter}
        />
      </div>
    </>
  )
}