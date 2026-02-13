type WhatsAppMeasurementValues = Record<string, string | number | null | undefined>

export type WhatsAppOrderProduct = {
  id?: string
  name: string
  category?: string
  price?: number
  originalPrice?: number
  image?: string
  url?: string
}

export type WhatsAppOrderSize = {
  size?: string
  volume?: string
}

export type WhatsAppOrderPayload = {
  phoneNumber: string
  product: WhatsAppOrderProduct
  quantity?: number
  size?: WhatsAppOrderSize | null
  customMeasurements?: {
    unit?: string
    values: WhatsAppMeasurementValues
  } | null
  giftPackage?: {
    items: Array<{
      size: string
      volume?: string
      selectedProductName?: string
      selectedProductId?: string
    }>
  } | null
}

type StoredLocaleSettings = {
  countryName?: string
  countryCode?: string
  currencyCode?: string
  currencySymbol?: string
  locale?: string
  exchangeRate?: number
}

function normalizePhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\D/g, "")
}

function resolveAbsoluteUrl(maybeUrl: string | undefined) {
  if (!maybeUrl) return undefined
  if (maybeUrl.startsWith("http://") || maybeUrl.startsWith("https://")) return maybeUrl
  if (typeof window === "undefined") return maybeUrl

  const origin = window.location.origin
  if (maybeUrl.startsWith("/")) return `${origin}${maybeUrl}`
  return `${origin}/${maybeUrl}`
}

function getLocaleSettingsFromStorage(): StoredLocaleSettings | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem("ala_locale_settings")
    if (!raw) return null
    return JSON.parse(raw) as StoredLocaleSettings
  } catch {
    return null
  }
}

function buildMessage(payload: WhatsAppOrderPayload) {
  const { product, quantity, size, customMeasurements, giftPackage } = payload

  const localeSettings = getLocaleSettingsFromStorage()
  const currencyCode = localeSettings?.currencyCode
  const countryName = localeSettings?.countryName
  const locale = localeSettings?.locale
  const exchangeRate = localeSettings?.exchangeRate || 1

  const lines: string[] = []

  lines.push("Hello , I would like to buy:")
  lines.push(`Product: ${product.name}`)

  if (product.category) {
    lines.push(`Category: ${product.category}`)
  }

  if (countryName) {
    lines.push(`Country: ${countryName}`)
  }

  if (typeof quantity === "number" && quantity > 0) {
    lines.push(`Quantity: ${quantity}`)
  }

  if (size?.size || size?.volume) {
    const parts = [size.size, size.volume].filter(Boolean)
    lines.push(`Size: ${parts.join(" ")}`)
  }

  if (giftPackage?.items?.length) {
    lines.push("Gift Package Selections:")
    giftPackage.items.forEach((it) => {
      const itemParts = [it.size, it.volume ? `(${it.volume})` : undefined, it.selectedProductName ? `- ${it.selectedProductName}` : undefined].filter(Boolean)
      lines.push(`- ${itemParts.join(" ")}`)
    })
  }

  if (customMeasurements?.values && Object.keys(customMeasurements.values).length > 0) {
    const unit = customMeasurements.unit ? ` ${customMeasurements.unit}` : ""
    lines.push("Custom Measurements:")
    Object.entries(customMeasurements.values).forEach(([k, v]) => {
      if (v === undefined || v === null || String(v).trim() === "") return
      lines.push(`- ${k}: ${v}${unit}`)
    })
  }

  if (product.price !== undefined && product.price !== null) {
    const converted = product.price * exchangeRate
    const rounded = Math.round(converted)

    let formattedPrice = String(rounded)
    try {
      formattedPrice = new Intl.NumberFormat(locale || undefined, {
        style: "currency",
        currency: currencyCode || "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(rounded)
    } catch (e) {
      // Fallback
      formattedPrice = `${currencyCode || "USD"} ${rounded}`
    }

    lines.push(`Price: ${formattedPrice}${currencyCode ? ` (${currencyCode})` : ""}`)
  }

  if (product.url || (product.id && product.category)) {
    let finalUrl = product.url
    if (!finalUrl && product.id && product.category) {
      finalUrl = `/products/${product.category}/${product.id}`
    }
    const absoluteUrl = resolveAbsoluteUrl(finalUrl)
    if (absoluteUrl) {
      lines.push(`Link: ${absoluteUrl}`)
    }
  }

  return lines.join("\n")
}

export function openWhatsAppOrder(payload: WhatsAppOrderPayload) {
  if (typeof window === "undefined") return

  const phone = normalizePhoneNumber(payload.phoneNumber)
  const message = buildMessage(payload)

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  window.open(waUrl, "_blank", "noopener,noreferrer")
}
