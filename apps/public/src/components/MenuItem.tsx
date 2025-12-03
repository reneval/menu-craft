import React, { useRef, useEffect } from 'react'
import { MenuItem as MenuItemType } from '../lib/api'
import { Badge } from './Badge'
import { DietaryTag } from './DietaryTag'
import { AllergenTag } from './AllergenTag'
import { ItemOptions } from './ItemOptions'
import { trackItemViews } from '../lib/api'
import { formatPrice } from '../lib/utils'

interface MenuItemProps {
  item: MenuItemType
  venueSlug: string
  menuId: string
  sessionId: string
}

export function MenuItem({ item, venueSlug, menuId, sessionId }: MenuItemProps) {
  const itemRef = useRef<HTMLDivElement>(null)
  const viewStartTime = useRef<number | null>(null)

  // Track item view using Intersection Observer
  useEffect(() => {
    const element = itemRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            viewStartTime.current = Date.now()
          } else if (viewStartTime.current) {
            const duration = Date.now() - viewStartTime.current
            if (duration > 1000) { // Only track if viewed for more than 1 second
              trackItemViews(venueSlug, menuId, [
                { itemId: item.id, durationMs: duration }
              ], sessionId)
            }
            viewStartTime.current = null
          }
        })
      },
      {
        threshold: 0.5, // Track when 50% of the item is visible
        rootMargin: '-20px'
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
      // Track final view if still in viewport
      if (viewStartTime.current) {
        const duration = Date.now() - viewStartTime.current
        if (duration > 1000) {
          trackItemViews(venueSlug, menuId, [
            { itemId: item.id, durationMs: duration }
          ], sessionId)
        }
      }
    }
  }, [item.id, venueSlug, menuId, sessionId])

  const displayPrice = formatPrice(item.priceType, item.priceAmount)

  return (
    <article ref={itemRef} className="menu-item">
      <div className="item-content">
        {item.imageUrl && (
          <div className="flex-shrink-0">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="item-image"
              loading="lazy"
            />
          </div>
        )}

        <div className="item-details">
          <header className="item-header">
            <h3 className="item-name">{item.name}</h3>
            {displayPrice && (
              <div className="item-price">{displayPrice}</div>
            )}
          </header>

          {item.description && (
            <p className="item-description">{item.description}</p>
          )}

          <div className="item-meta">
            {/* Item badges */}
            {item.badges.map((badge) => (
              <Badge key={badge} type={badge} />
            ))}

            {/* Dietary tags */}
            {item.dietaryTags.map((tag) => (
              <DietaryTag key={tag} tag={tag} />
            ))}

            {/* Allergen warnings */}
            {item.allergens.map((allergen) => (
              <AllergenTag key={allergen} allergen={allergen} />
            ))}
          </div>

          {/* Item options */}
          {item.options.length > 0 && (
            <ItemOptions options={item.options} />
          )}
        </div>
      </div>
    </article>
  )
}