import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorPageProps {
  title: string
  message: string
  showRetry?: boolean
}

export function ErrorPage({ title, message, showRetry = true }: ErrorPageProps) {
  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="error-container">
      <AlertCircle className="error-icon" />
      <h1 className="error-title">{title}</h1>
      <p className="error-message">{message}</p>

      {showRetry && (
        <button
          onClick={handleRetry}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  )
}