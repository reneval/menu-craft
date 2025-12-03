import React from 'react'
import { getBadgeIcon, formatDietaryTag } from '../lib/utils'

interface BadgeProps {
  type: string
}

export function Badge({ type }: BadgeProps) {
  const icon = getBadgeIcon(type)
  const label = formatDietaryTag(type)

  const className = `badge badge-${type.replace(/_/g, '-')}`

  return (
    <span className={className}>
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </span>
  )
}