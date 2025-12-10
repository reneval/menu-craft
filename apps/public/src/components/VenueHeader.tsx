import React from 'react'
import { VenueData, Address } from '../lib/api'

interface VenueHeaderProps {
  venue: VenueData
  menuName: string
}

// Format address for Google Maps URL
function formatAddressForMaps(address: Address): string {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean)
  return parts.join(', ')
}

// Generate Google Maps directions URL
function getDirectionsUrl(address: Address): string {
  const formatted = formatAddressForMaps(address)
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatted)}`
}

export function VenueHeader({ venue, menuName }: VenueHeaderProps) {
  const hasAddress = venue.address && (venue.address.street || venue.address.city)

  return (
    <header className="venue-header">
      {venue.logoUrl && (
        <img
          src={venue.logoUrl}
          alt={`${venue.name} logo`}
          className="venue-logo"
        />
      )}
      <h1 className="venue-name">{venue.name}</h1>
      <p className="menu-name">{menuName}</p>

      {/* Contact Actions */}
      {(venue.phone || hasAddress) && (
        <div className="venue-actions">
          {venue.phone && (
            <a
              href={`tel:${venue.phone}`}
              className="action-button action-button--call"
              aria-label={`Call ${venue.name}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>Call</span>
            </a>
          )}

          {hasAddress && venue.address && (
            <a
              href={getDirectionsUrl(venue.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="action-button action-button--directions"
              aria-label={`Get directions to ${venue.name}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>Directions</span>
            </a>
          )}
        </div>
      )}
    </header>
  )
}
