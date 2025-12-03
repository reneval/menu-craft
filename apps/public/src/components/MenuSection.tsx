import React from 'react'
import { MenuSection as MenuSectionType } from '../lib/api'
import { MenuItem } from './MenuItem'

interface MenuSectionProps {
  section: MenuSectionType
  venueSlug: string
  menuId: string
  sessionId: string
}

export function MenuSection({ section, venueSlug, menuId, sessionId }: MenuSectionProps) {
  if (section.items.length === 0) {
    return null
  }

  return (
    <section className="menu-section">
      <header className="section-header">
        <h2 className="section-title">{section.name}</h2>
        {section.description && (
          <p className="section-description">{section.description}</p>
        )}
      </header>

      <div className="menu-items">
        {section.items.map((item) => (
          <MenuItem
            key={item.id}
            item={item}
            venueSlug={venueSlug}
            menuId={menuId}
            sessionId={sessionId}
          />
        ))}
      </div>
    </section>
  )
}