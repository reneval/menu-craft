import React from 'react'
import { formatDietaryTag } from '../lib/utils'

interface AllergenTagProps {
  allergen: string
}

export function AllergenTag({ allergen }: AllergenTagProps) {
  return (
    <span className="allergen-tag">
      ⚠️ {formatDietaryTag(allergen)}
    </span>
  )
}