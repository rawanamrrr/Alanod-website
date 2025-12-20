"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useScroll } from "@/lib/scroll-context"
import { motion, useViewportScroll, useTransform, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Sparkles, Star, ShoppingCart, Heart, X, Instagram, Facebook, Package, AlertCircle, MessageCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { useFavorites } from "@/lib/favorites-context"
import { useCart } from "@/lib/cart-context"
import { GiftPackageSelector } from "@/components/gift-package-selector"
import { StarRating } from "@/lib/star-rating"
import { useCurrencyFormatter } from "@/hooks/use-currency"
import { useCustomSize } from "@/hooks/use-custom-size"
import { CustomSizeForm, SizeChartRow } from "@/components/custom-size-form"
import { useLocale } from "@/lib/locale-context"
import { useTranslation } from "@/lib/translations"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

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
  images: string[]
  rating: number
  reviews: number
  category: "winter" | "summer" | "fall"
  isNew?: boolean
  isBestseller?: boolean
  isOutOfStock?: boolean
  sizes: ProductSize[]
  isGiftPackage?: boolean
  packagePrice?: number
  packageOriginalPrice?: number
  giftPackageSizes?: any[]
  longDescription?: string
  isActive?: boolean
  notes?: {
    top: string[]
    middle: string[]
    base: string[]
  }
}

export default function HomePage() {
  const { scrollYProgress } = useViewportScroll()
  const [scrollY, setScrollY] = useState(0)
  const { isScrolled, isLogoVisible } = useScroll()
  const [isHeroLogoVisible, setIsHeroLogoVisible] = useState(true)
  const [favorites, setFavorites] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites()
  const { dispatch: cartDispatch } = useCart()
  const collectionsRef = useRef<HTMLElement>(null)
  const { formatPrice } = useCurrencyFormatter()
  const { settings } = useLocale()
  const t = useTranslation(settings.language)
  
  // Size selector state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showSizeSelector, setShowSizeSelector] = useState(false)
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

  const logoScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8])
  const logoY = useTransform(scrollYProgress, [0, 0.2], [0, -20])

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    // Hide hero logo when header logo becomes visible (when scrolled past hero)
    setIsHeroLogoVisible(!isLogoVisible)
  }, [isLogoVisible])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showSizeSelector || showCustomSizeConfirmation) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showSizeSelector, showCustomSizeConfirmation])

  useEffect(() => {
    if (!selectedProduct) return
    if (isCustomSizeMode) {
      setSelectedSize(null)
    } else if (!selectedSize && selectedProduct.sizes.length > 0) {
      setSelectedSize(selectedProduct.sizes[0])
    }
  }, [isCustomSizeMode, selectedProduct, selectedSize])


  useEffect(() => {
    const fetchFavorites = async () => {
      const token = localStorage.getItem("token")
      if (!token) return

      try {
        const res = await fetch("/api/favorites", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (res.ok) {
          const data = await res.json()
          setFavorites(data)
        }
      } catch (err) {
        console.error("Error fetching favorites", err)
      }
    }
    fetchFavorites()
  }, [])

  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const response = await fetch("/api/products?limit=100")
        if (response.ok) {
          const data = await response.json()
          // Filter active products and ensure they have valid data
          const activeProducts = data.filter((p: Product) => p.isActive && p.images && p.images.length > 0)
          setAllProducts(activeProducts)
        }
      } catch (error) {
        console.error("Error fetching products", error)
      } finally {
        setLoadingProducts(false)
      }
    }
    fetchAllProducts()
  }, [])

  const openSizeSelector = (product: Product) => {
    // For gift packages, we don't need to set selectedSize since it's handled differently
    if (product.isGiftPackage) {
      setSelectedProduct(product)
      setShowSizeSelector(true)
    } else {
      setSelectedProduct(product)
      setSelectedSize(null) // Start with no size selected - user must choose
      setQuantity(1)
      setShowSizeSelector(true)
      setIsCustomSizeMode(true) // Default to custom size mode
      setMeasurementUnit("cm")
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
      setMeasurementUnit("cm")
      setConfirmMeasurements(false)
    }, 300)
  }

  const addToCart = () => {
    if (!selectedProduct) return
    if (!isCustomSizeMode && !selectedSize) return
    if (isCustomSizeMode && !isMeasurementsValid) return

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

    let firstSize: ProductSize | null = null
    if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
      firstSize = selectedProduct.sizes[0]
    }
    const fallbackSize: ProductSize = {
      size: "custom",
      volume: measurementUnit,
      discountedPrice: selectedProduct.packagePrice || (firstSize ? (firstSize.discountedPrice ?? 0) : 0),
      originalPrice: firstSize ? (firstSize.originalPrice ?? 0) : 0
    }
    const baseSize: ProductSize = selectedSize || firstSize || fallbackSize

    const computedPrice = baseSize.discountedPrice || baseSize.originalPrice || selectedProduct.packagePrice || 0

    cartDispatch({
      type: "ADD_ITEM",
      payload: {
        id: `${selectedProduct.id}-${isCustomSizeMode ? "custom" : baseSize.size}`,
        productId: selectedProduct.id,
        name: selectedProduct.name,
        price: computedPrice,
        originalPrice: baseSize.originalPrice,
        size: isCustomSizeMode ? "custom" : baseSize.size,
        volume: isCustomSizeMode ? measurementUnit : baseSize.volume,
        image: selectedProduct.images[0],
        category: selectedProduct.category,
        quantity,
        stockCount: isCustomSizeMode ? undefined : baseSize.stockCount,
        customMeasurements: isCustomSizeMode
          ? {
              unit: measurementUnit,
              values: measurements
            }
          : undefined
      }
    })

    closeSizeSelector()
  }

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

  const getMinPrice = (product: Product) => {
    return getSmallestPrice(product.sizes);
  }

  const handleFavoriteClick = (e: React.MouseEvent, product: Product) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id)
    } else {
      // Handle gift packages differently
      if (product.isGiftPackage) {
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
      } else {
        // Handle regular products
        const minPrice = getMinPrice(product)
        addToFavorites({
          id: product.id,
          name: product.name,
          price: minPrice,
          image: product.images[0],
          category: product.category,
          rating: product.rating,
          isNew: product.isNew,
          isBestseller: product.isBestseller,
          sizes: product.sizes,
        })
      }
    }
  }

  const scrollToCollections = () => {
    collectionsRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    })
  }

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

  return (
    <div className="min-h-screen bg-white">
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
                    isGiftPackage: true,
                    packagePrice: product.packagePrice,
                    packageOriginalPrice: product.packageOriginalPrice,
                    giftPackageSizes: product.giftPackageSizes,
                  })
                }
              }}
              isFavorite={isFavorite}
            />
          ) : (
            /* Regular Product Size Selector */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={closeSizeSelector}
              style={{ touchAction: 'none' }}
            >
              <motion.div 
                className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{ touchAction: 'pan-y' }}
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
                              price: getSmallestPrice(selectedProduct.sizes),
                              image: selectedProduct.images[0],
                              category: selectedProduct.category,
                              rating: selectedProduct.rating,
                              isNew: selectedProduct.isNew || false,
                              isBestseller: selectedProduct.isBestseller || false,
                              sizes: selectedProduct.sizes || [],
                            })
                          }
                        }}
                        className="mr-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-gray-100 transition-colors"
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
                    <StarRating rating={selectedProduct.rating || 0} />
                                         <span className="text-xs text-gray-600 ml-2">
                       ({selectedProduct.rating ? selectedProduct.rating.toFixed(1) : '0.0'})
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

                  <div className="flex items-center justify-between gap-3 py-4 border-t border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-600 mb-1">{t("total")}:</div>
                      <div className="text-lg font-light">
                        {(() => {
                          const qty = quantity;

                          if (selectedSize) {
                            const unitOriginal = selectedSize.originalPrice || 0;
                            const unitDiscount = selectedSize.discountedPrice || 0;
                            const hasDiscount = unitOriginal > 0 && selectedSize.discountedPrice !== undefined && unitDiscount < unitOriginal;
                            const totalOriginal = unitOriginal * qty;
                            const totalPrice = (hasDiscount ? unitDiscount : (unitOriginal || unitDiscount)) * qty;

                            if (hasDiscount) {
                              return (
                                <>
                                  <span className="line-through text-gray-300 mr-2 text-base">{formatPrice(totalOriginal)}</span>
                                  <span className="text-red-500 font-bold">{formatPrice(totalPrice)}</span>
                                </>
                              );
                            }

                            return <>{formatPrice(totalPrice)}</>;
                          }

                          const baseUnitPrice = getSmallestPrice(selectedProduct.sizes);
                          return <>{formatPrice(baseUnitPrice * qty)}</>;
                        })()}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => {
                        if (!selectedProduct || selectedProduct.isOutOfStock) return
                        if (!isCustomSizeMode) {
                          addToCart()
                          return
                        }
                        if (!isMeasurementsValid) {
                          alert("Please complete your custom measurements")
                          return
                        }
                        setShowCustomSizeConfirmation(true)
                      }} 
                      className={`flex items-center rounded-full px-6 py-5 flex-shrink-0 ${
                        selectedProduct?.isOutOfStock || (!isCustomSizeMode && selectedSize && selectedSize.stockCount !== undefined && selectedSize.stockCount === 0)
                          ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                          : 'bg-black hover:bg-gray-800'
                      }`}
                      disabled={
                        selectedProduct?.isOutOfStock ||
                        (!isCustomSizeMode && selectedSize && selectedSize.stockCount !== undefined && selectedSize.stockCount === 0) ||
                        (isCustomSizeMode ? !isMeasurementsValid : !selectedSize)
                      }
                      aria-label={selectedProduct?.isOutOfStock ? t("outOfStock") : t("addToCart")}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {selectedProduct?.isOutOfStock || (!isCustomSizeMode && selectedSize && selectedSize.stockCount !== undefined && selectedSize.stockCount === 0) ? t("outOfStock") : t("addToCart")}
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
              <p className="text-amber-600 font-medium">If anything looks incorrect, choose "Review Again" to adjust your measurements before adding to cart.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCustomSizeConfirmation(false)}>
              Review Again
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                addToCart()
                setShowCustomSizeConfirmation(false)
              }}
              className="bg-black hover:bg-gray-800"
            >
              Confirm & Add to Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Image Background - Full Screen (with subtle continuous zoom) */}
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 10, ease: "easeInOut", repeat: Infinity }}
        >
          <Image
            src="/Alanod-bg.jpeg"
            alt="Alanod background"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </motion.div>

        {/* Logo Over Hero - Only show when not scrolled and logo not visible in header */}
        {isHeroLogoVisible && !isLogoVisible && (
          <motion.div 
            className="text-center z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Image 
              src="/Anod-logo-white.png" 
              alt="Alanod Logo" 
              width={864} 
              height={288} 
              priority
              className="h-72 w-auto mx-auto"
            />
          </motion.div>
        )}
      </motion.section>

      {/* Text Content Section - Below Video */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        viewport={{ once: true, amount: 0.3 }}
        className="py-20 bg-gradient-to-b from-gray-50 to-white overflow-hidden"
      >
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center space-y-4"
          >
            <motion.h1 
              className="text-4xl md:text-6xl font-light tracking-wider text-gray-900 font-serif"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              viewport={{ once: true }}
            >
              {t("embraceYour")}
            </motion.h1>
            <motion.h2 
              className="text-4xl md:text-6xl font-light tracking-wider text-gray-900 font-serif"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              viewport={{ once: true }}
            >
              {t("soiréeMoment")}
            </motion.h2>
            <motion.p 
              className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.7 }}
              viewport={{ once: true }}
            >
              {t("homeDescription")}
            </motion.p>
            
            {/* Explore Collections Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              viewport={{ once: true }}
            >
              <Link href="/products">
                <Button
                  className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-6 text-lg relative overflow-hidden group w-full sm:w-auto"
                >
                  <span className="relative z-10">{t("exploreCollections")}</span>
                  <ArrowRight className="ml-2 h-5 w-5 relative z-10" />
                  <motion.span 
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>


      {/* All Products Section - Display all products from products page */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        viewport={{ once: true, amount: 0.3 }}
        className="py-20 bg-white overflow-hidden"
      >
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light tracking-wider mb-4 font-serif">{t("allProducts")}</h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "100px" }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
              className="h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto my-6 rounded-full"
            />
            <p className="text-gray-600 max-w-2xl mx-auto">
              {t("allProductsDesc")}
            </p>
          </motion.div>

          {loadingProducts ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-600">{t("loadingProducts")}</p>
            </div>
          ) : allProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{t("noProducts")}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {allProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  className="group relative"
                >
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                    <CardContent className="p-0 h-full flex flex-col">
                      <Link href={`/products/${product.category}/${product.id}`} className="block relative aspect-square flex-grow">
                        <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                          <Image
                            src={product.images[0] || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover"
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
                            <span className="text-xs ml-2">
                              ({product.rating.toFixed(1)})
                            </span>
                          </div>
                          <h3 className="text-lg font-medium mb-1">
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between">
                            <div className="text-lg font-light flex-1 min-w-0">
                              {(() => {
                                // Handle gift packages
                                if (product.isGiftPackage) {
                                  const packagePrice = product.packagePrice || 0;
                                  const packageOriginalPrice = product.packageOriginalPrice || 0;

                                  if (packageOriginalPrice > 0 && packagePrice < packageOriginalPrice) {
                                    return (
                                      <>
                                        <span className="line-through text-gray-300 mr-2 text-base">{formatPrice(packageOriginalPrice)}</span>
                                        <span className="text-red-500 font-bold">{formatPrice(packagePrice)}</span>
                                      </>
                                    );
                                  } else {
                                    return <>{formatPrice(packagePrice)}</>;
                                  }
                                }

                                // Handle regular products
                                const smallestPrice = getSmallestPrice(product.sizes);
                                const smallestOriginalPrice = getSmallestOriginalPrice(product.sizes);

                                if (smallestOriginalPrice > 0 && smallestPrice < smallestOriginalPrice) {
                                  return (
                                    <>
                                      <span className="line-through text-gray-300 mr-2 text-base">{formatPrice(smallestOriginalPrice)}</span>
                                      <span className="text-red-500 font-bold">{formatPrice(smallestPrice)}</span>
                                    </>
                                  );
                                } else {
                                  return <>{formatPrice(smallestPrice)}</>;
                                }
                              })()}
                            </div>
                            <button 
                              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors flex-shrink-0"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                openSizeSelector(product)
                              }}
                              aria-label="Add to cart"
                            >
                              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </div>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* About Preview Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        viewport={{ once: true, amount: 0.3 }}
        className="py-20 bg-white overflow-hidden"
      >
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-light tracking-wider mb-6">{t("theArtOfCouture")}</h2>
              <motion.p 
                className="text-gray-600 mb-6 leading-relaxed"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
              >
                {t("artOfCoutureDesc1")}
              </motion.p>
              <motion.p 
                className="text-gray-600 mb-8 leading-relaxed"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
              >
                {t("artOfCoutureDesc2")}
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                viewport={{ once: true }}
              >
                <Link href="/about">
                  <Button
                    variant="outline"
                    className="border-black text-black hover:bg-black hover:text-white bg-transparent rounded-full px-6 py-5 group relative overflow-hidden"
                  >
                    <span className="relative z-10">{t("learnMoreAboutUs")}</span>
                    <ArrowRight className="ml-2 h-4 w-4 relative z-10" />
                    <motion.span 
                      className="absolute inset-0 bg-black opacity-0 group-hover:opacity-100"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.4 }}
                    />
                  </Button>
                </Link>
                {/* Alanod Background Image */}
                <div className="mt-12 w-full h-64 md:h-96 relative">
                  <Image
                    src="/Alanod-bg.jpeg"
                    alt="Alanod Background"
                    fill
                    className="object-cover rounded-lg"
                    priority
                  />
                </div>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
