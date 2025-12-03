import React from 'react'
import { getDietaryTagIcon, formatDietaryTag } from '../lib/utils'

interface DietaryTagProps {
  tag: string
}

export function DietaryTag({ tag }: DietaryTagProps) {
  const icon = getDietaryTagIcon(tag)
  const label = formatDietaryTag(tag)

  return (
    <span className="dietary-tag">
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </span>
  )
}