/**
 * MenuCraft Iframe Widget
 *
 * Usage:
 * <div id="menucraft-widget" data-venue="your-venue-slug"></div>
 * <script src="https://yourdomain.com/widgets/menucraft-widget.js"></script>
 *
 * Or with configuration:
 * <script>
 *   window.MenuCraftWidget = {
 *     venue: 'your-venue-slug',
 *     container: '#my-menu',
 *     height: '600px',
 *     theme: 'light',
 *     showHeader: true,
 *     showSearch: true,
 *     showFilters: true,
 *     maxWidth: '800px',
 *     borderRadius: '8px',
 *     language: 'en'
 *   };
 * </script>
 * <script src="https://yourdomain.com/widgets/menucraft-widget.js"></script>
 */

interface MenuCraftConfig {
  venue: string;
  container?: string;
  height?: string;
  theme?: 'light' | 'dark' | 'auto';
  baseUrl?: string;
  // New display options
  showHeader?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  maxWidth?: string;
  borderRadius?: string;
  language?: string;
}

declare global {
  interface Window {
    MenuCraftWidget?: MenuCraftConfig;
  }
}

(function() {
  'use strict';

  // Get configuration
  const config: MenuCraftConfig = window.MenuCraftWidget || {} as MenuCraftConfig;

  // Find container element
  let container: HTMLElement | null = null;

  if (config.container) {
    container = document.querySelector(config.container);
  }

  if (!container) {
    container = document.getElementById('menucraft-widget');
  }

  if (!container) {
    console.error('[MenuCraft] No container element found. Add <div id="menucraft-widget"></div> to your page.');
    return;
  }

  // Get venue slug from config or data attribute
  const venue = config.venue || container.dataset.venue;

  if (!venue) {
    console.error('[MenuCraft] No venue specified. Set data-venue attribute or window.MenuCraftWidget.venue');
    return;
  }

  // Determine base URL
  const scriptTag = document.currentScript as HTMLScriptElement;
  let baseUrl = config.baseUrl;

  if (!baseUrl && scriptTag) {
    const scriptUrl = new URL(scriptTag.src);
    baseUrl = `${scriptUrl.protocol}//${scriptUrl.host}`;
  }

  if (!baseUrl) {
    baseUrl = 'https://menucraft.io';
  }

  // Build iframe URL
  const params = new URLSearchParams();
  params.set('embed', 'true');
  if (config.theme) {
    params.set('theme', config.theme);
  }
  if (config.showHeader === false) {
    params.set('hideHeader', 'true');
  }
  if (config.showSearch === false) {
    params.set('hideSearch', 'true');
  }
  if (config.showFilters === false) {
    params.set('hideFilters', 'true');
  }
  if (config.language) {
    params.set('lang', config.language);
  }

  const iframeSrc = `${baseUrl}/m/${venue}?${params.toString()}`;

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = iframeSrc;
  iframe.style.width = '100%';
  iframe.style.height = config.height || container.dataset.height || '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = config.borderRadius || container.dataset.borderRadius || '8px';
  iframe.style.overflow = 'hidden';
  iframe.title = 'Menu';
  iframe.loading = 'lazy';
  iframe.allow = 'clipboard-write';

  // Apply maxWidth if specified
  if (config.maxWidth || container.dataset.maxWidth) {
    iframe.style.maxWidth = config.maxWidth || container.dataset.maxWidth || '';
    iframe.style.margin = '0 auto';
    iframe.style.display = 'block';
  }

  // Clear container and insert iframe
  container.innerHTML = '';
  container.appendChild(iframe);

  // Listen for resize messages from iframe
  window.addEventListener('message', (event) => {
    // Verify origin
    if (!event.origin.includes(new URL(baseUrl!).host)) return;

    if (event.data.type === 'menucraft:resize') {
      iframe.style.height = `${event.data.height}px`;
    }
  });

  console.log('[MenuCraft] Widget loaded for venue:', venue);
})();
