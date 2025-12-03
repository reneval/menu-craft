import React from 'react'
import { VenueData } from '../lib/api'

interface VenueHeaderProps {
  venue: VenueData
  menuName: string
}

export function VenueHeader({ venue, menuName }: VenueHeaderProps) {
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
    </header>
  )
}