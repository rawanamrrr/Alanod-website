import type { ObjectId } from "mongodb"

export interface User {
  _id?: ObjectId
  email: string
  password: string
  name: string
  role: "admin" | "user"
  favorites?: string[] // Array of product IDs
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  _id?: ObjectId
  id: string
  name: string
  description: string
  longDescription?: string
  price: number
  beforeSalePrice?: number // original price before sale
  afterSalePrice?: number  // discounted price after sale
  sizes: { size: string; volume: string; originalPrice?: number; discountedPrice?: number; stockCount?: number }[]
  images: string[]
  rating: number
  reviews: number
  notes: { top: string[]; middle: string[]; base: string[] }
  category: "winter" | "summer" | "fall"
  isNew?: boolean
  isBestseller?: boolean
  isActive: boolean
  isOutOfStock?: boolean
  isGiftPackage?: boolean
  packagePrice?: number
  packageOriginalPrice?: number
  giftPackageSizes?: any[]
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  productId?: string
  name: string
  price: number
  size: string
  volume: string
  image: string
  category: string
  quantity: number
  isGiftPackage?: boolean
  selectedProducts?: any[]
  packageDetails?: any
  customMeasurements?: {
    unit: "cm" | "inch"
    values: {
      shoulder: string
      bust: string
      waist: string
      hips: string
      sleeve: string
      length: string
    }
  }
}

export interface Order {
  _id?: ObjectId
  id: string
  userId: string
  items: OrderItem[]
  total: number
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  shippingAddress: {
    name: string
    email: string
    phone: string
    secondaryPhone: string
    address: string
    city: string
    governorate: string
    postalCode: string
  }
  paymentMethod: "cod" | "visa" | "mastercard"
  paymentDetails?: {
    cardNumber: string
    cardName: string
  }
  discountCode?: string | null
  discountAmount?: number
  createdAt: Date
  updatedAt: Date
}

export interface CartItem {
  id: string
  name: string
  price: number
  size: string
  volume: string
  image: string
  category: string
  quantity: number
}
