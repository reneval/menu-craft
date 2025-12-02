/**
 * MenuCraft Shadow DOM Widget
 *
 * Usage:
 * <div id="menucraft-widget" data-venue="your-venue-slug"></div>
 * <script src="https://yourdomain.com/widgets/menucraft-widget-shadow.js"></script>
 *
 * This widget renders the menu directly in shadow DOM for native integration.
 * Styles are fully isolated from the host page.
 */

interface MenuCraftConfig {
  venue: string;
  container?: string;
  theme?: 'light' | 'dark' | 'auto';
  baseUrl?: string;
  apiUrl?: string;
  compact?: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  priceType: string;
  priceAmount?: number;
  dietaryTags: string[];
  allergens: string[];
  imageUrl?: string;
  isAvailable: boolean;
}

interface MenuSection {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

interface ThemeConfig {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: number;
}

interface MenuData {
  venue: {
    name: string;
    logoUrl?: string;
  };
  menu: {
    name: string;
    themeConfig: ThemeConfig;
    sections: MenuSection[];
  };
}

declare global {
  interface Window {
    MenuCraftWidgetShadow?: MenuCraftConfig;
  }
}

(function() {
  'use strict';

  const config: MenuCraftConfig = window.MenuCraftWidgetShadow || {} as MenuCraftConfig;

  let container: HTMLElement | null = null;

  if (config.container) {
    container = document.querySelector(config.container);
  }

  if (!container) {
    container = document.getElementById('menucraft-widget');
  }

  if (!container) {
    console.error('[MenuCraft] No container element found.');
    return;
  }

  const venue = config.venue || container.dataset.venue;

  if (!venue) {
    console.error('[MenuCraft] No venue specified.');
    return;
  }

  // Determine API URL
  const scriptTag = document.currentScript as HTMLScriptElement;
  let apiUrl = config.apiUrl;

  if (!apiUrl && scriptTag) {
    const scriptUrl = new URL(scriptTag.src);
    apiUrl = `${scriptUrl.protocol}//${scriptUrl.host}/api`;
  }

  if (!apiUrl) {
    apiUrl = 'https://menucraft.io/api';
  }

  // Create shadow DOM
  const shadow = container.attachShadow({ mode: 'open' });

  // Format price
  function formatPrice(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  }

  // Check if color is light
  function isLightColor(hex: string): boolean {
    const color = hex.replace('#', '');
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }

  // Generate styles
  function generateStyles(theme: ThemeConfig): string {
    const isLight = isLightColor(theme.backgroundColor);
    const mutedColor = isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)';
    const borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    return `
      @import url('https://fonts.googleapis.com/css2?family=${theme.fontFamily.replace(' ', '+')}:wght@400;500;600;700&display=swap');

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      :host {
        display: block;
        font-family: '${theme.fontFamily}', system-ui, sans-serif;
        background-color: ${theme.backgroundColor};
        color: ${theme.textColor};
        border-radius: ${theme.borderRadius}px;
        overflow: hidden;
      }

      .mc-container {
        padding: 24px;
        max-width: 800px;
        margin: 0 auto;
      }

      .mc-header {
        text-align: center;
        margin-bottom: 32px;
      }

      .mc-logo {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        margin-bottom: 16px;
      }

      .mc-title {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .mc-subtitle {
        font-size: 16px;
        color: ${mutedColor};
      }

      .mc-section {
        margin-bottom: 32px;
      }

      .mc-section-title {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid ${theme.primaryColor};
      }

      .mc-items {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .mc-item {
        display: flex;
        gap: 16px;
        padding: 16px;
        background: ${isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.05)'};
        border-radius: ${theme.borderRadius}px;
        border: 1px solid ${borderColor};
      }

      .mc-item-image {
        width: 80px;
        height: 80px;
        border-radius: ${theme.borderRadius / 2}px;
        object-fit: cover;
        flex-shrink: 0;
      }

      .mc-item-content {
        flex: 1;
        min-width: 0;
      }

      .mc-item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 8px;
      }

      .mc-item-name {
        font-size: 16px;
        font-weight: 600;
      }

      .mc-item-price {
        font-size: 16px;
        font-weight: 600;
        color: ${theme.primaryColor};
        white-space: nowrap;
      }

      .mc-item-description {
        font-size: 14px;
        color: ${mutedColor};
        line-height: 1.5;
      }

      .mc-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .mc-tag {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 12px;
        background: ${theme.primaryColor}20;
        color: ${theme.primaryColor};
      }

      .mc-unavailable {
        opacity: 0.5;
      }

      .mc-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px;
        color: ${mutedColor};
      }

      .mc-error {
        text-align: center;
        padding: 48px;
        color: #ef4444;
      }

      .mc-powered {
        text-align: center;
        padding: 16px;
        font-size: 12px;
        color: ${mutedColor};
      }

      .mc-powered a {
        color: ${theme.primaryColor};
        text-decoration: none;
      }

      @media (max-width: 480px) {
        .mc-container {
          padding: 16px;
        }

        .mc-item {
          flex-direction: column;
        }

        .mc-item-image {
          width: 100%;
          height: 160px;
        }
      }
    `;
  }

  // Render menu
  function renderMenu(data: MenuData): void {
    const { venue, menu } = data;
    const theme = menu.themeConfig;

    const style = document.createElement('style');
    style.textContent = generateStyles(theme);
    shadow.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.className = 'mc-container';

    // Header
    const header = document.createElement('header');
    header.className = 'mc-header';

    if (venue.logoUrl) {
      const logo = document.createElement('img');
      logo.className = 'mc-logo';
      logo.src = venue.logoUrl;
      logo.alt = venue.name;
      header.appendChild(logo);
    }

    const title = document.createElement('h1');
    title.className = 'mc-title';
    title.textContent = venue.name;
    header.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'mc-subtitle';
    subtitle.textContent = menu.name;
    header.appendChild(subtitle);

    wrapper.appendChild(header);

    // Sections
    for (const section of menu.sections) {
      const sectionEl = document.createElement('section');
      sectionEl.className = 'mc-section';

      const sectionTitle = document.createElement('h2');
      sectionTitle.className = 'mc-section-title';
      sectionTitle.textContent = section.name;
      sectionEl.appendChild(sectionTitle);

      const items = document.createElement('div');
      items.className = 'mc-items';

      for (const item of section.items) {
        const itemEl = document.createElement('article');
        itemEl.className = `mc-item${!item.isAvailable ? ' mc-unavailable' : ''}`;

        if (item.imageUrl) {
          const img = document.createElement('img');
          img.className = 'mc-item-image';
          img.src = item.imageUrl;
          img.alt = item.name;
          img.loading = 'lazy';
          itemEl.appendChild(img);
        }

        const content = document.createElement('div');
        content.className = 'mc-item-content';

        const itemHeader = document.createElement('div');
        itemHeader.className = 'mc-item-header';

        const name = document.createElement('h3');
        name.className = 'mc-item-name';
        name.textContent = item.name;
        itemHeader.appendChild(name);

        const price = document.createElement('span');
        price.className = 'mc-item-price';
        if (item.priceType === 'market_price') {
          price.textContent = 'Market Price';
        } else if (item.priceAmount) {
          price.textContent = formatPrice(item.priceAmount);
        }
        itemHeader.appendChild(price);

        content.appendChild(itemHeader);

        if (item.description) {
          const desc = document.createElement('p');
          desc.className = 'mc-item-description';
          desc.textContent = item.description;
          content.appendChild(desc);
        }

        const tags = [...item.dietaryTags, ...item.allergens];
        if (tags.length > 0) {
          const tagsEl = document.createElement('div');
          tagsEl.className = 'mc-tags';
          for (const tag of tags) {
            const tagEl = document.createElement('span');
            tagEl.className = 'mc-tag';
            tagEl.textContent = tag.replace('_', ' ');
            tagsEl.appendChild(tagEl);
          }
          content.appendChild(tagsEl);
        }

        itemEl.appendChild(content);
        items.appendChild(itemEl);
      }

      sectionEl.appendChild(items);
      wrapper.appendChild(sectionEl);
    }

    // Powered by
    const powered = document.createElement('div');
    powered.className = 'mc-powered';
    powered.innerHTML = 'Powered by <a href="https://menucraft.io" target="_blank" rel="noopener">MenuCraft</a>';
    wrapper.appendChild(powered);

    shadow.appendChild(wrapper);
  }

  // Show loading
  function showLoading(): void {
    const loading = document.createElement('div');
    loading.className = 'mc-loading';
    loading.textContent = 'Loading menu...';
    shadow.appendChild(loading);
  }

  // Show error
  function showError(message: string): void {
    shadow.innerHTML = '';
    const error = document.createElement('div');
    error.className = 'mc-error';
    error.textContent = message;
    shadow.appendChild(error);
  }

  // Fetch and render
  async function init(): Promise<void> {
    showLoading();

    try {
      const response = await fetch(`${apiUrl}/public/v/${venue}/menu`);

      if (!response.ok) {
        throw new Error('Failed to load menu');
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Menu not found');
      }

      shadow.innerHTML = '';
      renderMenu(result.data);

    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load menu');
    }
  }

  init();

  console.log('[MenuCraft] Shadow widget loaded for venue:', venue);
})();
