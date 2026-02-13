"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, ShoppingCart, X, Heart, Sparkles, RefreshCw, Package, Instagram, Facebook, AlertCircle, MessageCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { useFavorites } from "@/lib/favorites-context"
import useEmblaCarousel from 'embla-carousel-react'
import { useCurrencyFormatter } from "@/hooks/use-currency"
import { useCustomSize } from "@/hooks/use-custom-size"
import type { SizeChartRow } from "@/components/custom-size-form"
import { useLocale } from "@/lib/locale-context"
import { useTranslation } from "@/lib/translations"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { openWhatsAppOrder } from "@/lib/whatsapp"

const GiftPackageSelector = dynamic(
  () => import("@/components/gift-package-selector").then((m) => m.GiftPackageSelector),
  { ssr: false }
)

const CustomSizeForm = dynamic(
  () => import("@/components/custom-size-form").then((m) => m.CustomSizeForm),
  { ssr: false }
)

interface ProductSize {
  size: string
  volume: string
  originalPrice?: number
  discountedPrice?: number
  stockCount?: number
}

interface Product {
  _id: string
  id: string
  name: string
  description: string
  longDescription: string
  images: string[]
  rating: number
  reviews: number
  category: "winter" | "summer" | "fall"
  sizes: ProductSize[]
  isActive: boolean
  isNew: boolean
  isBestseller: boolean
  isOutOfStock?: boolean
  // Gift package fields
  isGiftPackage?: boolean
  packagePrice?: number
  packageOriginalPrice?: number
  giftPackageSizes?: any[]
  notes?: {
    top: string[]
    middle: string[]
    base: string[]
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showSizeSelector, setShowSizeSelector] = useState(false)
  const [showGiftPackageSelector, setShowGiftPackageSelector] = useState(false)
  const [showCustomSizeConfirmation, setShowCustomSizeConfirmation] = useState(false)
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
  const { formatPrice } = useCurrencyFormatter()
  const { settings } = useLocale()
  const t = useTranslation(settings.language)
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
  
  // Function to calculate the smallest price from all sizes
  const getSmallestPrice = (sizes: ProductSize[]) => {
    if (!sizes || sizes.length === 0) return 0
    
    const prices = sizes.map(size => size.discountedPrice || size.originalPrice || 0)
    return Math.min(...prices.filter(price => price > 0))
  }

  // Function to calculate the smallest original price from all sizes
  const getSmallestOriginalPrice = (sizes: ProductSize[]) => {
    if (!sizes || sizes.length === 0) return 0
    
    const prices = sizes.map(size => size.originalPrice || 0)
    return Math.min(...prices.filter(price => price > 0))
  }
  
  // Embla Carousel state
  const [emblaRefMen, emblaApiMen] = useEmblaCarousel({ 
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    loop: false
  })
  const [selectedIndexMen, setSelectedIndexMen] = useState(0)
  
  const [emblaRefWomen, emblaApiWomen] = useEmblaCarousel({ 
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    loop: false
  })
  const [selectedIndexWomen, setSelectedIndexWomen] = useState(0)
  
  const [emblaRefPackages, emblaApiPackages] = useEmblaCarousel({ 
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    loop: false
  })
  const [selectedIndexPackages, setSelectedIndexPackages] = useState(0)
  
  const [emblaRefOutlet, emblaApiOutlet] = useEmblaCarousel({ 
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
    loop: false
  })
  const [selectedIndexOutlet, setSelectedIndexOutlet] = useState(0)

  const { 
    addToFavorites, 
    removeFromFavorites, 
    isFavorite, 
    loading: favoritesLoading 
  } = useFavorites()

  type ProductCardLayout = "mobile" | "desktop"
  type ProductSection = "winter" | "summer" | "fall"

  const fetchProducts = async () => {
    try {
      // إذا الكود شغال على client استخدم relative URL
      const baseUrl = typeof window !== "undefined"
        ? ""
        : process.env.NEXT_PUBLIC_BASE_URL;

      const response = await fetch(`${baseUrl}/api/products?page=1&limit=20`);

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.error("Error fetching products:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  fetchProducts();
}, []);

useEffect(() => {
  if (!selectedProduct) return
  if (isCustomSizeMode) {
    setSelectedSize(null)
  } else if (!selectedSize && selectedProduct.sizes.length > 0) {
    setSelectedSize(selectedProduct.sizes[0])
  }
}, [isCustomSizeMode, selectedProduct, selectedSize])

// Lock body scroll when modal is open
useEffect(() => {
  if (showSizeSelector || showGiftPackageSelector || showCustomSizeConfirmation) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
  return () => {
    document.body.style.overflow = ''
  }
}, [showSizeSelector, showGiftPackageSelector, showCustomSizeConfirmation])


  const categorizedProducts = useMemo(
    () => ({
      winter: products.filter((p) => p.category === "winter" && p.isActive),
      summer: products.filter((p) => p.category === "summer" && p.isActive),
      fall: products.filter((p) => p.category === "fall" && p.isActive),
    }),
    [products]
  )

  const openSizeSelector = (product: Product) => {
    // For gift packages, open the gift package selector instead
    if (product.isGiftPackage) {
      setSelectedProduct(product)
      setShowGiftPackageSelector(true)
    } else {
      setSelectedProduct(product)
      setSelectedSize(null) // Start with no size selected - user must choose
      setQuantity(1)
      setShowSizeSelector(true)
      setIsCustomSizeMode(true) // Default to custom size mode
      resetMeasurements()
    }
  }

  const closeSizeSelector = () => {
    setShowSizeSelector(false)
    setTimeout(() => {
      setSelectedProduct(null)
      setSelectedSize(null)
      resetMeasurements()
      setIsCustomSizeMode(true)
      setConfirmMeasurements(false)
    }, 300)
  }

  const buyNow = () => {
    if (!selectedProduct) return
    if (isCustomSizeMode && !isMeasurementsValid) return
    if (!isCustomSizeMode && !selectedSize) return
    
    // Check stock for standard sizes
    if (!isCustomSizeMode && selectedSize) {
      if (selectedSize.stockCount !== undefined && selectedSize.stockCount < quantity) {
        alert(`Insufficient stock for ${selectedProduct.name} - Size ${selectedSize.size}. Available: ${selectedSize.stockCount}, Requested: ${quantity}`)
        return
      }
      if (selectedSize.stockCount !== undefined && selectedSize.stockCount === 0) {
        alert(`Size ${selectedSize.size} is out of stock`)
        return
      }
    }
    
    const baseSize = selectedSize || selectedProduct.sizes[0] || {
      size: "custom",
      volume: measurementUnit,
      discountedPrice: selectedProduct.packagePrice || (selectedProduct.sizes?.[0] as ProductSize | undefined)?.discountedPrice,
      originalPrice: (selectedProduct.sizes?.[0] as ProductSize | undefined)?.originalPrice,
    }

    openWhatsAppOrder({
      phoneNumber: "+971502996885",
      product: {
        id: selectedProduct.id,
        name: selectedProduct.name,
        category: selectedProduct.category,
        price: baseSize.discountedPrice || baseSize.originalPrice || selectedProduct.packagePrice || 0,
        originalPrice: baseSize.originalPrice,
        image: selectedProduct.images?.[0],
      },
      quantity,
      size: isCustomSizeMode
        ? { size: "custom", volume: measurementUnit }
        : { size: baseSize.size, volume: baseSize.volume },
      customMeasurements: isCustomSizeMode
        ? {
            unit: measurementUnit,
            values: measurements,
          }
        : null,
    })
    
    closeSizeSelector()
  }

  const toggleFavorite = async (product: any) => {
    try {
      if (isFavorite(product.id)) {
        await removeFromFavorites(product.id)
      } else {
        // For gift packages, use package price; for regular products, use smallest size price
        const price = product.isGiftPackage && product.packagePrice 
          ? product.packagePrice 
          : getSmallestPrice(product.sizes);
          
        await addToFavorites({
          id: product.id,
          name: product.name,
          price: price,
          image: product.images[0],
          category: product.category,
          rating: product.rating,
          isNew: product.isNew,
          isBestseller: product.isBestseller,
          sizes: product.sizes,
          // Add gift package fields
          isGiftPackage: product.isGiftPackage,
          packagePrice: product.packagePrice,
          packageOriginalPrice: product.packageOriginalPrice,
          giftPackageSizes: product.giftPackageSizes,
        })
      }
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  // Carousel scroll functions
  const scrollToMen = useCallback((index: number) => {
    if (!emblaApiMen) return
    emblaApiMen.scrollTo(index)
  }, [emblaApiMen])

  const scrollToWomen = useCallback((index: number) => {
    if (!emblaApiWomen) return
    emblaApiWomen.scrollTo(index)
  }, [emblaApiWomen])

  const scrollToPackages = useCallback((index: number) => {
    if (!emblaApiPackages) return
    emblaApiPackages.scrollTo(index)
  }, [emblaApiPackages])

  const scrollToOutlet = useCallback((index: number) => {
    if (!emblaApiOutlet) return
    emblaApiOutlet.scrollTo(index)
  }, [emblaApiOutlet])

  interface ProductCardProps {
    product: Product
    layout: ProductCardLayout
    section: ProductSection
    index: number
  }

  const ProductCard = ({ product, layout, section, index }: ProductCardProps) => {
    const priceData = useMemo(() => {
      if (product.isGiftPackage) {
        const price = product.packagePrice || 0
        const original = product.packageOriginalPrice || 0
        return { price, original }
      }

      const price = getSmallestPrice(product.sizes)
      const original = getSmallestOriginalPrice(product.sizes)
      return { price, original }
    }, [product])

    const hasDiscount = priceData.original > 0 && priceData.price < priceData.original

    const handleFavoriteClick = useCallback(
      async (e: any) => {
        e.stopPropagation()
        await toggleFavorite(product)
      },
      [product, toggleFavorite]
    )

    const handleBuyNowClick = useCallback(
      (e: any) => {
        e.preventDefault()
        e.stopPropagation()
        openSizeSelector(product)
      },
      [product, openSizeSelector]
    )

    const isWinter = section === "winter"

    const priceRowClassName =
      layout === "mobile"
        ? isWinter
          ? "flex items-end justify-between gap-2"
          : "flex items-center justify-between"
        : "flex items-center justify-between"

    const priceTextWrapperClassName =
      layout === "mobile" && isWinter ? "text-left flex-1 min-w-0" : "text-left"

    const addToCartButtonClassNameBase =
      layout === "desktop"
        ? `p-2 backdrop-blur-sm rounded-full transition-colors ${
            product.isGiftPackage
              ? "bg-gradient-to-r from-gray-800/30 to-black/30 hover:from-gray-800/50 hover:to-black/50"
              : "bg-white/20 hover:bg-white/30"
          }`
        : "p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"

    const addToCartButtonClassName =
      layout === "mobile" && isWinter
        ? `${addToCartButtonClassNameBase} flex-shrink-0`
        : addToCartButtonClassNameBase

    const cartIconClassName =
      layout === "desktop" || section === "fall"
        ? "h-4 w-4 sm:h-5 sm:w-5"
        : "h-5 w-5"

    const addToCartAriaLabel =
      layout === "desktop" && product.isGiftPackage ? "Customize Package" : "Buy Now"

    const imageSizes = "(max-width: 768px) 80vw, (max-width: 1200px) 33vw, 25vw"

    return (
      <div className="group relative h-full">
        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
          aria-label={isFavorite(product.id) ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`h-5 w-5 ${
              isFavorite(product.id)
                ? "text-red-500 fill-red-500"
                : "text-gray-700"
            }`}
          />
        </button>

        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 space-y-2">
          {layout === "mobile" && product.isOutOfStock && (
            <Badge className="bg-red-600 text-white">Out of Stock</Badge>
          )}
          {product.isBestseller && (
            <Badge className="bg-black text-white">Bestseller</Badge>
          )}
          {product.isNew && !product.isBestseller && (
            <Badge variant="secondary">New</Badge>
          )}
        </div>

        {/* Product Card */}
        <Card className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full ${layout === "mobile" ? "mr-4" : ""}`}>
          <CardContent className="p-0 h-full flex flex-col">
            <Link
              href={`/products/${product.category}/${product.id}`}
              className="block relative aspect-square flex-grow"
            >
              <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                <Image
                  src={product.images[0] || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes={imageSizes}
                  priority={index < 4}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <div className="flex items-center mb-1">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(product.rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs ml-2">({product.rating.toFixed(1)})</span>
                </div>

                <h3 className="text-lg font-medium mb-1">{product.name}</h3>

                <div className={priceRowClassName}>
                  <div className={priceTextWrapperClassName}>
                    {hasDiscount ? (
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-white">
                          {formatPrice(priceData.price)}
                        </span>
                        <span className="line-through text-gray-300 text-sm">
                          {formatPrice(priceData.original)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-white">
                        {formatPrice(priceData.price)}
                      </span>
                    )}
                  </div>

                  <button
                    className={addToCartButtonClassName}
                    onClick={handleBuyNowClick}
                    aria-label={addToCartAriaLabel}
                  >
                    {layout === "desktop" && product.isGiftPackage ? (
                      <Package className={cartIconClassName} />
                    ) : (
                      <ShoppingCart className={cartIconClassName} />
                    )}
                  </button>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Carousel event listeners
  useEffect(() => {
    if (!emblaApiMen) return
    emblaApiMen.on('select', () => {
      setSelectedIndexMen(emblaApiMen.selectedScrollSnap())
    })
  }, [emblaApiMen])

  useEffect(() => {
    if (!emblaApiWomen) return
    emblaApiWomen.on('select', () => {
      setSelectedIndexWomen(emblaApiWomen.selectedScrollSnap())
    })
  }, [emblaApiWomen])

  useEffect(() => {
    if (!emblaApiPackages) return
    emblaApiPackages.on('select', () => {
      setSelectedIndexPackages(emblaApiPackages.selectedScrollSnap())
    })
  }, [emblaApiPackages])

  useEffect(() => {
    if (!emblaApiOutlet) return
    emblaApiOutlet.on('select', () => {
      setSelectedIndexOutlet(emblaApiOutlet.selectedScrollSnap())
    })
  }, [emblaApiOutlet])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation />

      {/* Size Selector Modal */}
      {showSizeSelector && selectedProduct && (
        <>
          {/* Gift Package Selector */}
          {selectedProduct.isGiftPackage ? (
            <GiftPackageSelector
              product={selectedProduct}
              isOpen={showSizeSelector}
              onClose={closeSizeSelector}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />
          ) : (
            /* Regular Product Size Selector */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeSizeSelector}
        >
          <motion.div 
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: 'pan-y' }}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-medium">{selectedProduct.name}</h3>
                  <p className="text-gray-600 text-sm">{t("selectSize")}</p>
                </div>
                <div className="flex">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(selectedProduct)
                    }}
                    className="mr-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-gray-100 transition-colors"
                    aria-label={isFavorite(selectedProduct.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart 
                      className={`h-5 w-5 ${
                        isFavorite(selectedProduct.id) 
                          ? "text-red-500 fill-red-500" 
                          : "text-gray-700"
                      }`} 
                    />
                  </button>
                  <button 
                    onClick={closeSizeSelector}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Close size selector"
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
                          className={`h-4 w-4 ${
                            i < Math.floor(selectedProduct.rating) 
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
                  sizes={selectedProduct.sizes}
                  selectedSize={selectedSize}
                  onSelectSize={(size) => {
                    setIsCustomSizeMode(false)
                    setSelectedSize(size)
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
              
              {/* Quantity Selection */}
              <div className="mb-4">
                <h4 className="font-medium mb-3">{t("quantity")}</h4>
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
                  {selectedProduct ? (
                    (() => {
                      const qty = quantity;
                      const referenceSize = selectedSize || selectedProduct.sizes[0];
                      const unitOriginal = referenceSize?.originalPrice ?? selectedProduct.packagePrice ?? 0;
                      const unitDiscount = referenceSize?.discountedPrice;
                      const hasDiscount = unitDiscount !== undefined && unitDiscount < (referenceSize?.originalPrice ?? unitDiscount);
                      const totalOriginal = unitOriginal * qty;
                      const totalPrice = (hasDiscount ? unitDiscount! : unitOriginal) * qty;

                      return (
                        <div>
                          {hasDiscount ? (
                            <>
                              <span className="line-through text-gray-400 text-lg block">{formatPrice(totalOriginal)}</span>
                              <span className="text-xl font-medium text-red-600">{formatPrice(totalPrice)}</span>
                            </>
                          ) : (
                            <span className="text-xl font-medium">{formatPrice(totalPrice)}</span>
                          )}
                          {isCustomSizeMode && (
                            <span className="text-xs text-gray-500 mt-1 block">
                              Custom measurements will be confirmed by our atelier concierge.
                            </span>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <span className="text-xl font-medium text-gray-400">Select a gown</span>
                  )}
                </div>
                
                <Button 
                  onClick={() => {
                    if (!selectedProduct || selectedProduct.isOutOfStock) return
                    if (!isCustomSizeMode) {
                      buyNow()
                      return
                    }
                    if (!isMeasurementsValid) {
                      alert("Please complete your custom measurements")
                      return
                    }
                    setShowCustomSizeConfirmation(true)
                  }} 
                  className={`flex items-center rounded-full px-6 py-5 ${
                    selectedProduct?.isOutOfStock 
                      ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                      : 'bg-black hover:bg-gray-800'
                  }`}
                  disabled={
                    selectedProduct?.isOutOfStock ||
                        (isCustomSizeMode ? !isMeasurementsValid : !selectedSize)
                  }
                  aria-label={selectedProduct?.isOutOfStock ? "Out of stock" : "Buy Now"}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {selectedProduct?.isOutOfStock ? t("outOfStock") : "Buy Now"}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
          )}
        </>
      )}

      {/* Custom Size Confirmation Alert */}
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
              <p className="text-amber-600 font-medium">{t("ifAnythingIncorrect")}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCustomSizeConfirmation(false)}>
              {t("reviewAgain")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                buyNow()
                setShowCustomSizeConfirmation(false)
              }}
              className="bg-black hover:bg-gray-800"
            >
              Confirm & Buy Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hero Section */}
      <section className="pt-40 md:pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="relative">
              <h1 className="text-5xl md:text-6xl font-light tracking-wider mb-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-playfair-display), var(--font-crimson-text), "Playfair Display", "Crimson Text", "Bodoni Moda", "Bodoni MT", Didot, serif' }}>
               {t("collectionsTitle")}
              </h1>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "200px" }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto my-6 rounded-full"
              />
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              {t("collectionsDesc")}
            </p>
            <Button
              onClick={fetchProducts}
              variant="outline"
              size="lg"
              className={`border-gray-300 text-gray-600 hover:bg-gray-50 mx-auto ${settings.language === "ar" ? "flex-row-reverse" : ""}`}
            >
              <RefreshCw className={`h-5 w-5 ${settings.language === "ar" ? "ml-2" : "mr-2"}`} />
              {t("refreshAllProducts")}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Signature Soirée Collection */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <h2 className="text-4xl font-light tracking-wider bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-playfair-display), var(--font-crimson-text), "Playfair Display", "Crimson Text", "Bodoni Moda", "Bodoni MT", Didot, serif' }}>
                    {t("winterCollection")}
                  </h2>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 mt-2 rounded-full"
                  />
                </div>
                <div className="hidden sm:block text-sm text-gray-500 font-light tracking-wide">
                  {t("elegantWinterPieces")}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={fetchProducts}
                  variant="outline"
                  size="sm"
                  className={`border-gray-300 text-gray-600 hover:bg-gray-50 ${settings.language === "ar" ? "flex-row-reverse" : ""}`}
                >
                  <RefreshCw className={`h-4 w-4 ${settings.language === "ar" ? "ml-2" : "mr-2"}`} />
                  {t("refresh")}
                </Button>
                <Link href="/products/winter">
                  <Button
                    variant="outline"
                    className="border-black text-black hover:bg-black hover:text-white bg-transparent"
                  >
                    {t("viewAll")}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Carousel */}
            <div className="md:hidden">
              <div className="overflow-hidden" ref={emblaRefMen}>
                <div className="flex">
                  {categorizedProducts.winter?.slice(0, 8).map((product, index) => (
                    <div key={product._id} className="flex-[0_0_80%] min-w-0 pl-4 relative h-full">
                      <ProductCard
                        product={product}
                        layout="mobile"
                        section="winter"
                        index={index}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center mt-4 md:hidden">
                {categorizedProducts.winter?.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToMen(index)}
                    className={`w-2 h-2 mx-1 rounded-full transition-colors ${
                      index === selectedIndexMen ? 'bg-black' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {categorizedProducts.winter?.slice(0, 8).map((product, index) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  layout="desktop"
                  section="winter"
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Luminous Couture Collection */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <h2 className="text-4xl font-light tracking-wider bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-playfair-display), var(--font-crimson-text), "Playfair Display", "Crimson Text", "Bodoni Moda", "Bodoni MT", Didot, serif' }}>
                    {t("summerCollection")}
                  </h2>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 mt-2 rounded-full"
                  />
                </div>
                <div className="hidden sm:block text-sm text-gray-500 font-light tracking-wide">
                  {t("elegantSummerPieces")}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={fetchProducts}
                  variant="outline"
                  size="sm"
                  className={`border-gray-300 text-gray-600 hover:bg-gray-50 ${settings.language === "ar" ? "flex-row-reverse" : ""}`}
                >
                  <RefreshCw className={`h-4 w-4 ${settings.language === "ar" ? "ml-2" : "mr-2"}`} />
                  {t("refresh")}
                </Button>
                <Link href="/products/summer">
                  <Button
                    variant="outline"
                    className="border-black text-black hover:bg-black hover:text-white bg-transparent"
                  >
                    {t("viewAll")}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Carousel */}
            <div className="md:hidden">
              <div className="overflow-hidden" ref={emblaRefWomen}>
                <div className="flex">
                  {categorizedProducts.summer?.slice(0, 8).map((product, index) => (
                    <div key={product._id} className="flex-[0_0_80%] min-w-0 pl-4 relative h-full">
                      <ProductCard
                        product={product}
                        layout="mobile"
                        section="summer"
                        index={index}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center mt-4 md:hidden">
                  {categorizedProducts.summer?.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToWomen(index)}
                    className={`w-2 h-2 mx-1 rounded-full transition-colors ${
                      index === selectedIndexWomen ? 'bg-black' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {categorizedProducts.summer?.slice(0, 8).map((product, index) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  layout="desktop"
                  section="summer"
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Style Capsules */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <h2 className="text-4xl font-light tracking-wider bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-playfair-display), var(--font-crimson-text), "Playfair Display", "Crimson Text", "Bodoni Moda", "Bodoni MT", Didot, serif' }}>
                    {t("fallCollection")}
                  </h2>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 mt-2 rounded-full"
                  />
                </div>
                <div className="hidden sm:block text-sm text-gray-500 font-light tracking-wide">
                  {t("elegantFallPieces")}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  onClick={fetchProducts}
                  variant="outline"
                  size="sm"
                  className={`border-gray-300 text-gray-600 hover:bg-gray-50 ${settings.language === "ar" ? "flex-row-reverse" : ""}`}
                >
                  <RefreshCw className={`h-4 w-4 ${settings.language === "ar" ? "ml-2" : "mr-2"}`} />
                  {t("refresh")}
                </Button>
                <Link href="/products/fall">
                  <Button
                    variant="outline"
                    className="border-black text-black hover:bg-black hover:text-white bg-transparent"
                  >
                    {t("viewAll")}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mobile Carousel */}
            <div className="md:hidden">
              <div className="overflow-hidden" ref={emblaRefPackages}>
                <div className="flex">
                  {categorizedProducts.fall?.slice(0, 8).map((product, index) => (
                    <div key={product._id} className="flex-[0_0_80%] min-w-0 pl-4 relative h-full">
                      <ProductCard
                        product={product}
                        layout="mobile"
                        section="fall"
                        index={index}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center mt-4 md:hidden">
                {categorizedProducts.fall?.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToPackages(index)}
                    className={`w-2 h-2 mx-1 rounded-full transition-colors ${
                      index === selectedIndexPackages ? 'bg-black' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {categorizedProducts.fall?.map((product, index) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  layout="desktop"
                  section="fall"
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </section>


      {/* Gift Package Selector Modal */}
      {showGiftPackageSelector && selectedProduct && (
        <GiftPackageSelector
          product={selectedProduct}
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

      {/* Decorative floating elements */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="fixed bottom-8 left-8 z-10"
      >
        <Sparkles className="h-6 w-6 text-purple-400" />
      </motion.div>
      
      <motion.div
        animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
        transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="fixed top-1/4 right-8 z-10"
      >
        <Sparkles className="h-4 w-4 text-pink-400" />
      </motion.div>
    </div>
  )
}
