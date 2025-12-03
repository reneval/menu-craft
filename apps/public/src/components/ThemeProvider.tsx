import React, { useEffect } from 'react'

interface ThemeProviderProps {
  themeConfig: Record<string, any>
  children: React.ReactNode
}

export function ThemeProvider({ themeConfig, children }: ThemeProviderProps) {
  useEffect(() => {
    // Apply theme configuration to CSS variables
    if (themeConfig && Object.keys(themeConfig).length > 0) {
      Object.entries(themeConfig).forEach(([key, value]) => {
        if (typeof value === 'string') {
          document.documentElement.style.setProperty(`--${key}`, value)
        }
      })
    }

    // Cleanup on unmount
    return () => {
      if (themeConfig && Object.keys(themeConfig).length > 0) {
        Object.keys(themeConfig).forEach((key) => {
          document.documentElement.style.removeProperty(`--${key}`)
        })
      }
    }
  }, [themeConfig])

  return <>{children}</>
}