import React from 'react'
import { useNavigate } from '@tanstack/react-router'

interface LanguageSelectorProps {
  currentLang: string
}

export function LanguageSelector({ currentLang }: LanguageSelectorProps) {
  const navigate = useNavigate()

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
  ]

  const handleLanguageChange = (langCode: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('lang', langCode)
    window.location.href = url.toString()
  }

  return (
    <div className="language-selector">
      <select
        value={currentLang}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="language-button"
        aria-label="Select language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}