import type { DietaryTag, Allergen } from '@menucraft/shared-types';

export const DIETARY_TAGS: { id: DietaryTag; label: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten_free', label: 'Gluten Free' },
  { id: 'dairy_free', label: 'Dairy Free' },
  { id: 'nut_free', label: 'Nut Free' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
  { id: 'spicy', label: 'Spicy' },
  { id: 'organic', label: 'Organic' },
];

export const ALLERGENS: { id: Allergen; label: string }[] = [
  { id: 'gluten', label: 'Gluten' },
  { id: 'nuts', label: 'Tree Nuts' },
  { id: 'peanuts', label: 'Peanuts' },
  { id: 'milk', label: 'Milk/Dairy' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'soybeans', label: 'Soy' },
  { id: 'fish', label: 'Fish' },
  { id: 'crustaceans', label: 'Shellfish' },
  { id: 'sesame', label: 'Sesame' },
];
