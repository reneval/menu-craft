import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router';
import { usePublicMenu, getLanguageNativeName, COMMON_LANGUAGES } from '@menucraft/api-client';
import { Loader2, MapPin, AlertTriangle, Leaf, Wheat, Globe, Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSEO, generateMenuJsonLd } from '@/lib/seo';
import type { ThemeConfig } from '@menucraft/shared-types';
import { ITEM_BADGES } from '@menucraft/shared-types';
import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { z } from 'zod';

const searchSchema = z.object({
  embed: z.string().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  lang: z.string().optional(),
  // Widget customization options
  hideHeader: z.string().optional(),
  hideSearch: z.string().optional(),
  hideFilters: z.string().optional(),
});

export const Route = createFileRoute('/m/$venueSlug')({
  component: PublicMenuPage,
  validateSearch: searchSchema,
});

// Default theme
const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#3b82f6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  fontFamily: 'Inter',
  borderRadius: 8,
  layout: 'list',
  showImages: true,
  showDescriptions: true,
  showPrices: true,
  showTags: true,
};

// Dietary tag display config
const DIETARY_TAG_CONFIG: Record<string, { label: string; icon?: typeof Leaf; color: string }> = {
  vegetarian: { label: 'Vegetarian', icon: Leaf, color: 'bg-green-100 text-green-800' },
  vegan: { label: 'Vegan', icon: Leaf, color: 'bg-green-100 text-green-800' },
  gluten_free: { label: 'GF', icon: Wheat, color: 'bg-amber-100 text-amber-800' },
  dairy_free: { label: 'DF', color: 'bg-blue-100 text-blue-800' },
  nut_free: { label: 'NF', color: 'bg-orange-100 text-orange-800' },
  halal: { label: 'Halal', color: 'bg-emerald-100 text-emerald-800' },
  kosher: { label: 'Kosher', color: 'bg-indigo-100 text-indigo-800' },
  spicy: { label: 'Spicy', color: 'bg-red-100 text-red-800' },
  contains_alcohol: { label: '21+', color: 'bg-purple-100 text-purple-800' },
};

// Allergen display config
const ALLERGEN_CONFIG: Record<string, string> = {
  gluten: 'Gluten',
  nuts: 'Tree Nuts',
  peanuts: 'Peanuts',
  milk: 'Milk',
  eggs: 'Eggs',
  fish: 'Fish',
  shellfish: 'Shellfish',
  soy: 'Soy',
  sesame: 'Sesame',
  crustaceans: 'Crustaceans',
};

// Helper to determine if a color is light or dark
function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Get or create a session ID for tracking
function getSessionId(): string {
  const key = 'menucraft_session';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

// Track a menu view
async function trackView(venueSlug: string, menuId: string) {
  try {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    await fetch(`${apiBase}/public/v/${venueSlug}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menuId,
        sessionId: getSessionId(),
        referrer: document.referrer || undefined,
      }),
    });
  } catch {
    // Silently fail tracking
  }
}

// Track item views (batch)
async function trackItemViews(
  venueSlug: string,
  menuId: string,
  items: Array<{ itemId: string; durationMs: number }>
) {
  if (items.length === 0) return;
  try {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    await fetch(`${apiBase}/public/v/${venueSlug}/track-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menuId,
        sessionId: getSessionId(),
        items,
      }),
    });
  } catch {
    // Silently fail tracking
  }
}

// Hook for tracking item visibility with Intersection Observer
function useItemViewTracking(
  venueSlug: string,
  menuId: string | undefined,
  enabled: boolean = true
) {
  const viewedItems = useRef<Map<string, { startTime: number; sent: boolean }>>(new Map());
  const pendingItems = useRef<Array<{ itemId: string; durationMs: number }>>([]);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPending = useCallback(() => {
    if (pendingItems.current.length > 0 && menuId) {
      const items = [...pendingItems.current];
      pendingItems.current = [];
      trackItemViews(venueSlug, menuId, items);
    }
  }, [venueSlug, menuId]);

  // Flush pending items before unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      // Mark all currently viewed items as complete
      viewedItems.current.forEach((data, itemId) => {
        if (!data.sent) {
          const duration = Date.now() - data.startTime;
          pendingItems.current.push({ itemId, durationMs: duration });
          data.sent = true;
        }
      });
      flushPending();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, flushPending]);

  // Create intersection observer callback
  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        const itemId = entry.target.getAttribute('data-item-id');
        if (!itemId) return;

        if (entry.isIntersecting) {
          // Item entered viewport
          if (!viewedItems.current.has(itemId)) {
            viewedItems.current.set(itemId, { startTime: Date.now(), sent: false });
          }
        } else {
          // Item left viewport
          const data = viewedItems.current.get(itemId);
          if (data && !data.sent) {
            const duration = Date.now() - data.startTime;
            // Only count if viewed for at least 500ms
            if (duration >= 500) {
              pendingItems.current.push({ itemId, durationMs: duration });
              data.sent = true;

              // Debounce flush - send after 2 seconds of no new items
              if (flushTimeoutRef.current) {
                clearTimeout(flushTimeoutRef.current);
              }
              flushTimeoutRef.current = setTimeout(flushPending, 2000);
            }
          }
        }
      });
    },
    [flushPending]
  );

  // Create and return the observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!enabled || !menuId) return;

    observerRef.current = new IntersectionObserver(observerCallback, {
      threshold: 0.5, // 50% of item must be visible
      rootMargin: '0px',
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, [enabled, menuId, observerCallback]);

  // Function to observe an item
  const observeItem = useCallback((element: HTMLElement | null) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  }, []);

  return { observeItem };
}

function PublicMenuPage() {
  const { venueSlug } = Route.useParams();
  const search = useSearch({ from: '/m/$venueSlug' });
  const navigate = useNavigate();
  const isEmbedded = search.embed === 'true';
  const selectedLang = search.lang;
  const hideHeader = search.hideHeader === 'true';
  const hideSearch = search.hideSearch === 'true';
  const hideFilters = search.hideFilters === 'true';
  const { data, isLoading, error } = usePublicMenu(venueSlug, selectedLang);
  const hasTracked = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Item view tracking with Intersection Observer
  const { observeItem } = useItemViewTracking(venueSlug, data?.menu?.id);

  // Helper to get translated text
  const t = (entityId: string, field: 'name' | 'description', fallback: string | null | undefined): string => {
    if (!data?.translations || !data.languages || data.languages.current === data.languages.default) {
      return fallback || '';
    }
    const translation = data.translations[entityId];
    return translation?.[field] || fallback || '';
  };

  const handleLanguageChange = (langCode: string) => {
    setLangDropdownOpen(false);
    navigate({
      to: '/m/$venueSlug',
      params: { venueSlug },
      search: { ...search, lang: langCode === data?.languages?.default ? undefined : langCode },
    });
  };

  // Track view when data is loaded
  useEffect(() => {
    if (data?.menu?.id && !hasTracked.current) {
      hasTracked.current = true;
      trackView(venueSlug, data.menu.id);
    }
  }, [venueSlug, data?.menu?.id]);

  // Send height to parent for iframe resizing
  useEffect(() => {
    if (isEmbedded && containerRef.current) {
      const sendHeight = () => {
        const height = containerRef.current?.scrollHeight || 0;
        window.parent.postMessage({ type: 'menucraft:resize', height }, '*');
      };

      // Send initial height
      sendHeight();

      // Observe size changes
      const observer = new ResizeObserver(sendHeight);
      observer.observe(containerRef.current);

      return () => observer.disconnect();
    }
  }, [isEmbedded, data]);

  // Compute theme styles
  const theme = useMemo(() => {
    if (!data?.menu?.themeConfig) return DEFAULT_THEME;
    return { ...DEFAULT_THEME, ...(data.menu.themeConfig as ThemeConfig) };
  }, [data?.menu?.themeConfig]);

  // SEO configuration
  const seoConfig = useMemo(() => {
    if (!data) return null;
    const { venue, menu } = data;
    const publicUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
    const canonicalUrl = `${publicUrl}/m/${venueSlug}`;

    // Generate description from first few menu items
    const itemNames = menu.sections
      .flatMap((s) => s.items.slice(0, 3))
      .slice(0, 5)
      .map((i) => i.name)
      .join(', ');
    const description = `View the menu at ${venue.name}. ${menu.name} features ${itemNames} and more.`;

    // Find first item with image for og:image
    const firstImageItem = menu.sections
      .flatMap((s) => s.items)
      .find((i) => i.imageUrl);
    const ogImage = firstImageItem?.imageUrl || venue.logoUrl;

    // Generate JSON-LD
    const jsonLd = generateMenuJsonLd({
      venueName: venue.name,
      venueAddress: venue.address as { street?: string; city?: string; state?: string; zip?: string; country?: string } | undefined,
      venueLogoUrl: venue.logoUrl ?? undefined,
      menuName: menu.name,
      menuDescription: description,
      menuUrl: canonicalUrl,
      sections: menu.sections.map((s) => ({
        name: s.name,
        items: s.items.map((i) => ({
          name: i.name,
          description: i.description,
          priceAmount: i.priceAmount,
          imageUrl: i.imageUrl,
          dietaryTags: i.dietaryTags as string[] | null,
        })),
      })),
    });

    return {
      title: `${menu.name} - ${venue.name} | MenuCraft`,
      description,
      canonicalUrl,
      ogImage: ogImage ?? undefined,
      ogType: 'restaurant.menu' as const,
      twitterCard: ogImage ? 'summary_large_image' as const : 'summary' as const,
      jsonLd,
    };
  }, [data, venueSlug]);

  // Apply SEO
  useSEO(seoConfig || { title: 'Loading Menu... | MenuCraft' });

  // Available dietary filter options
  const FILTER_OPTIONS = [
    { id: 'vegetarian', label: 'Vegetarian', icon: Leaf },
    { id: 'vegan', label: 'Vegan', icon: Leaf },
    { id: 'gluten_free', label: 'Gluten-Free', icon: Wheat },
    { id: 'dairy_free', label: 'Dairy-Free' },
    { id: 'nut_free', label: 'Nut-Free' },
  ];

  // Filter and search items
  const filteredMenu = useMemo(() => {
    if (!data?.menu) return null;

    const query = searchQuery.toLowerCase().trim();
    const hasSearch = query.length > 0;
    const hasFilters = selectedFilters.length > 0;

    if (!hasSearch && !hasFilters) {
      return data.menu;
    }

    const filteredSections = data.menu.sections.map((section) => {
      const filteredItems = section.items.filter((item) => {
        // Search filter
        if (hasSearch) {
          const nameMatch = item.name.toLowerCase().includes(query);
          const descMatch = item.description?.toLowerCase().includes(query) || false;
          if (!nameMatch && !descMatch) return false;
        }

        // Dietary filter
        if (hasFilters) {
          const itemTags = (item.dietaryTags || []) as string[];
          const hasAllFilters = selectedFilters.every((filter) =>
            itemTags.includes(filter)
          );
          if (!hasAllFilters) return false;
        }

        return true;
      });

      return { ...section, items: filteredItems };
    }).filter((section) => section.items.length > 0);

    return { ...data.menu, sections: filteredSections };
  }, [data?.menu, searchQuery, selectedFilters]);

  const toggleFilter = useCallback((filterId: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedFilters([]);
  }, []);

  const hasActiveFilters = searchQuery.length > 0 || selectedFilters.length > 0;

  const styles = useMemo(() => {
    const bgIsLight = isLightColor(theme.backgroundColor);
    return {
      '--theme-primary': theme.primaryColor,
      '--theme-bg': theme.backgroundColor,
      '--theme-text': theme.textColor,
      '--theme-text-muted': bgIsLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
      '--theme-border': bgIsLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
      '--theme-card': bgIsLight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.05)',
      '--theme-radius': `${theme.borderRadius}px`,
      fontFamily: theme.fontFamily,
    } as React.CSSProperties;
  }, [theme]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
        <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Menu Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            This menu is not available or has not been published yet.
          </p>
        </div>
      </div>
    );
  }

  const { venue, menu } = data;

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      const headerOffset = 140;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn('min-h-screen', isEmbedded && 'min-h-0')} style={styles} ref={containerRef}>
      <div
        className={cn('min-h-screen', isEmbedded && 'min-h-0')}
        style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
      >
        {/* Header */}
        <header
          className={cn(
            'z-20 border-b shadow-sm backdrop-blur',
            !isEmbedded && 'sticky top-0'
          )}
          style={{
            backgroundColor: 'var(--theme-card)',
            borderColor: 'var(--theme-border)',
          }}
        >
          {!hideHeader && (
          <div className="mx-auto max-w-2xl px-4 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight">{venue.name}</h1>
                <p className="text-sm font-medium" style={{ color: 'var(--theme-primary)' }}>
                  {t(menu.id, 'name', menu.name)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Language Selector */}
                {data?.languages && data.languages.enabled.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                      className="flex items-center gap-1.5 px-2 py-1 text-sm border transition-colors"
                      style={{
                        borderRadius: 'var(--theme-radius)',
                        borderColor: 'var(--theme-border)',
                        backgroundColor: 'var(--theme-card)',
                      }}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {getLanguageNativeName(data.languages.current)}
                    </button>
                    {langDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setLangDropdownOpen(false)}
                        />
                        <div
                          className="absolute right-0 top-full z-40 mt-1 min-w-[120px] border shadow-lg overflow-hidden"
                          style={{
                            borderRadius: 'var(--theme-radius)',
                            borderColor: 'var(--theme-border)',
                            backgroundColor: 'var(--theme-bg)',
                          }}
                        >
                          {data.languages.enabled.map((lang) => (
                            <button
                              key={lang}
                              onClick={() => handleLanguageChange(lang)}
                              className={cn(
                                'block w-full px-3 py-2 text-left text-sm transition-colors hover:opacity-80',
                                lang === data.languages!.current && 'font-medium'
                              )}
                              style={{
                                backgroundColor:
                                  lang === data.languages!.current
                                    ? 'var(--theme-primary)'
                                    : 'transparent',
                                color:
                                  lang === data.languages!.current
                                    ? '#fff'
                                    : 'var(--theme-text)',
                              }}
                            >
                              {getLanguageNativeName(lang)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {venue.logoUrl && (
                  <img
                    src={venue.logoUrl}
                    alt={venue.name}
                    className="h-12 w-12 object-cover"
                    style={{ borderRadius: 'var(--theme-radius)' }}
                  />
                )}
              </div>
            </div>
            {venue.address && (
              <div
                className="mt-2 flex items-center gap-1 text-xs"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                <MapPin className="h-3 w-3" />
                <span>
                  {venue.address.street}, {venue.address.city}
                </span>
              </div>
            )}
          </div>
          )}

          {/* Section Navigation */}
          {menu.sections.length > 1 && (
            <div
              className="border-t"
              style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}
            >
              <div className="mx-auto max-w-2xl">
                <nav className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide">
                  {menu.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors hover:text-white"
                      style={{
                        borderRadius: 'calc(var(--theme-radius) * 2)',
                        backgroundColor: 'var(--theme-card)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--theme-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--theme-card)';
                      }}
                    >
                      {t(section.id, 'name', section.name)}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          {(!hideSearch || !hideFilters) && (
          <div
            className="border-t"
            style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}
          >
            <div className="mx-auto max-w-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                {/* Search Input */}
                {!hideSearch && (
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: 'var(--theme-text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border py-2 pl-10 pr-3 text-sm outline-none focus:ring-2"
                    style={{
                      borderRadius: 'var(--theme-radius)',
                      borderColor: 'var(--theme-border)',
                      backgroundColor: 'var(--theme-card)',
                      color: 'var(--theme-text)',
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                )}

                {/* Filter Toggle */}
                {!hideFilters && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'flex items-center gap-1.5 border px-3 py-2 text-sm font-medium transition-colors',
                    selectedFilters.length > 0 && 'ring-2'
                  )}
                  style={{
                    borderRadius: 'var(--theme-radius)',
                    borderColor: 'var(--theme-border)',
                    backgroundColor: selectedFilters.length > 0 ? 'var(--theme-primary)' : 'var(--theme-card)',
                    color: selectedFilters.length > 0 ? '#fff' : 'var(--theme-text)',
                    // @ts-expect-error css variable
                    '--tw-ring-color': 'var(--theme-primary)',
                  }}
                >
                  <Filter className="h-4 w-4" />
                  {selectedFilters.length > 0 && (
                    <span>{selectedFilters.length}</span>
                  )}
                </button>
                )}
              </div>

              {/* Filter Pills */}
              {!hideFilters && showFilters && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {FILTER_OPTIONS.map((filter) => {
                    const isSelected = selectedFilters.includes(filter.id);
                    const Icon = filter.icon;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => toggleFilter(filter.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors'
                        )}
                        style={{
                          borderRadius: 'calc(var(--theme-radius) * 2)',
                          backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-card)',
                          color: isSelected ? '#fff' : 'var(--theme-text)',
                        }}
                      >
                        {Icon && <Icon className="h-3 w-3" />}
                        {filter.label}
                      </button>
                    );
                  })}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      <X className="h-3 w-3" />
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
        </header>

        {/* Menu Content */}
        <main className="mx-auto max-w-2xl px-4 py-6">
          <div className="space-y-10">
            {filteredMenu?.sections.map((section) => (
              <section key={section.id} id={`section-${section.id}`}>
                <div className="mb-4">
                  <h2 className="text-xl font-bold tracking-tight">
                    {t(section.id, 'name', section.name)}
                  </h2>
                  {section.description && (
                    <p
                      className="mt-1 text-sm"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      {t(section.id, 'description', section.description)}
                    </p>
                  )}
                </div>

                <div
                  className={cn(
                    theme.layout === 'grid'
                      ? 'grid grid-cols-2 gap-3'
                      : theme.layout === 'compact'
                        ? 'divide-y'
                        : 'space-y-3'
                  )}
                  style={theme.layout === 'compact' ? { borderColor: 'var(--theme-border)' } : undefined}
                >
                  {section.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      theme={theme}
                      translations={data?.translations}
                      onObserve={observeItem}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* No results message */}
          {hasActiveFilters && filteredMenu?.sections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="mb-4 h-12 w-12 opacity-30" style={{ color: 'var(--theme-text-muted)' }} />
              <p className="text-lg font-medium" style={{ color: 'var(--theme-text)' }}>
                No items found
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                Try adjusting your search or filters
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 text-sm font-medium"
                style={{
                  borderRadius: 'var(--theme-radius)',
                  backgroundColor: 'var(--theme-primary)',
                  color: '#fff',
                }}
              >
                Clear filters
              </button>
            </div>
          )}

          {!hasActiveFilters && menu.sections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p style={{ color: 'var(--theme-text-muted)' }}>This menu has no items yet.</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer
          className="border-t py-8"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <div className="mx-auto max-w-2xl px-4 text-center">
            <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              Powered by{' '}
              <span className="font-semibold" style={{ color: 'var(--theme-text)' }}>
                MenuCraft
              </span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

type TranslationMap = Record<string, { name?: string; description?: string }>;

interface MenuItemCardProps {
  item: {
    id: string;
    name: string;
    description?: string | null;
    priceAmount?: number | null;
    imageUrl?: string | null;
    dietaryTags?: string[] | null;
    allergens?: string[] | null;
    badges?: string[] | null;
    options?: Array<{
      id: string;
      optionGroup: string;
      name: string;
      priceModifier: number;
    }>;
  };
  theme: ThemeConfig;
  translations?: TranslationMap;
  onObserve?: (element: HTMLElement | null) => void;
}

function MenuItemCard({ item, theme, translations, onObserve }: MenuItemCardProps) {
  const getTranslated = (id: string, field: 'name' | 'description', fallback: string | null | undefined) => {
    if (!translations) return fallback || '';
    const t = translations[id];
    return t?.[field] || fallback || '';
  };

  // Respect display options from theme
  const showImages = theme.showImages !== false;
  const showDescriptions = theme.showDescriptions !== false;
  const showPrices = theme.showPrices !== false;
  const showTags = theme.showTags !== false;
  const layout = theme.layout || 'list';

  const hasImage = showImages && item.imageUrl;
  const hasBadges = showTags && item.badges && item.badges.length > 0;
  const hasDietaryTags = showTags && item.dietaryTags && item.dietaryTags.length > 0;
  const hasAllergens = showTags && item.allergens && item.allergens.length > 0;
  const hasOptions = item.options && item.options.length > 0;

  // Compact layout - minimal display
  if (layout === 'compact') {
    return (
      <div
        ref={onObserve}
        data-item-id={item.id}
        className="flex items-center justify-between py-2 px-1"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <span className="font-medium">{getTranslated(item.id, 'name', item.name)}</span>
        {showPrices && item.priceAmount !== null && item.priceAmount !== undefined && (
          <span className="font-bold" style={{ color: 'var(--theme-primary)' }}>
            ${(item.priceAmount / 100).toFixed(2)}
          </span>
        )}
      </div>
    );
  }

  // Grid layout - card style
  if (layout === 'grid') {
    return (
      <div
        ref={onObserve}
        data-item-id={item.id}
        className="overflow-hidden border shadow-sm transition-shadow hover:shadow-md flex flex-col"
        style={{
          borderRadius: 'var(--theme-radius)',
          borderColor: 'var(--theme-border)',
          backgroundColor: 'var(--theme-card)',
        }}
      >
        {hasImage && (
          <div className="relative aspect-square w-full">
            <img
              src={item.imageUrl!}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col p-3">
          {hasBadges && (
            <div className="mb-1 flex flex-wrap gap-1">
              {item.badges!.slice(0, 2).map((badgeId) => {
                const badge = ITEM_BADGES.find((b) => b.id === badgeId);
                if (!badge) return null;
                return (
                  <span
                    key={badgeId}
                    className={cn('inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium', badge.color)}
                    style={{ borderRadius: 'calc(var(--theme-radius) * 2)' }}
                  >
                    {badge.label}
                  </span>
                );
              })}
            </div>
          )}
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">
            {getTranslated(item.id, 'name', item.name)}
          </h3>
          {showDescriptions && item.description && (
            <p
              className="mt-1 text-xs leading-snug line-clamp-2"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              {getTranslated(item.id, 'description', item.description)}
            </p>
          )}
          <div className="mt-auto pt-2">
            {showPrices && item.priceAmount !== null && item.priceAmount !== undefined && (
              <span className="font-bold" style={{ color: 'var(--theme-primary)' }}>
                ${(item.priceAmount / 100).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List layout (default)
  return (
    <div
      ref={onObserve}
      data-item-id={item.id}
      className={cn(
        'overflow-hidden border shadow-sm transition-shadow hover:shadow-md',
        hasImage ? 'flex' : ''
      )}
      style={{
        borderRadius: 'var(--theme-radius)',
        borderColor: 'var(--theme-border)',
        backgroundColor: 'var(--theme-card)',
      }}
    >
      {/* Item Image */}
      {hasImage && (
        <div className="relative h-28 w-28 flex-shrink-0 sm:h-32 sm:w-32">
          <img
            src={item.imageUrl!}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Item Content */}
      <div className={cn('flex flex-1 flex-col p-4', hasImage && 'py-3')}>
        {/* Item Badges */}
        {hasBadges && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {item.badges!.map((badgeId) => {
              const badge = ITEM_BADGES.find((b) => b.id === badgeId);
              if (!badge) return null;
              return (
                <span
                  key={badgeId}
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 text-xs font-medium',
                    badge.color
                  )}
                  style={{ borderRadius: 'calc(var(--theme-radius) * 2)' }}
                >
                  {badge.label}
                </span>
              );
            })}
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-semibold leading-tight">
              {getTranslated(item.id, 'name', item.name)}
            </h3>
            {showDescriptions && item.description && (
              <p
                className="mt-1 text-sm leading-snug line-clamp-2"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {getTranslated(item.id, 'description', item.description)}
              </p>
            )}
          </div>
          {showPrices && item.priceAmount !== null && item.priceAmount !== undefined && (
            <span
              className="text-lg font-bold"
              style={{ color: 'var(--theme-primary)' }}
            >
              ${(item.priceAmount / 100).toFixed(2)}
            </span>
          )}
        </div>

        {/* Dietary Tags */}
        {hasDietaryTags && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.dietaryTags!.map((tag) => {
              const config = DIETARY_TAG_CONFIG[tag];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium',
                    config.color
                  )}
                  style={{ borderRadius: 'calc(var(--theme-radius) * 2)' }}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {config.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Allergens */}
        {hasAllergens && (
          <div className="mt-2 flex items-start gap-1.5">
            <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700">
              Contains: {item.allergens!.map((a) => ALLERGEN_CONFIG[a] || a).join(', ')}
            </p>
          </div>
        )}

        {/* Options grouped by optionGroup */}
        {hasOptions && (
          <div
            className="mt-2 border-t pt-2 space-y-1.5"
            style={{ borderColor: 'var(--theme-border)' }}
          >
            {Object.entries(
              item.options!.reduce(
                (groups, option) => {
                  const group = option.optionGroup || 'Options';
                  if (!groups[group]) groups[group] = [];
                  groups[group].push(option);
                  return groups;
                },
                {} as Record<string, typeof item.options>
              )
            ).map(([groupName, groupOptions]) => (
              <div key={groupName}>
                <p
                  className="text-xs font-medium"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  {groupName}:
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {groupOptions!.map((option) => (
                    <span
                      key={option.id}
                      className="text-xs"
                    >
                      {option.name}
                      {option.priceModifier !== 0 && (
                        <span
                          className="ml-1 font-medium"
                          style={{ color: 'var(--theme-primary)' }}
                        >
                          {option.priceModifier > 0 ? '+' : ''}$
                          {(option.priceModifier / 100).toFixed(2)}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
