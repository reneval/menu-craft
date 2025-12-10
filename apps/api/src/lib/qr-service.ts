import QRCode from 'qrcode'
import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas'
import { RedisCache } from './redis-cache.js'

export interface QRCodeOptions {
  size?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
  logo?: {
    url: string
    size: number
    borderRadius?: number
  }
}

export interface QRCodeData {
  id: string
  url: string
  organizationId: string
  venueId: string
  menuId?: string
  name: string
  options: QRCodeOptions
  createdAt: Date
  updatedAt: Date
}

export class QRCodeService {
  private cache: RedisCache

  constructor() {
    this.cache = new RedisCache()
  }

  async generateQRCode(url: string, options: QRCodeOptions = {}): Promise<Buffer> {
    const cacheKey = `qr:${Buffer.from(url + JSON.stringify(options)).toString('base64')}`

    try {
      const cached = await this.cache.get<string>(cacheKey)
      if (cached) {
        return Buffer.from(cached, 'base64')
      }
    } catch (error) {
      console.warn('Failed to retrieve QR code from cache:', error)
    }

    const qrBuffer = await this.createQRCode(url, options)

    try {
      await this.cache.set(cacheKey, qrBuffer.toString('base64'), {
        ttl: 86400,
        namespace: 'qr'
      })
    } catch (error) {
      console.warn('Failed to cache QR code:', error)
    }

    return qrBuffer
  }

  /**
   * Generate QR code as SVG string
   * Note: Logo embedding is not supported in SVG format
   */
  async generateQRCodeSVG(url: string, options: QRCodeOptions = {}): Promise<string> {
    const cacheKey = `qr-svg:${Buffer.from(url + JSON.stringify(options)).toString('base64')}`

    try {
      const cached = await this.cache.get<string>(cacheKey)
      if (cached) {
        return cached
      }
    } catch (error) {
      console.warn('Failed to retrieve QR SVG from cache:', error)
    }

    const {
      size = 400,
      errorCorrectionLevel = 'M',
      margin = 4,
      color = { dark: '#000000', light: '#ffffff' }
    } = options

    const svgString = await QRCode.toString(url, {
      type: 'svg',
      width: size,
      errorCorrectionLevel,
      margin,
      color
    })

    try {
      await this.cache.set(cacheKey, svgString, {
        ttl: 86400,
        namespace: 'qr'
      })
    } catch (error) {
      console.warn('Failed to cache QR SVG:', error)
    }

    return svgString
  }

  private async createQRCode(url: string, options: QRCodeOptions): Promise<Buffer> {
    const {
      size = 400,
      errorCorrectionLevel = 'M',
      margin = 4,
      color = { dark: '#000000', light: '#ffffff' },
      logo
    } = options

    if (!logo) {
      return await QRCode.toBuffer(url, {
        width: size,
        errorCorrectionLevel,
        margin,
        color
      })
    }

    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    const qrDataUrl = await QRCode.toDataURL(url, {
      width: size,
      errorCorrectionLevel,
      margin,
      color
    })

    const qrImage = await loadImage(qrDataUrl)
    ctx.drawImage(qrImage, 0, 0, size, size)

    if (logo.url) {
      try {
        const logoImage = await loadImage(logo.url)
        const logoSize = Math.min(logo.size, size * 0.2)
        const logoX = (size - logoSize) / 2
        const logoY = (size - logoSize) / 2

        ctx.save()

        if (logo.borderRadius) {
          this.roundRect(ctx, logoX, logoY, logoSize, logoSize, logo.borderRadius)
          ctx.clip()
        }

        ctx.fillStyle = color.light || '#ffffff'
        ctx.fillRect(logoX - 8, logoY - 8, logoSize + 16, logoSize + 16)

        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize)
        ctx.restore()
      } catch (error) {
        console.warn('Failed to load logo image:', error)
      }
    }

    return canvas.toBuffer('image/png')
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }

  generateMenuUrl(domain: string, venueSlug: string, menuId?: string, lang?: string): string {
    let url = `https://${domain}/${venueSlug}`

    if (menuId) {
      url += `/${menuId}`
    }

    if (lang) {
      url += `?lang=${lang}`
    }

    return url
  }

  getQRCodeFileName(name: string, format: 'png' | 'svg' = 'png'): string {
    const sanitized = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    return `qr-${sanitized}.${format}`
  }

  validateQRCodeOptions(options: QRCodeOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (options.size && (options.size < 100 || options.size > 2000)) {
      errors.push('Size must be between 100 and 2000 pixels')
    }

    if (options.margin && (options.margin < 0 || options.margin > 20)) {
      errors.push('Margin must be between 0 and 20')
    }

    if (options.logo?.size && options.size) {
      const maxLogoSize = options.size * 0.3
      if (options.logo.size > maxLogoSize) {
        errors.push(`Logo size cannot exceed ${maxLogoSize}px for a ${options.size}px QR code`)
      }
    }

    if (options.color?.dark && !this.isValidColor(options.color.dark)) {
      errors.push('Invalid dark color format')
    }

    if (options.color?.light && !this.isValidColor(options.color.light)) {
      errors.push('Invalid light color format')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  private isValidColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
  }
}

export const qrService = new QRCodeService()