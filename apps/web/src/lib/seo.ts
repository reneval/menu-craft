import { useEffect } from 'react';

export interface SEOConfig {
  title: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'restaurant.menu' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Hook to manage SEO meta tags dynamically
 */
export function useSEO(config: SEOConfig) {
  useEffect(() => {
    // Update title
    document.title = config.title;

    // Helper to set or create meta tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Helper to remove meta tag
    const removeMeta = (name: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      const meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (meta) meta.remove();
    };

    // Description
    if (config.description) {
      setMeta('description', config.description);
      setMeta('og:description', config.description, true);
      setMeta('twitter:description', config.description);
    }

    // Open Graph
    setMeta('og:title', config.title, true);
    setMeta('og:type', config.ogType || 'website', true);

    if (config.canonicalUrl) {
      setMeta('og:url', config.canonicalUrl, true);
      // Also set canonical link
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = config.canonicalUrl;
    }

    if (config.ogImage) {
      setMeta('og:image', config.ogImage, true);
      setMeta('twitter:image', config.ogImage);
    }

    // Twitter Card
    setMeta('twitter:card', config.twitterCard || 'summary');
    setMeta('twitter:title', config.title);

    // Robots
    if (config.noIndex) {
      setMeta('robots', 'noindex, nofollow');
    } else {
      removeMeta('robots');
    }

    // JSON-LD structured data
    if (config.jsonLd) {
      // Remove existing script if any
      const existingScript = document.querySelector('script[data-seo-jsonld]');
      if (existingScript) existingScript.remove();

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(config.jsonLd);
      document.head.appendChild(script);
    }

    // Cleanup on unmount
    return () => {
      // Reset to default title
      document.title = 'MenuCraft - Restaurant Menu Management';

      // Remove JSON-LD
      const jsonLdScript = document.querySelector('script[data-seo-jsonld]');
      if (jsonLdScript) jsonLdScript.remove();
    };
  }, [config.title, config.description, config.canonicalUrl, config.ogImage, config.ogType, config.twitterCard, config.noIndex, config.jsonLd]);
}

/**
 * Generate JSON-LD for a restaurant menu
 */
export function generateMenuJsonLd(data: {
  venueName: string;
  venueAddress?: { street?: string; city?: string; state?: string; zip?: string; country?: string };
  venuePhone?: string;
  venueLogoUrl?: string;
  menuName: string;
  menuDescription?: string;
  menuUrl: string;
  sections: Array<{
    name: string;
    items: Array<{
      name: string;
      description?: string | null;
      priceAmount?: number | null;
      imageUrl?: string | null;
      dietaryTags?: string[] | null;
    }>;
  }>;
}): Record<string, unknown>[] {
  const jsonLd: Record<string, unknown>[] = [];

  // Restaurant schema
  const restaurant: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: data.venueName,
    url: data.menuUrl,
  };

  if (data.venueAddress) {
    restaurant.address = {
      '@type': 'PostalAddress',
      streetAddress: data.venueAddress.street,
      addressLocality: data.venueAddress.city,
      addressRegion: data.venueAddress.state,
      postalCode: data.venueAddress.zip,
      addressCountry: data.venueAddress.country || 'US',
    };
  }

  if (data.venuePhone) {
    restaurant.telephone = data.venuePhone;
  }

  if (data.venueLogoUrl) {
    restaurant.image = data.venueLogoUrl;
    restaurant.logo = data.venueLogoUrl;
  }

  jsonLd.push(restaurant);

  // Menu schema
  const menu: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: data.menuName,
    description: data.menuDescription || `Menu for ${data.venueName}`,
    url: data.menuUrl,
    mainEntityOfPage: data.menuUrl,
    hasMenuSection: data.sections.map((section) => ({
      '@type': 'MenuSection',
      name: section.name,
      hasMenuItem: section.items.map((item) => {
        const menuItem: Record<string, unknown> = {
          '@type': 'MenuItem',
          name: item.name,
        };

        if (item.description) {
          menuItem.description = item.description;
        }

        if (item.priceAmount !== null && item.priceAmount !== undefined) {
          menuItem.offers = {
            '@type': 'Offer',
            price: (item.priceAmount / 100).toFixed(2),
            priceCurrency: 'USD',
          };
        }

        if (item.imageUrl) {
          menuItem.image = item.imageUrl;
        }

        if (item.dietaryTags && item.dietaryTags.length > 0) {
          const restrictions: string[] = [];
          if (item.dietaryTags.includes('vegetarian')) restrictions.push('VegetarianDiet');
          if (item.dietaryTags.includes('vegan')) restrictions.push('VeganDiet');
          if (item.dietaryTags.includes('gluten_free')) restrictions.push('GlutenFreeDiet');
          if (item.dietaryTags.includes('kosher')) restrictions.push('KosherDiet');
          if (item.dietaryTags.includes('halal')) restrictions.push('HalalDiet');
          if (restrictions.length > 0) {
            menuItem.suitableForDiet = restrictions.map((r) => `https://schema.org/${r}`);
          }
        }

        return menuItem;
      }),
    })),
  };

  jsonLd.push(menu);

  // BreadcrumbList for better navigation in search results
  jsonLd.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: data.venueName,
        item: data.menuUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: data.menuName,
        item: data.menuUrl,
      },
    ],
  });

  return jsonLd;
}
