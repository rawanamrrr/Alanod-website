"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Star, Heart, ShoppingCart, Truck, Shield, RotateCcw, ChevronDown, X, Package, Instagram, Facebook, ChevronLeft, ChevronRight, AlertCircle, MessageCircle } from "lucide-react"
import { useParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useFavorites } from "@/lib/favorites-context"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useCurrencyFormatter } from "@/hooks/use-currency"
import { useCustomSize } from "@/hooks/use-custom-size"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/lib/translations"
import { useLocale } from "@/lib/locale-context"
import type { SizeChartRow } from "@/components/custom-size-form"
import { openWhatsAppOrder } from "@/lib/whatsapp"

const GiftPackageSelector = dynamic(
  () => import("@/components/gift-package-selector").then((m) => m.GiftPackageSelector),
  { ssr: false }
)

const CustomSizeForm = dynamic(
  () => import("@/components/custom-size-form").then((m) => m.CustomSizeForm),
  { ssr: false }
)

interface ProductDetail {
  _id: string
  id: string
  name: string
  description: string
  longDescription: string
  sizes: {
    size: string;
    volume: string;
    originalPrice?: number;
    discountedPrice?: number;
    stockCount?: number;
  }[]
  images: string[]
  rating: number
  reviews: number
  notes: { top: string[]; middle: string[]; base: string[] }
  category: "winter" | "summer" | "fall"
  isNew?: boolean
  isBestseller?: boolean
  isOutOfStock?: boolean
  isActive?: boolean
  isGiftPackage?: boolean
  packagePrice?: number
  packageOriginalPrice?: number
  giftPackageSizes?: any[]
}

interface Review {
  _id: string
  productId: string
  originalProductId?: string
  userId: string
  userName: string
  rating: number
  comment: string
  orderId: string
  createdAt: string
}

const categoryTitles = {
  winter: "Winter Collection",
  summer: "Summer Collection",
  fall: "Fall Collection",
}

export default function ProductDetailPage() {
  const { category, product: productId } = useParams() as { category: string; product: string }
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(false) // Start as false for instant render
  const [selectedSize, setSelectedSize] = useState<number>(0)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const { state: favoritesState, addToFavorites, removeFromFavorites } = useFavorites()
  const { formatPrice } = useCurrencyFormatter()
  const { settings } = useLocale()
  const t = useTranslation(settings.language)
  const {
    isCustomSizeMode,
    setIsCustomSizeMode,
    measurementUnit,
    setMeasurementUnit,
    measurements,
    handleMeasurementChange,
    confirmMeasurements,
    setConfirmMeasurements,
    resetMeasurements,
    isMeasurementsValid,
  } = useCustomSize()
  const sizeChart: SizeChartRow[] = [
    {
      label: "XL",
      shoulderIn: "16",
      waistIn: "32",
      bustIn: "40",
      hipsIn: "42",
      sleeveIn: "23",
      shoulderCm: "40",
      waistCm: "81",
      bustCm: "101",
      hipsCm: "106",
      sleeveCm: "58",
    },
    {
      label: "L",
      shoulderIn: "15",
      waistIn: "31",
      bustIn: "39",
      hipsIn: "40",
      sleeveIn: "22.5",
      shoulderCm: "38",
      waistCm: "78",
      bustCm: "99",
      hipsCm: "101",
      sleeveCm: "57",
    },
    {
      label: "M",
      shoulderIn: "14.5",
      waistIn: "29",
      bustIn: "37",
      hipsIn: "38",
      sleeveIn: "22",
      shoulderCm: "37",
      waistCm: "73",
      bustCm: "94",
      hipsCm: "96",
      sleeveCm: "55",
    },
    {
      label: "S",
      shoulderIn: "14",
      waistIn: "27",
      bustIn: "35",
      hipsIn: "36",
      sleeveIn: "21.5",
      shoulderCm: "35",
      waistCm: "68",
      bustCm: "90",
      hipsCm: "91",
      sleeveCm: "54",
    },
    {
      label: "XS",
      shoulderIn: "14",
      waistIn: "25",
      bustIn: "34",
      hipsIn: "35",
      sleeveIn: "21",
      shoulderCm: "34",
      waistCm: "63",
      bustCm: "86",
      hipsCm: "88",
      sleeveCm: "53",
    },
  ]

  const [reviews, setReviews] = useState<Review[]>([])
  const [relatedProducts, setRelatedProducts] = useState<ProductDetail[]>([])
  const { state: authState } = useAuth()
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)
  const [showSizeSelector, setShowSizeSelector] = useState(false)
  const [selectedRelatedSize, setSelectedRelatedSize] = useState<any>(null)
  const [showGiftPackageSelector, setShowGiftPackageSelector] = useState(false)
  const [showRelatedGiftPackageSelector, setShowRelatedGiftPackageSelector] = useState(false)
  const [showMainProductSizeSelector, setShowMainProductSizeSelector] = useState(false)
  const [showCustomSizeConfirmation, setShowCustomSizeConfirmation] = useState(false)
  const [showRelatedCustomSizeConfirmation, setShowRelatedCustomSizeConfirmation] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const touchStartXRef = useRef<number | null>(null)
  const lastScrollTimeRef = useRef<number>(0)

  const goToPrevImage = () => {
    setSelectedImage(prev => {
      if (!product || !product.images?.length) return 0
      return (prev - 1 + product.images.length) % product.images.length
    })
  }

  const goToNextImage = () => {
    setSelectedImage(prev => {
      if (!product || !product.images?.length) return 0
      return (prev + 1) % product.images.length
    })
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Debounce to avoid skipping many images on trackpads
    const now = Date.now()
    if (now - lastScrollTimeRef.current < 200) return
    lastScrollTimeRef.current = now

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      // Vertical scroll
      if (e.deltaY > 0) {
        goToNextImage()
      } else {
        goToPrevImage()
      }
      e.preventDefault()
    } else if (Math.abs(e.deltaX) > 0) {
      // Horizontal scroll
      if (e.deltaX > 0) {
        goToNextImage()
      } else {
        goToPrevImage()
      }
      e.preventDefault()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      goToNextImage()
    } else if (e.key === 'ArrowLeft') {
      goToPrevImage()
    }
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current
    if (startX == null) return
    const endX = e.changedTouches[0]?.clientX ?? startX
    const deltaX = endX - startX
    const threshold = 40
    if (Math.abs(deltaX) >= threshold) {
      if (deltaX < 0) {
        goToNextImage()
      } else {
        goToPrevImage()
      }
    }
    touchStartXRef.current = null
  }

  // Calculate the smallest price from all sizes
  const getSmallestPrice = (sizes: ProductDetail['sizes']) => {
    if (!sizes || sizes.length === 0) return 0

    const prices = sizes.map(size => size.discountedPrice || size.originalPrice || 0)
    return Math.min(...prices.filter(price => price > 0))
  }

  // Calculate the smallest original price from all sizes
  const getSmallestOriginalPrice = (sizes: ProductDetail['sizes']) => {
    if (!sizes || sizes.length === 0) return 0

    const prices = sizes.map(size => size.originalPrice || 0)
    return Math.min(...prices.filter(price => price > 0))
  }

  const isFavorite = (productId: string) => {
    return favoritesState.items.some(item => item.id === productId)
  }

  // Helper function to get the selected price
  const getSelectedPrice = () => {
    if (!product || !product.sizes || product.sizes.length === 0) return 0
    const selectedSizeObj = product.sizes[selectedSize]
    return selectedSizeObj?.discountedPrice || selectedSizeObj?.originalPrice || 0
  }

  // Buy now via WhatsApp with custom size support
  const handleBuyNow = async () => {
    if (!product || product.isOutOfStock) return

    if (isCustomSizeMode) {
      // Validate custom measurements
      if (!isMeasurementsValid) {
        return
      }

      // Get price from first available size
      const firstSize = product.sizes[0]
      const price = firstSize?.discountedPrice || firstSize?.originalPrice || 0

      openWhatsAppOrder({
        phoneNumber: "+971502996885",
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          price,
          originalPrice: firstSize?.originalPrice,
          image: product.images?.[0],
        },
        quantity,
        size: { size: "custom", volume: measurementUnit },
        customMeasurements: {
          unit: measurementUnit,
          values: {
            shoulder: measurements.shoulder,
            bust: measurements.bust,
            waist: measurements.waist,
            hips: measurements.hips,
            sleeve: measurements.sleeve,
            length: measurements.length,
          },
        },
      })

      // Reset custom size mode
      setIsCustomSizeMode(false)
      resetMeasurements()
    } else {
      // Standard size - validate stock
      const selectedSizeObj = product.sizes[selectedSize]
      if (!selectedSizeObj) return

      // Check stock availability
      if (selectedSizeObj.stockCount !== undefined && selectedSizeObj.stockCount < quantity) {
        toast({
          variant: "destructive",
          title: "Insufficient stock",
          description: `You requested ${quantity}, but only ${selectedSizeObj.stockCount} piece${selectedSizeObj.stockCount === 1 ? "" : "s"} are available for size ${selectedSizeObj.size}.`,
        })
        return
      }

      openWhatsAppOrder({
        phoneNumber: "+971502996885",
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          price: getSelectedPrice(),
          originalPrice: selectedSizeObj.originalPrice,
          image: product.images?.[0],
        },
        quantity,
        size: { size: selectedSizeObj.size, volume: selectedSizeObj.volume },
        customMeasurements: null,
      })
    }

    setShowMainProductSizeSelector(false)
  }

  const openSizeSelector = (product: any) => {
    setSelectedProduct(product)
    setSelectedRelatedSize(null)
    setShowSizeSelector(true)
    setQuantity(1)
    setIsCustomSizeMode(true)
    resetMeasurements()
  }

  // Function to get the size with smallest price
  const getSizeWithSmallestPrice = (sizes: ProductDetail['sizes']) => {
    if (!sizes || sizes.length === 0) return null

    let smallestPrice = Infinity
    let smallestSize = null

    sizes.forEach(size => {
      const price = size.discountedPrice || size.originalPrice || 0
      if (price < smallestPrice) {
        smallestPrice = price
        smallestSize = size
      }
    })

    return smallestSize
  }

  const buyNowFromRelated = (product: any, size: any) => {
    // Check if product is out of stock
    if (product.isOutOfStock) {
      return
    }

    openWhatsAppOrder({
      phoneNumber: "+971502996885",
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        price: size.discountedPrice || size.originalPrice || 0,
        originalPrice: size.originalPrice,
        image: product.images?.[0],
      },
      quantity,
      size: { size: size.size, volume: size.volume },
      customMeasurements: null,
    })
  }

  const fetchRelatedProducts = async () => {
    try {
      // Fetch products from the same category, excluding the current product
      const response = await fetch(`/api/products?category=${category}&limit=4`)
      if (response.ok) {
        const data = await response.json()
        const filteredProducts = data
          .filter((p: ProductDetail) => p.id !== productId && p.isActive !== false)
          .sort((a: ProductDetail, b: ProductDetail) => b.rating - a.rating)
        setRelatedProducts(filteredProducts)
      }
    } catch (error) {
      console.error("Error fetching related products:", error)
    }
  }

  useEffect(() => {
    if (category && productId) {
      fetchProduct()
      fetchRelatedProducts()
    }
  }, [category, productId])

  // Set custom size mode as default when product loads
  useEffect(() => {
    if (product && !product.isGiftPackage) {
      setIsCustomSizeMode(true)
      setSelectedSize(-1) // No size selected initially
      resetMeasurements()
    }
  }, [product])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showSizeSelector) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showSizeSelector])

  const getBaseProductId = (id: string) => {
    // For gift packages with timestamp suffixes like -1756667891815, remove only the timestamp
    // The pattern seems to be: baseId-timestamp where timestamp is all numbers
    if (id.match(/-[0-9]+$/)) {
      const baseId = id.replace(/-[0-9]+$/, '');
      console.log("Original ID:", id, "Base ID (timestamp removed):", baseId);
      return baseId;
    }

    // For other cases, don't modify the ID
    console.log("Original ID:", id, "Base ID (no change):", id);
    return id;
  }

  const fetchReviewsForProduct = async (productIdFromApi: string) => {
    try {
      const baseProductId = getBaseProductId(productIdFromApi)
      console.log("Product ID from API:", productIdFromApi)
      console.log("URL product ID:", productId)
      console.log("Fetching reviews for base product ID:", baseProductId)

      const reviewsResponse = await fetch(`/api/reviews/product/${baseProductId}`)
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json()
        console.log("Fetched reviews:", reviewsData.reviews?.length || 0)
        setReviews(reviewsData.reviews || [])
      } else {
        console.error("Failed to fetch reviews:", await reviewsResponse.text())
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
    }
  }

  const fetchProduct = async () => {
    try {
      // First try to get from cache instantly (synchronous cache read)
      let response = await fetch(`/api/products/${category}/${productId}`, {
        cache: "force-cache",
      }).catch(() => null)

      if (response?.ok) {
        const data = await response.json()

        // Set product immediately for instant render
        setProduct(data)

        // Fire-and-forget reviews fetch so the page doesn't block on reviews
        void fetchReviewsForProduct(data.id)
      }
    } catch (error) {
      console.error("Error fetching product:", error)
    }
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="pt-28 md:pt-24 px-4">
          {loading ? (
            <div className="container mx-auto px-4 md:px-6">
              {/* Skeleton Loader */}
              <div className="mb-8 h-6 bg-gray-200 rounded w-32 animate-pulse"></div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
                {/* Image Skeleton */}
                <div className="space-y-4">
                  <div className="aspect-square bg-gray-200 rounded-xl animate-pulse"></div>
                  <div className="flex space-x-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                </div>

                {/* Details Skeleton */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    <div className="h-7 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  </div>
                  <div className="h-px bg-gray-200"></div>
                  <div className="space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="grid grid-cols-4 gap-2">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-xl sm:text-2xl font-light mb-4">Product not found</h1>
              <Link href="/products">
                <Button className="bg-black text-white hover:bg-gray-800 text-sm sm:text-base px-4 py-2">Browse All Products</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    )
  }

  const selectedPrice = product.sizes[selectedSize || 0]?.discountedPrice || product.sizes[selectedSize || 0]?.originalPrice || 0

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Product Detail */}
      <section className="pt-28 md:pt-24 pb-20 sm:pb-16">
        <div className="container mx-auto px-4 md:px-6">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <Link
              href="/products"
              className="inline-flex items-center text-gray-600 hover:text-black transition-colors font-medium text-sm sm:text-base"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Collections
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            {loading && !product && (
              <div className="col-span-full flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 text-sm sm:text-base">Loading product details...</p>
                </div>
              </div>
            )}

            {/* Product Images */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4 lg:space-y-6 order-1"
            >
              <div className="relative rounded-xl overflow-hidden bg-gray-50">
                <div
                  className="w-full h-64 sm:h-80 lg:h-[500px] relative select-none"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onKeyDown={handleKeyDown}
                  tabIndex={0}
                  role="img"
                  aria-label="Product image gallery. Use the arrows or thumbnails to change image."
                  style={{ userSelect: 'none', touchAction: 'none' }}
                >
                  <Image
                    src={product.images[selectedImage] || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className={`object-contain transition-all duration-300 ${isHovered ? 'scale-105' : 'scale-100'}`}
                  />
                  {product.images?.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={goToPrevImage}
                        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/90 backdrop-blur shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900" />
                      </button>
                      <button
                        type="button"
                        onClick={goToNextImage}
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/90 backdrop-blur shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-gray-900" />
                      </button>
                    </>
                  )}
                </div>
                <div className="absolute top-3 left-3 lg:top-4 lg:left-4 space-y-2">
                  {product.isOutOfStock && (
                    <Badge className="bg-gradient-to-r from-red-600 to-red-800 text-white px-2 py-1 lg:px-3 lg:py-1 rounded-md font-medium text-xs lg:text-sm">
                      Out of Stock
                    </Badge>
                  )}
                  {product.isBestseller && (
                    <Badge className="bg-gradient-to-r from-amber-600 to-amber-800 text-white px-2 py-1 lg:px-3 lg:py-1 rounded-md font-medium text-xs lg:text-sm">
                      Bestseller
                    </Badge>
                  )}
                  {product.isNew && (
                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-2 py-1 lg:px-3 lg:py-1 rounded-md font-medium text-xs lg:text-sm">
                      New Arrival
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex space-x-2 lg:space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                {product.images.map((image, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border transition-all duration-200 ${selectedImage === index
                      ? "border-2 border-black shadow-md"
                      : "border-gray-200 hover:border-gray-400"
                      }`}
                  >
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`${product.name} ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6 lg:space-y-8 order-2"
            >
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-3 sm:space-y-0">
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight mb-2">{product.name}</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm sm:text-base text-gray-600">
                        ({product.rating}) • {product.reviews} reviews
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-light text-left">
                    {(() => {
                      if (product.isGiftPackage && product.packagePrice) {
                        const packagePrice = product.packagePrice;
                        const packageOriginalPrice = product.packageOriginalPrice || 0;

                        if (packageOriginalPrice > 0 && packagePrice < packageOriginalPrice) {
                          return (
                            <div className="text-left space-y-2">
                              <div className="flex flex-col items-start">
                                <span className="text-gray-600 text-base sm:text-lg">Package Price:</span>
                                <div className="flex items-center space-x-3">
                                  <span className="line-through text-gray-400 text-lg">{formatPrice(packageOriginalPrice)}</span>
                                  <span className="text-xl sm:text-2xl font-bold text-red-600">{formatPrice(packagePrice)}</span>
                                </div>
                                <span className="text-xs sm:text-sm text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
                                  Save {formatPrice(packageOriginalPrice - packagePrice)}
                                </span>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-left">
                              <span className="text-gray-600 text-base sm:text-lg">Package Price:</span>
                              <span className="text-xl sm:text-2xl font-bold ml-2 text-green-600">
                                {formatPrice(packagePrice)}
                              </span>
                            </div>
                          );
                        }
                      } else {
                        const selectedSizeObj = product.sizes[selectedSize] || product.sizes[0];
                        const selectedPrice = selectedSizeObj?.discountedPrice || selectedSizeObj?.originalPrice || 0;
                        const originalPrice = selectedSizeObj?.originalPrice || 0;

                        if (originalPrice > 0 && selectedPrice < originalPrice) {
                          return (
                            <div className="flex items-center space-x-3">
                              <span className="line-through text-gray-400 text-lg sm:text-2xl">{formatPrice(originalPrice || 0)}</span>
                              <span className="text-red-600 font-bold text-xl sm:text-2xl">{formatPrice(selectedPrice)}</span>
                            </div>
                          );
                        } else {
                          return <span className="text-xl sm:text-2xl">{formatPrice(selectedPrice)}</span>;
                        }
                      }
                    })()}
                  </div>
                </div>

                <div className="mb-6">
                  <p className={`text-gray-700 text-sm sm:text-base leading-relaxed ${showFullDescription ? '' : 'line-clamp-3'}`}>
                    {product.longDescription}
                  </p>
                  {!showFullDescription && (
                    <button
                      onClick={() => setShowFullDescription(true)}
                      className="text-sm font-medium text-black mt-3 flex items-center hover:text-gray-700 transition-colors w-full sm:w-auto justify-center sm:justify-start"
                    >
                      Read more <ChevronDown className="ml-1 h-4 w-4" />
                    </button>
                  )}

                  {/* Gift Package Info */}
                  {product.isGiftPackage && product.giftPackageSizes && (
                    <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-3">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base">Gift Package Includes:</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {product.giftPackageSizes.map((size, index) => (
                          <div key={index} className="text-xs sm:text-sm text-gray-600">
                            • {size.size} ({size.volume}) - {size.productOptions?.length || 0} product options
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Customize your package by selecting specific products for each size
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Size Selection - Always Visible */}
              {!product.isGiftPackage && (
                <div className="space-y-4">
                  <h3 className="text-base sm:text-lg font-medium mb-4 text-gray-900">Select Size</h3>
                  <CustomSizeForm
                    controller={{
                      isCustomSizeMode,
                      setIsCustomSizeMode,
                      measurementUnit,
                      setMeasurementUnit,
                      measurements,
                      onMeasurementChange: handleMeasurementChange,
                      confirmMeasurements,
                      setConfirmMeasurements,
                      isMeasurementsValid,
                    }}
                    sizeChart={sizeChart}
                    sizes={product.sizes.map(s => ({
                      size: s.size,
                      volume: s.volume,
                      originalPrice: s.originalPrice,
                      discountedPrice: s.discountedPrice,
                      stockCount: s.stockCount,
                    }))}
                    selectedSize={isCustomSizeMode ? null : (product.sizes[selectedSize] ? {
                      size: product.sizes[selectedSize].size,
                      volume: product.sizes[selectedSize].volume,
                      originalPrice: product.sizes[selectedSize].originalPrice,
                      discountedPrice: product.sizes[selectedSize].discountedPrice,
                      stockCount: product.sizes[selectedSize].stockCount,
                    } : null)}
                    onSelectSize={(size) => {
                      const index = product.sizes.findIndex(s => s.size === size.size)
                      if (index >= 0) {
                        setSelectedSize(index)
                        setIsCustomSizeMode(false)
                      }
                    }}
                    formatPrice={formatPrice}
                  />
                  {isCustomSizeMode && (
                    <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg flex items-center">
                      <MessageCircle className="h-5 w-5 mr-3 text-green-500" />
                      <div>
                        {t("customSizeAssistance")}
                        <a href="https://wa.me/971502996885" target="_blank" rel="noopener noreferrer" className="font-medium text-green-600 hover:underline ml-1">
                          +971 50 299 6885
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

            </motion.div>
          </div>
        </div>
      </section>

      {/* Fixed Bottom Bar - Mobile Optimized */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-40">
        <div className="container mx-auto px-3 md:px-6 py-2 md:py-4">
          {product.isGiftPackage ? (
            /* Gift Package Bottom Bar - Mobile Optimized */
            <div className="flex items-center justify-between gap-2 md:gap-4">
              <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                <Package className="h-4 w-4 md:h-6 md:w-6 text-gray-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs md:text-sm font-medium text-gray-900 truncate">Gift Package</h3>
                  <p className="text-xs text-gray-600 hidden md:block">Customize your package</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 md:space-x-4">
                <div className="text-right">
                  {(() => {
                    const packagePrice = product.packagePrice || 0;
                    const packageOriginalPrice = product.packageOriginalPrice || 0;

                    if (packageOriginalPrice > 0 && packagePrice < packageOriginalPrice) {
                      return (
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-2">
                          <span className="line-through text-gray-400 text-xs md:text-base">{formatPrice(packageOriginalPrice)}</span>
                          <span className="text-red-600 font-bold text-sm md:text-xl">{formatPrice(packagePrice)}</span>
                        </div>
                      );
                    } else {
                      return <span className="text-sm md:text-xl">{formatPrice(packagePrice)}</span>;
                    }
                  })()}
                </div>

                <div className="flex space-x-1 md:space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-2 md:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                    onClick={() => {
                      if (product) {
                        if (isFavorite(product.id)) {
                          removeFromFavorites(product.id)
                        } else {
                          addToFavorites({
                            id: product.id,
                            name: product.name,
                            price: product.packagePrice || 0,
                            image: product.images[0],
                            category: product.category,
                            rating: product.rating,
                            isNew: product.isNew,
                            isBestseller: product.isBestseller,
                            sizes: product.giftPackageSizes || [],
                            isGiftPackage: true,
                            packagePrice: product.packagePrice,
                            packageOriginalPrice: product.packageOriginalPrice,
                            giftPackageSizes: product.giftPackageSizes,
                          })
                        }
                      }
                    }}
                    aria-label={isFavorite(product.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart
                      className={`h-4 w-4 md:h-5 md:w-5 ${product && isFavorite(product.id)
                        ? "text-red-500 fill-red-500"
                        : "text-gray-700"
                        }`}
                    />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-gradient-to-r text-white py-2 px-3 md:py-3 md:px-6 rounded-lg font-medium flex items-center justify-center shadow-md hover:shadow-lg transition-all text-xs md:text-sm"
                    onClick={() => setShowGiftPackageSelector(true)}
                    aria-label="Customize Package"
                  >
                    <Package className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5" />
                    <span className="hidden sm:inline">Customize Package</span>
                    <span className="sm:hidden">Customize</span>
                  </motion.button>
                </div>
              </div>
            </div>
          ) : (
            /* Regular Product Bottom Bar - Mobile Optimized */
            <div className="space-y-2 md:space-y-0">
              {/* Mobile: Compact single row layout */}
              <div className="flex md:hidden items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Size:</span>
                  <div className="flex space-x-1 overflow-x-auto scrollbar-hide min-w-0">
                    {product.sizes.map((size, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedSize(index)
                          setIsCustomSizeMode(false)
                        }}
                        disabled={size.stockCount !== undefined && size.stockCount === 0}
                        className={`px-2 py-1 border rounded text-xs transition-all flex-shrink-0 ${size.stockCount !== undefined && size.stockCount === 0
                          ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                          : selectedSize === index
                            ? 'border-black bg-black text-white shadow-md'
                            : 'border-gray-200 hover:border-gray-400 bg-white'
                          }`}
                      >
                        {`${size.size} ${size.volume}${size.stockCount !== undefined && size.stockCount === 0 ? ' - Out of Stock' : ''}`}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-6 h-6 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <span className="text-gray-600 text-xs">-</span>
                  </motion.button>
                  <span className="w-8 text-center font-medium text-xs">{quantity}</span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-6 h-6 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-600 text-xs">+</span>
                  </motion.button>
                </div>
              </div>

              {/* Mobile: Price and action buttons row */}
              <div className="flex md:hidden items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  {(() => {
                    const selectedSizeObj = product.sizes[selectedSize] || product.sizes[0];
                    const unitPrice = selectedSizeObj?.discountedPrice || selectedSizeObj?.originalPrice || 0;
                    const unitOriginalPrice = selectedSizeObj?.originalPrice || 0;
                    const totalPrice = unitPrice * quantity;
                    const totalOriginalPrice = unitOriginalPrice * quantity;

                    if (unitOriginalPrice > 0 && unitPrice < unitOriginalPrice) {
                      return (
                        <div className="flex items-center space-x-1">
                          <span className="line-through text-gray-400 text-xs">{formatPrice(totalOriginalPrice)}</span>
                          <span className="text-red-600 font-bold text-sm">{formatPrice(totalPrice)}</span>
                        </div>
                      );
                    } else {
                      return <span className="text-sm">{formatPrice(totalPrice)}</span>;
                    }
                  })()}
                </div>

                <div className="flex space-x-1">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                    onClick={() => {
                      if (product) {
                        if (isFavorite(product.id)) {
                          removeFromFavorites(product.id)
                        } else {
                          addToFavorites({
                            id: product.id,
                            name: product.name,
                            price: getSelectedPrice(),
                            image: product.images[0],
                            category: product.category,
                            rating: product.rating,
                            isNew: product.isNew,
                            isBestseller: product.isBestseller,
                            sizes: product.sizes,
                          })
                        }
                      }
                    }}
                    aria-label={isFavorite(product.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart
                      className={`h-4 w-4 ${product && isFavorite(product.id)
                        ? "text-red-500 fill-red-500"
                        : "text-gray-700"
                        }`}
                    />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    className={`bg-gradient-to-r text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center shadow-md transition-all text-xs ${product.isOutOfStock || (!isCustomSizeMode && selectedSize >= 0 && product.sizes[selectedSize]?.stockCount !== undefined && product.sizes[selectedSize].stockCount === 0) || (isCustomSizeMode && !isMeasurementsValid)
                      ? 'from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
                      : 'from-gray-900 to-black hover:shadow-lg'
                      }`}
                    onClick={() => {
                      if (product.isOutOfStock) return
                      if (!isCustomSizeMode) {
                        if (selectedSize >= 0 && product.sizes[selectedSize]?.stockCount !== undefined && product.sizes[selectedSize].stockCount === 0) {
                          toast({
                            variant: "destructive",
                            title: "Out of stock",
                            description: `Size ${product.sizes[selectedSize].size} is currently out of stock.`,
                          })
                          return
                        }
                        handleBuyNow()
                        return
                      }
                      // Custom size flow
                      if (!isMeasurementsValid) {
                        toast({
                          variant: "destructive",
                          title: "Incomplete measurements",
                          description: "Please complete your custom measurements before adding to cart.",
                        })
                        return
                      }
                      setShowCustomSizeConfirmation(true)
                    }}
                    disabled={product.isOutOfStock || (!isCustomSizeMode && selectedSize >= 0 && product.sizes[selectedSize]?.stockCount !== undefined && product.sizes[selectedSize].stockCount === 0) || (isCustomSizeMode && !isMeasurementsValid)}
                    aria-label={product.isOutOfStock ? "Out of stock" : "Buy Now"}
                  >
                    <ShoppingCart className="mr-1 h-4 w-4" />
                    {product.isOutOfStock || (!isCustomSizeMode && selectedSize >= 0 && product.sizes[selectedSize]?.stockCount !== undefined && product.sizes[selectedSize].stockCount === 0) ? "Out of Stock" : "Buy Now"}
                  </motion.button>
                </div>
              </div>

              {/* Desktop: Original layout */}
              <div className="hidden md:flex md:items-center md:justify-between gap-4">
                {/* Size Selection */}
                <div className="w-auto">
                  <h3 className="text-sm font-medium mb-2 text-gray-900">Size: {product.sizes[selectedSize]?.size}</h3>
                  <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                    {product.sizes.map((size, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedSize(index)
                          setIsCustomSizeMode(false)
                        }}
                        disabled={size.stockCount !== undefined && size.stockCount === 0}
                        className={`px-4 py-2 border rounded-lg text-center transition-all flex-shrink-0 text-base ${size.stockCount !== undefined && size.stockCount === 0
                          ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                          : selectedSize === index
                            ? 'border-black bg-black text-white shadow-md'
                            : 'border-gray-200 hover:border-gray-400 bg-white'
                          }`}
                      >
                        <div className="font-medium">{size.size}{size.stockCount !== undefined && size.stockCount === 0 ? ' Out of Stock' : ''}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Quantity Selection */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-900">Quantity:</span>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                      disabled={quantity <= 1}
                    >
                      <span className="text-gray-600">-</span>
                    </motion.button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-gray-600">+</span>
                    </motion.button>
                  </div>
                </div>

                {/* Price and Add to Cart */}
                <div className="flex items-center justify-end space-x-4 w-auto">
                  <div className="text-xl font-light text-left">
                    {(() => {
                      const selectedSizeObj = product.sizes[selectedSize] || product.sizes[0];
                      const unitPrice = selectedSizeObj?.discountedPrice || selectedSizeObj?.originalPrice || 0;
                      const unitOriginalPrice = selectedSizeObj?.originalPrice || 0;
                      const totalPrice = unitPrice * quantity;
                      const totalOriginalPrice = unitOriginalPrice * quantity;

                      if (unitOriginalPrice > 0 && unitPrice < unitOriginalPrice) {
                        return (
                          <div className="flex items-center space-x-2">
                            <span className="line-through text-gray-400 text-lg">{formatPrice(totalOriginalPrice)}</span>
                            <span className="text-red-600 font-bold text-xl">{formatPrice(totalPrice)}</span>
                          </div>
                        );
                      } else {
                        return <span className="text-xl">{formatPrice(totalPrice)}</span>;
                      }
                    })()}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                      onClick={() => {
                        if (product) {
                          if (isFavorite(product.id)) {
                            removeFromFavorites(product.id)
                          } else {
                            addToFavorites({
                              id: product.id,
                              name: product.name,
                              price: getSelectedPrice(),
                              image: product.images[0],
                              category: product.category,
                              rating: product.rating,
                              isNew: product.isNew,
                              isBestseller: product.isBestseller,
                              sizes: product.sizes,
                            })
                          }
                        }
                      }}
                      aria-label={isFavorite(product.id) ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart
                        className={`h-5 w-5 ${product && isFavorite(product.id)
                          ? "text-red-500 fill-red-500"
                          : "text-gray-700"
                          }`}
                      />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className={`bg-gradient-to-r from-gray-900 to-black text-white py-3 px-6 rounded-lg font-medium flex items-center justify-center shadow-md hover:shadow-lg transition-all ${product.isOutOfStock || (!isCustomSizeMode && selectedSize >= 0 && product.sizes[selectedSize]?.stockCount !== undefined && product.sizes[selectedSize].stockCount === 0) || (isCustomSizeMode && !isMeasurementsValid)
                        ? 'from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
                        : 'from-gray-900 to-black hover:shadow-lg'
                        }`}
                      onClick={() => {
                        if (product.isOutOfStock) return
                        if (!isCustomSizeMode) {
                          if (selectedSize >= 0 && product.sizes[selectedSize]?.stockCount !== undefined && product.sizes[selectedSize].stockCount === 0) {
                            alert(`Size ${product.sizes[selectedSize].size} is out of stock`)
                            return
                          }
                          handleBuyNow()
                          return
                        }
                        // Custom size flow
                        if (!isMeasurementsValid) {
                          alert("Please complete your custom measurements")
                          return
                        }
                        setShowCustomSizeConfirmation(true)
                      }}
                      disabled={product.isOutOfStock || (!isCustomSizeMode && selectedSize >= 0 && product.sizes[selectedSize]?.stockCount !== undefined && product.sizes[selectedSize].stockCount === 0) || (isCustomSizeMode && !isMeasurementsValid)}
                      aria-label={product.isOutOfStock ? "Out of stock" : "Buy Now"}
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      {product.isOutOfStock || (!isCustomSizeMode && selectedSize >= 0 && product.sizes[selectedSize]?.stockCount !== undefined && product.sizes[selectedSize].stockCount === 0) ? "Out of Stock" : "Buy Now"}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl sm:text-3xl font-light tracking-tight mb-2"
              >
                Customer Reviews
              </motion.h2>
              <div className="w-16 h-1 bg-amber-500 mx-auto rounded-full"></div>
            </div>

            {/* Reviews List */}
            <div className="space-y-6 sm:space-y-8">
              {reviews.length === 0 ? (
                <div className="text-center py-8 sm:py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                  <div className="bg-gray-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 max-w-md mx-auto text-sm sm:text-base">
                    No reviews yet for this gown.
                  </p>
                </div>
              ) : (
                reviews.map((review, index) => (
                  <motion.div
                    key={review._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100"
                  >
                    <div className="flex items-start mb-4">
                      <div className="bg-gray-200 border-2 border-dashed rounded-xl w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0" />
                      <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm sm:text-base">{review.userName}</h4>
                            <p className="text-xs sm:text-sm text-gray-600">{new Date(review.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 sm:h-5 sm:w-5 ${i < review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                                  }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{review.comment}</p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related Products Section */}
      <section className="py-12 sm:py-16 bg-gray-50 pb-24 sm:pb-28">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl sm:text-3xl font-light tracking-tight mb-2"
            >
              You Might Also Like
            </motion.h2>
            <div className="w-16 h-1 bg-amber-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            {relatedProducts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-600">No related products found.</p>
              </div>
            ) : (
              relatedProducts.map((relatedProduct, index) => (
                <motion.div
                  key={relatedProduct.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="relative h-full"
                >
                  <div className="group relative h-full">
                    {/* Favorite Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isFavorite(relatedProduct.id)) {
                          removeFromFavorites(relatedProduct.id)
                        } else {
                          addToFavorites({
                            id: relatedProduct.id,
                            name: relatedProduct.name,
                            price: relatedProduct.isGiftPackage && relatedProduct.packagePrice
                              ? relatedProduct.packagePrice
                              : getSmallestPrice(relatedProduct.sizes),
                            image: relatedProduct.images[0],
                            category: relatedProduct.category,
                            rating: relatedProduct.rating,
                            isNew: relatedProduct.isNew,
                            isBestseller: relatedProduct.isBestseller,
                            sizes: relatedProduct.sizes,
                            // Add gift package fields
                            isGiftPackage: relatedProduct.isGiftPackage,
                            packagePrice: relatedProduct.packagePrice,
                            packageOriginalPrice: relatedProduct.packageOriginalPrice,
                            giftPackageSizes: relatedProduct.giftPackageSizes,
                          })
                        }
                      }}
                      className="absolute top-2 right-2 sm:top-4 sm:right-6 z-10 p-2 sm:p-2.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300"
                      aria-label={isFavorite(relatedProduct.id) ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${isFavorite(relatedProduct.id)
                          ? "text-red-500 fill-red-500"
                          : "text-gray-700"
                          }`}
                      />
                    </motion.button>

                    {/* Badges */}
                    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 space-y-1 sm:space-y-2">
                      {relatedProduct.isOutOfStock && (
                        <motion.div
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                          viewport={{ once: true }}
                        >
                          <Badge className="bg-gradient-to-r from-red-600 to-red-800 text-white text-xs sm:text-sm px-2 py-1">Out of Stock</Badge>
                        </motion.div>
                      )}
                      {relatedProduct.isBestseller && !relatedProduct.isOutOfStock && (
                        <motion.div
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                          viewport={{ once: true }}
                        >
                          <Badge className="bg-black text-white text-xs sm:text-sm px-2 py-1">Bestseller</Badge>
                        </motion.div>
                      )}
                      {relatedProduct.isNew && !relatedProduct.isBestseller && !relatedProduct.isOutOfStock && (
                        <motion.div
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                          viewport={{ once: true }}
                        >
                          <Badge variant="secondary" className="text-xs sm:text-sm px-2 py-1">New</Badge>
                        </motion.div>
                      )}
                    </div>

                    {/* Product Card */}
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                      <CardContent className="p-0 h-full flex flex-col">
                        <div className="relative aspect-square flex-grow">
                          <Link href={`/products/${relatedProduct.category}/${relatedProduct.id}`} className="block relative w-full h-full">
                            <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                              <Image
                                src={relatedProduct.images[0] || "/placeholder.svg"}
                                alt={relatedProduct.name}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 md:p-4 text-white">
                              <div className="flex items-center mb-1">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 sm:h-4 sm:w-4 ${i < Math.floor(relatedProduct.rating)
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                        }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs ml-1 sm:ml-2">
                                  ({relatedProduct.rating.toFixed(1)})
                                </span>
                              </div>

                              <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-medium mb-1 line-clamp-2">
                                {relatedProduct.name}
                              </h3>

                              <div className="flex items-center justify-between">
                                <div className="text-xs sm:text-sm md:text-base lg:text-lg font-light">
                                  {(() => {
                                    // Handle gift packages
                                    if (relatedProduct.isGiftPackage) {
                                      const packagePrice = relatedProduct.packagePrice || 0;
                                      const packageOriginalPrice = relatedProduct.packageOriginalPrice || 0;

                                      if (packageOriginalPrice > 0 && packagePrice < packageOriginalPrice) {
                                        return (
                                          <div className="flex items-center space-x-1 sm:mr-2">
                                            <span className="line-through text-gray-300 text-xs sm:text-sm md:text-base">{formatPrice(packageOriginalPrice)}</span>
                                            <span className="text-red-500 font-bold text-xs sm:text-sm md:text-base">{formatPrice(packagePrice)}</span>
                                          </div>
                                        );
                                      } else {
                                        return <span className="text-xs sm:text-sm md:text-base lg:text-lg">{formatPrice(packagePrice)}</span>;
                                      }
                                    }

                                    // Handle regular products
                                    const smallestPrice = getSmallestPrice(relatedProduct.sizes);
                                    const smallestOriginalPrice = getSmallestOriginalPrice(relatedProduct.sizes);

                                    if (smallestOriginalPrice > 0 && smallestPrice < smallestOriginalPrice) {
                                      return (
                                        <div className="flex flex-col sm:flex-row sm:items-center space-y-0.5 sm:space-y-0 sm:space-x-1 sm:mr-2">
                                          <span className="line-through text-gray-300 text-xs sm:text-sm md:text-base">{formatPrice(smallestOriginalPrice)}</span>
                                          <span className="text-red-500 font-bold text-xs sm:text-sm md:text-base">{formatPrice(smallestPrice)}</span>
                                        </div>
                                      );
                                    } else {
                                      return <span className="text-xs sm:text-sm md:text-base lg:text-lg">{formatPrice(smallestPrice)}</span>;
                                    }
                                  })()}
                                </div>

                                <button
                                  className={`p-1 sm:p-1.5 sm:p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors ${relatedProduct.isOutOfStock
                                    ? 'cursor-not-allowed opacity-60'
                                    : ''
                                    }`}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (relatedProduct.isGiftPackage) {
                                      setSelectedProduct(relatedProduct)
                                      setShowRelatedGiftPackageSelector(true)
                                    } else {
                                      openSizeSelector(relatedProduct)
                                    }
                                  }}
                                  aria-label="Buy Now"
                                >
                                  <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                                </button>
                              </div>
                            </div>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Gift Package Selector Modal for Related Products */}
      {showRelatedGiftPackageSelector && selectedProduct && (
        <GiftPackageSelector
          product={selectedProduct}
          isOpen={showRelatedGiftPackageSelector}
          onClose={() => setShowRelatedGiftPackageSelector(false)}
          onToggleFavorite={(product) => {
            if (isFavorite(product.id)) {
              removeFromFavorites(product.id)
            } else {
              addToFavorites({
                id: product.id,
                name: product.name,
                price: product.packagePrice || 0,
                image: product.images[0],
                category: product.category,
                rating: product.rating,
                isNew: product.isNew,
                isBestseller: product.isBestseller,
                sizes: product.giftPackageSizes || [],
                isGiftPackage: product.isGiftPackage,
                packagePrice: product.packagePrice,
                packageOriginalPrice: product.packageOriginalPrice,
                giftPackageSizes: product.giftPackageSizes,
              })
            }
          }}
          isFavorite={isFavorite}
        />
      )}

      {/* Size Selector Modal for Related Products - Matching Home Page Style */}
      {showSizeSelector && selectedProduct && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowSizeSelector(false)}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-medium">{selectedProduct.name}</h3>
                  <p className="text-gray-600 text-sm">Select your preferred size</p>
                </div>
                <div className="flex">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isFavorite(selectedProduct.id)) {
                        removeFromFavorites(selectedProduct.id)
                      } else {
                        addToFavorites({
                          id: selectedProduct.id,
                          name: selectedProduct.name,
                          price: selectedRelatedSize ? (selectedRelatedSize.discountedPrice || selectedRelatedSize.originalPrice || 0) : getSmallestPrice(selectedProduct.sizes),
                          image: selectedProduct.images[0],
                          category: selectedProduct.category,
                          rating: selectedProduct.rating,
                          isNew: selectedProduct.isNew,
                          isBestseller: selectedProduct.isBestseller,
                          sizes: selectedProduct.sizes,
                        })
                      }
                    }}
                    className="mr-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-gray-100 transition-colors"
                  >
                    <Heart
                      className={`h-5 w-5 ${isFavorite(selectedProduct.id)
                        ? "text-red-500 fill-red-500"
                        : "text-gray-700"
                        }`}
                    />
                  </button>
                  <button
                    onClick={() => setShowSizeSelector(false)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center mb-6">
                <div className="relative w-20 h-20 mr-4">
                  <Image
                    src={selectedProduct.images[0] || "/placeholder.svg"}
                    alt={selectedProduct.name}
                    fill
                    className="rounded-lg object-cover"
                  />
                </div>
                <div>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {selectedProduct.description}
                  </p>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < Math.floor(selectedProduct.rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                            }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600 ml-2">
                      ({selectedProduct.rating.toFixed(1)})
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <CustomSizeForm
                  controller={{
                    isCustomSizeMode,
                    setIsCustomSizeMode,
                    measurementUnit,
                    setMeasurementUnit,
                    measurements,
                    onMeasurementChange: handleMeasurementChange,
                    confirmMeasurements,
                    setConfirmMeasurements,
                    isMeasurementsValid,
                  }}
                  sizeChart={sizeChart}
                  sizes={selectedProduct.sizes.map((s) => ({
                    size: s.size,
                    volume: s.volume,
                    originalPrice: s.originalPrice,
                    discountedPrice: s.discountedPrice,
                    stockCount: s.stockCount,
                  }))}
                  selectedSize={
                    isCustomSizeMode
                      ? null
                      : selectedRelatedSize
                        ? {
                          size: selectedRelatedSize.size,
                          volume: selectedRelatedSize.volume,
                          originalPrice: selectedRelatedSize.originalPrice,
                          discountedPrice: selectedRelatedSize.discountedPrice,
                          stockCount: selectedRelatedSize.stockCount,
                        }
                        : null
                  }
                  onSelectSize={(size) => {
                    const found = selectedProduct.sizes.find((s) => s.size === size.size)
                    if (found) {
                      setSelectedRelatedSize(found)
                      setIsCustomSizeMode(false)
                    }
                  }}
                  formatPrice={formatPrice}
                />
              </div>

              {/* Quantity Selection */}
              <div className="mb-4">
                <h4 className="font-medium mb-3">Quantity</h4>
                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <span className="text-gray-600">-</span>
                  </motion.button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-600">+</span>
                  </motion.button>
                </div>
              </div>

              <div className="flex justify-between items-center py-4 border-t border-gray-100">
                <div>
                  <span className="text-gray-600">Total:</span>
                  <span className="text-xl font-medium ml-2">
                    {(() => {
                      const qty = quantity;

                      if (isCustomSizeMode) {
                        if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
                          const baseUnitPrice = getSmallestPrice(selectedProduct.sizes);
                          return <>{formatPrice(baseUnitPrice * qty)}</>;
                        }
                        return <>{formatPrice(0)}</>;
                      }

                      if (selectedRelatedSize) {
                        const unitOriginal = selectedRelatedSize.originalPrice || 0;
                        const unitDiscount = selectedRelatedSize.discountedPrice || 0;
                        const hasDiscount = unitOriginal > 0 && selectedRelatedSize.discountedPrice !== undefined && unitDiscount < unitOriginal;
                        const totalOriginal = unitOriginal * qty;
                        const totalPrice = (hasDiscount ? unitDiscount : unitOriginal || unitDiscount) * qty;

                        if (hasDiscount) {
                          return (
                            <>
                              <span className="line-through text-gray-400 mr-2 text-lg">{formatPrice(totalOriginal)}</span>
                              <span className="text-red-600 font-bold">{formatPrice(totalPrice)}</span>
                            </>
                          );
                        }

                        return <>{formatPrice(totalPrice)}</>;
                      }

                      const baseUnitPrice = getSmallestPrice(selectedProduct.sizes);
                      return <>{formatPrice(baseUnitPrice * qty)}</>;
                    })()}
                  </span>
                </div>

                <Button
                  onClick={() => {
                    if (!selectedProduct || selectedProduct.isOutOfStock) return
                    if (!isCustomSizeMode) {
                      if (!selectedRelatedSize) return
                      buyNowFromRelated(selectedProduct, selectedRelatedSize)
                      return
                    }
                    if (!isMeasurementsValid) {
                      alert("Please complete your custom measurements")
                      return
                    }
                    setShowRelatedCustomSizeConfirmation(true)
                  }}
                  className={`flex items-center bg-black hover:bg-gray-800 rounded-full px-6 py-5 ${selectedProduct?.isOutOfStock
                    ? 'cursor-not-allowed opacity-60'
                    : ''
                    }`}
                  disabled={
                    selectedProduct?.isOutOfStock ||
                    (!isCustomSizeMode && !selectedRelatedSize) ||
                    (isCustomSizeMode && !isMeasurementsValid)
                  }
                  aria-label={selectedProduct?.isOutOfStock ? "Out of stock" : "Buy Now"}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {selectedProduct?.isOutOfStock ? "Out of Stock" : "Buy Now"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}


      {/* Custom Size Confirmation Alert - Main Product */}
      <AlertDialog open={showCustomSizeConfirmation} onOpenChange={setShowCustomSizeConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Your Custom Size
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <p>These are the custom measurements we will use for this gown. Please review them carefully:</p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-1 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span><strong>Shoulder:</strong> {measurements.shoulder} {measurementUnit}</span>
                  <span><strong>Bust:</strong> {measurements.bust} {measurementUnit}</span>
                  <span><strong>Waist:</strong> {measurements.waist} {measurementUnit}</span>
                  <span><strong>Hips:</strong> {measurements.hips} {measurementUnit}</span>
                  <span><strong>Sleeve:</strong> {measurements.sleeve} {measurementUnit}</span>
                  <span><strong>Length:</strong> {measurements.length} {measurementUnit}</span>
                </div>
              </div>
              <p className="text-amber-600 font-medium">If anything looks incorrect, choose "Review Again" to adjust your measurements before adding to cart.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCustomSizeConfirmation(false)}>
              Review Again
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleBuyNow()
                setShowCustomSizeConfirmation(false)
                setShowMainProductSizeSelector(false)
              }}
              className="bg-black hover:bg-gray-800"
            >
              Confirm & Buy Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom Size Confirmation Alert - Related Products */}
      <AlertDialog open={showRelatedCustomSizeConfirmation} onOpenChange={setShowRelatedCustomSizeConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirm Your Custom Size
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <p>These are the custom measurements we will use for this gown. Please review them carefully:</p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-1 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span><strong>Shoulder:</strong> {measurements.shoulder} {measurementUnit}</span>
                  <span><strong>Bust:</strong> {measurements.bust} {measurementUnit}</span>
                  <span><strong>Waist:</strong> {measurements.waist} {measurementUnit}</span>
                  <span><strong>Hips:</strong> {measurements.hips} {measurementUnit}</span>
                  <span><strong>Sleeve:</strong> {measurements.sleeve} {measurementUnit}</span>
                  <span><strong>Length:</strong> {measurements.length} {measurementUnit}</span>
                </div>
              </div>
              <p className="text-amber-600 font-medium">If anything looks incorrect, choose \"Review Again\" to adjust your measurements before adding to cart.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowRelatedCustomSizeConfirmation(false)}>
              Review Again
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedProduct) {
                  setShowRelatedCustomSizeConfirmation(false)
                  return
                }
                if (!isMeasurementsValid) {
                  setShowRelatedCustomSizeConfirmation(false)
                  return
                }
                const firstSize = selectedProduct.sizes[0]
                const price = firstSize?.discountedPrice || firstSize?.originalPrice || 0

                openWhatsAppOrder({
                  phoneNumber: "+971502996885",
                  product: {
                    id: selectedProduct.id,
                    name: selectedProduct.name,
                    category: selectedProduct.category,
                    price,
                    originalPrice: firstSize?.originalPrice,
                    image: selectedProduct.images?.[0],
                    url: typeof window !== "undefined" ? `${window.location.origin}/products/${selectedProduct.category}/${selectedProduct.id}` : undefined,
                  },
                  quantity,
                  size: { size: "custom", volume: measurementUnit },
                  customMeasurements: {
                    unit: measurementUnit,
                    values: {
                      shoulder: measurements.shoulder,
                      bust: measurements.bust,
                      waist: measurements.waist,
                      hips: measurements.hips,
                      sleeve: measurements.sleeve,
                      length: measurements.length,
                    },
                  },
                })

                setShowRelatedCustomSizeConfirmation(false)
                setShowSizeSelector(false)
              }}
              className="bg-black hover:bg-gray-800"
            >
              Confirm & Buy Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gift Package Selector Modal */}
      {showGiftPackageSelector && product && (
        <GiftPackageSelector
          product={product}
          isOpen={showGiftPackageSelector}
          onClose={() => setShowGiftPackageSelector(false)}
          onToggleFavorite={(product) => {
            if (isFavorite(product.id)) {
              removeFromFavorites(product.id)
            } else {
              addToFavorites({
                id: product.id,
                name: product.name,
                price: product.packagePrice || 0,
                image: product.images[0],
                category: product.category,
                rating: product.rating,
                isNew: product.isNew || false,
                isBestseller: product.isBestseller || false,
                sizes: product.giftPackageSizes || [],
                // Add missing gift package fields
                isGiftPackage: product.isGiftPackage,
                packagePrice: product.packagePrice,
                packageOriginalPrice: product.packageOriginalPrice,
                giftPackageSizes: product.giftPackageSizes,
              })
            }
          }}
          isFavorite={isFavorite}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  )
}