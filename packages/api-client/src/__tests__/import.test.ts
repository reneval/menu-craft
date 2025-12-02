import { describe, it, expect } from 'vitest';
import { parseCsv } from '../hooks/import.js';

describe('parseCsv', () => {
  it('parses simple CSV with headers', () => {
    const csv = `section,name,description,price
Appetizers,Spring Rolls,Crispy vegetable rolls,8.99
Appetizers,Chicken Wings,Spicy buffalo wings,12.99`;

    const result = parseCsv(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      section: 'Appetizers',
      name: 'Spring Rolls',
      description: 'Crispy vegetable rolls',
      price: '8.99',
      priceType: 'fixed',
      dietaryTags: '',
      allergens: '',
      available: 'true',
    });
    expect(result[1]).toEqual({
      section: 'Appetizers',
      name: 'Chicken Wings',
      description: 'Spicy buffalo wings',
      price: '12.99',
      priceType: 'fixed',
      dietaryTags: '',
      allergens: '',
      available: 'true',
    });
  });

  it('handles quoted values with commas', () => {
    const csv = `section,name,description,price
Main Course,"Grilled Salmon, Fresh","Atlantic salmon, herbs, butter",24.99`;

    const result = parseCsv(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Grilled Salmon, Fresh');
    expect(result[0]?.description).toBe('Atlantic salmon, herbs, butter');
  });

  it('handles escaped quotes in quoted values', () => {
    const csv = `section,name,description,price
Appetizers,"Spring ""Fresh"" Rolls",Crispy rolls,8.99`;

    const result = parseCsv(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Spring "Fresh" Rolls');
  });

  it('handles all columns', () => {
    const csv = `section,name,description,price,priceType,dietaryTags,allergens,available
Appetizers,Veggie Rolls,Fresh veggie rolls,6.99,fixed,vegetarian|vegan,gluten,true
Main Course,Fish Market,Fresh catch of the day,,market_price,,fish|shellfish,true`;

    const result = parseCsv(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      section: 'Appetizers',
      name: 'Veggie Rolls',
      description: 'Fresh veggie rolls',
      price: '6.99',
      priceType: 'fixed',
      dietaryTags: 'vegetarian|vegan',
      allergens: 'gluten',
      available: 'true',
    });
    expect(result[1]).toEqual({
      section: 'Main Course',
      name: 'Fish Market',
      description: 'Fresh catch of the day',
      price: '',
      priceType: 'market_price',
      dietaryTags: '',
      allergens: 'fish|shellfish',
      available: 'true',
    });
  });

  it('handles empty lines', () => {
    const csv = `section,name,description,price
Appetizers,Spring Rolls,Crispy vegetable rolls,8.99

Main Course,Grilled Salmon,Fresh Atlantic salmon,24.99
`;

    const result = parseCsv(csv);

    expect(result).toHaveLength(2);
  });

  it('handles case-insensitive headers', () => {
    const csv = `Section,NAME,Description,PRICE
Appetizers,Spring Rolls,Crispy rolls,8.99`;

    const result = parseCsv(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.section).toBe('Appetizers');
    expect(result[0]?.name).toBe('Spring Rolls');
  });

  it('handles underscored header names', () => {
    const csv = `section,name,description,price,price_type,dietary_tags
Appetizers,Spring Rolls,Crispy rolls,8.99,variable,vegetarian`;

    const result = parseCsv(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.priceType).toBe('variable');
    expect(result[0]?.dietaryTags).toBe('vegetarian');
  });

  it('throws error for missing required headers', () => {
    const csv = `name,description,price
Spring Rolls,Crispy vegetable rolls,8.99`;

    expect(() => parseCsv(csv)).toThrow('Missing required column: section');
  });

  it('throws error for missing name header', () => {
    const csv = `section,description,price
Appetizers,Crispy vegetable rolls,8.99`;

    expect(() => parseCsv(csv)).toThrow('Missing required column: name');
  });

  it('throws error for empty CSV', () => {
    const csv = '';
    expect(() => parseCsv(csv)).toThrow('CSV must have a header row and at least one data row');
  });

  it('throws error for header only CSV', () => {
    const csv = 'section,name,description,price';
    expect(() => parseCsv(csv)).toThrow('CSV must have a header row and at least one data row');
  });

  it('throws error when all data rows are invalid', () => {
    const csv = `section,name,description,price
,Missing Section,Desc,8.99
Has Section,,Missing Name,9.99`;
    expect(() => parseCsv(csv)).toThrow('No valid data rows found in CSV');
  });

  it('skips rows without section or name', () => {
    const csv = `section,name,description,price
,Spring Rolls,Crispy rolls,8.99
Appetizers,,Description only,9.99
Appetizers,Valid Item,Valid description,7.99`;

    const result = parseCsv(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Valid Item');
  });

  it('trims whitespace from values', () => {
    const csv = `section,name,description,price
  Appetizers  ,  Spring Rolls  ,  Crispy rolls  ,  8.99  `;

    const result = parseCsv(csv);

    expect(result).toHaveLength(1);
    expect(result[0]?.section).toBe('Appetizers');
    expect(result[0]?.name).toBe('Spring Rolls');
    expect(result[0]?.description).toBe('Crispy rolls');
    expect(result[0]?.price).toBe('8.99');
  });

  it('handles Windows line endings (CRLF)', () => {
    const csv = 'section,name,description,price\r\nAppetizers,Spring Rolls,Crispy rolls,8.99\r\nAppetizers,Wings,Buffalo wings,12.99';

    const result = parseCsv(csv);

    expect(result).toHaveLength(2);
  });

  it('handles optional columns being missing entirely', () => {
    const csv = `section,name
Appetizers,Spring Rolls
Main Course,Salmon`;

    const result = parseCsv(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      section: 'Appetizers',
      name: 'Spring Rolls',
      description: '',
      price: '',
      priceType: 'fixed',
      dietaryTags: '',
      allergens: '',
      available: 'true',
    });
  });
});
