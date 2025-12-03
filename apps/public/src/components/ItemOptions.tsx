import React from 'react'
import { MenuItemOption } from '../lib/api'
import { formatCurrency } from '../lib/utils'

interface ItemOptionsProps {
  options: MenuItemOption[]
}

export function ItemOptions({ options }: ItemOptionsProps) {
  if (options.length === 0) {
    return null
  }

  return (
    <div className="item-options">
      {options.map((optionGroup) => (
        <div key={optionGroup.group} className="option-group">
          <h4 className="option-group-title">{optionGroup.group}</h4>
          <div className="option-list">
            {optionGroup.options.map((option) => (
              <div key={option.id} className="option-item">
                <span className="option-name">{option.name}</span>
                {option.priceModifier !== 0 && (
                  <span className="option-price">
                    {option.priceModifier > 0 ? '+' : ''}
                    {formatCurrency(option.priceModifier)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}