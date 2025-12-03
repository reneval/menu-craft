import puppeteer, { Browser, Page } from 'puppeteer';
import { RedisCache } from './redis-cache.js';

export interface PDFOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  background?: boolean;
  scale?: number;
}

export interface MenuPDFData {
  venue: {
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    website?: string;
    logo?: string;
  };
  menu: {
    id: string;
    name: string;
    description?: string;
    currency: string;
    sections: Array<{
      id: string;
      name: string;
      description?: string;
      items: Array<{
        id: string;
        name: string;
        description?: string;
        priceAmount: number;
        imageUrl?: string;
        allergens?: string[];
        options?: Array<{
          name: string;
          choices: Array<{
            name: string;
            priceModifier: number;
          }>;
        }>;
      }>;
    }>;
  };
  theme?: {
    primaryColor?: string;
    fontFamily?: string;
    headerStyle?: string;
  };
}

export class PDFService {
  private cache: RedisCache;
  private browser: Browser | null = null;

  constructor() {
    this.cache = new RedisCache();
  }

  async generateMenuPDF(
    menuData: MenuPDFData,
    options: PDFOptions = {}
  ): Promise<Buffer> {
    const cacheKey = `pdf:${Buffer.from(JSON.stringify({ menuData, options })).toString('base64')}`;

    try {
      const cached = await this.cache.get<string>(cacheKey);
      if (cached) {
        return Buffer.from(cached, 'base64');
      }
    } catch (error) {
      console.warn('Failed to retrieve PDF from cache:', error);
    }

    const pdfBuffer = await this.createPDF(menuData, options);

    try {
      await this.cache.set(cacheKey, pdfBuffer.toString('base64'), {
        ttl: 3600, // Cache PDFs for 1 hour
        namespace: 'pdf'
      });
    } catch (error) {
      console.warn('Failed to cache PDF:', error);
    }

    return pdfBuffer;
  }

  private async createPDF(menuData: MenuPDFData, options: PDFOptions): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      const html = this.generateMenuHTML(menuData);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfOptions = {
        format: options.format || 'A4',
        landscape: options.orientation === 'landscape',
        margin: options.margin || {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        },
        printBackground: options.background !== false,
        scale: options.scale || 1,
        ...options
      } as const;

      const pdf = await page.pdf(pdfOptions);
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private generateMenuHTML(data: MenuPDFData): string {
    const { venue, menu, theme = {} } = data;

    const styles = `
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: ${theme.fontFamily || "'Helvetica Neue', Arial, sans-serif"};
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid ${theme.primaryColor || '#2563eb'};
          padding-bottom: 20px;
        }

        .venue-logo {
          max-width: 120px;
          max-height: 80px;
          margin-bottom: 15px;
        }

        .venue-name {
          font-size: 2.5em;
          font-weight: bold;
          color: ${theme.primaryColor || '#2563eb'};
          margin-bottom: 10px;
        }

        .venue-description {
          font-size: 1.1em;
          color: #666;
          margin-bottom: 15px;
          font-style: italic;
        }

        .venue-details {
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 0.9em;
          color: #777;
        }

        .menu-title {
          font-size: 2em;
          text-align: center;
          margin: 30px 0;
          color: ${theme.primaryColor || '#2563eb'};
        }

        .menu-description {
          text-align: center;
          font-style: italic;
          color: #666;
          margin-bottom: 30px;
        }

        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }

        .section-title {
          font-size: 1.5em;
          font-weight: bold;
          color: ${theme.primaryColor || '#2563eb'};
          border-bottom: 2px solid #eee;
          padding-bottom: 8px;
          margin-bottom: 20px;
        }

        .section-description {
          font-style: italic;
          color: #666;
          margin-bottom: 15px;
        }

        .item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px dotted #ddd;
        }

        .item:last-child {
          border-bottom: none;
        }

        .item-content {
          flex: 1;
          padding-right: 20px;
        }

        .item-name {
          font-weight: bold;
          font-size: 1.1em;
          margin-bottom: 5px;
          color: #222;
        }

        .item-description {
          color: #666;
          font-size: 0.95em;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .item-allergens {
          font-size: 0.8em;
          color: #e11d48;
          font-weight: 500;
        }

        .item-options {
          font-size: 0.85em;
          color: #555;
          margin-top: 8px;
        }

        .item-price {
          font-weight: bold;
          font-size: 1.1em;
          color: ${theme.primaryColor || '#2563eb'};
          white-space: nowrap;
        }

        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 0.8em;
          color: #999;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }

        @media print {
          body {
            margin: 0;
            padding: 15px;
          }

          .section {
            page-break-inside: avoid;
          }

          .item {
            page-break-inside: avoid;
          }
        }
      </style>
    `;

    const header = `
      <div class="header">
        ${venue.logo ? `<img src="${venue.logo}" alt="${venue.name} Logo" class="venue-logo" />` : ''}
        <h1 class="venue-name">${venue.name}</h1>
        ${venue.description ? `<p class="venue-description">${venue.description}</p>` : ''}
        <div class="venue-details">
          ${venue.address ? `<span>📍 ${venue.address}</span>` : ''}
          ${venue.phone ? `<span>📞 ${venue.phone}</span>` : ''}
          ${venue.website ? `<span>🌐 ${venue.website}</span>` : ''}
        </div>
      </div>
    `;

    const menuContent = `
      <h2 class="menu-title">${menu.name}</h2>
      ${menu.description ? `<p class="menu-description">${menu.description}</p>` : ''}

      ${menu.sections.map(section => `
        <div class="section">
          <h3 class="section-title">${section.name}</h3>
          ${section.description ? `<p class="section-description">${section.description}</p>` : ''}

          ${section.items.map(item => `
            <div class="item">
              <div class="item-content">
                <div class="item-name">${item.name}</div>
                ${item.description ? `<div class="item-description">${item.description}</div>` : ''}
                ${item.allergens && item.allergens.length > 0 ? `
                  <div class="item-allergens">
                    Contains: ${item.allergens.join(', ')}
                  </div>
                ` : ''}
                ${item.options && item.options.length > 0 ? `
                  <div class="item-options">
                    ${item.options.map(option => `
                      <strong>${option.name}:</strong> ${option.choices.map(choice =>
                        choice.priceModifier !== 0
                          ? `${choice.name} (+${this.formatPrice(choice.priceModifier, menu.currency)})`
                          : choice.name
                      ).join(', ')}
                    `).join('<br>')}
                  </div>
                ` : ''}
              </div>
              <div class="item-price">
                ${this.formatPrice(item.priceAmount, menu.currency)}
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    `;

    const footer = `
      <div class="footer">
        <p>Menu generated on ${new Date().toLocaleDateString()}</p>
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${venue.name} - ${menu.name}</title>
        ${styles}
      </head>
      <body>
        ${header}
        ${menuContent}
        ${footer}
      </body>
      </html>
    `;
  }

  private formatPrice(amount: number, currency: string): string {
    const formatted = (amount / 100).toFixed(2);

    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
      'CHF': 'CHF',
      'SEK': 'kr',
      'DKK': 'kr',
      'NOK': 'kr'
    };

    const symbol = currencySymbols[currency] || currency;

    if (currency === 'JPY') {
      return `${symbol}${Math.round(amount / 100)}`;
    }

    return `${symbol}${formatted}`;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  generateFileName(venueName: string, menuName: string): string {
    const sanitized = `${venueName}-${menuName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `menu-${sanitized}.pdf`;
  }

  validatePDFOptions(options: PDFOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.format && !['A4', 'A3', 'Letter', 'Legal'].includes(options.format)) {
      errors.push('Invalid format. Must be A4, A3, Letter, or Legal');
    }

    if (options.orientation && !['portrait', 'landscape'].includes(options.orientation)) {
      errors.push('Invalid orientation. Must be portrait or landscape');
    }

    if (options.scale && (options.scale < 0.1 || options.scale > 2)) {
      errors.push('Scale must be between 0.1 and 2');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const pdfService = new PDFService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await pdfService.closeBrowser();
});

process.on('SIGINT', async () => {
  await pdfService.closeBrowser();
});