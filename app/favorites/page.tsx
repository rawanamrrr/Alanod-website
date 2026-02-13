"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Heart, ShoppingCart, Trash2, ArrowLeft, Star, X, Sparkles, Package, AlertCircle, MessageCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { useFavorites } from "@/lib/favorites-context"
import { GiftPackageSelector } from "@/components/gift-package-selector"
import { useCurrencyFormatter } from "@/hooks/use-currency"
import { useCustomSize } from "@/hooks/use-custom-size"
import { useTranslation } from "@/lib/translations"
import { useLocale } from "@/lib/locale-context"
import { CustomSizeForm, SizeChartRow } from "@/components/custom-size-form"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { openWhatsAppOrder } from "@/lib/whatsapp"

interface FavoriteItem {
  id: string
  name: string
  price: number
  image: string
  category: string
  rating?: number
  isNew?: boolean
  isBestseller?: boolean
  isOutOfStock?: boolean
  // Gift package fields
  isGiftPackage?: boolean
  packagePrice?: number
  packageOriginalPrice?: number
  giftPackageSizes?: any[]
  sizes?: Array<{
    size: string
    volume: string
    originalPrice?: number
    discountedPrice?: number
  }>
}

export default function FavoritesPage() {
  const { state: favoritesState, removeFromFavorites, clearFavorites } = useFavorites()
  const { formatPrice } = useCurrencyFormatter()
  const { settings } = useLocale()
  const t = useTranslation(settings.language)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<FavoriteItem | null>(null)
  const [showSizeSelector, setShowSizeSelector] = useState(false)
  const [selectedSize, setSelectedSize] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
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

  const buyNow = (item: FavoriteItem) => {
    // Check if product is out of stock
    if (item.isOutOfStock) {
      alert(t("thisProductOutOfStock"))
      return
    }
    
    // For gift packages, we need to open the gift package selector instead of directly adding to cart
    if (item.isGiftPackage) {
      setSelectedProduct(item)
      setShowGiftPackageSelector(true)
      return
    }

    openWhatsAppOrder({
      phoneNumber: "+971502996885",
      product: {
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        image: item.image,
      },
      quantity,
      size: { size: "Standard", volume: "" },
      customMeasurements: null,
    })
  }

  const openSizeSelector = (product: FavoriteItem) => {
    setSelectedProduct(product)
    setSelectedSize(null)
    setShowSizeSelector(true)
    setQuantity(1)
    setIsCustomSizeMode(true)
    resetMeasurements()
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

  const buyNowWithSize = () => {
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
    
    let firstSize: any = null
    if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
      firstSize = selectedProduct.sizes[0]
    }
    const fallbackSize: any = {
      size: "custom",
      volume: measurementUnit,
      discountedPrice: selectedProduct.packagePrice || (firstSize ? (firstSize.discountedPrice ?? 0) : 0),
      originalPrice: firstSize ? (firstSize.originalPrice ?? 0) : 0
    }
    const baseSize: any = selectedSize || firstSize || fallbackSize

    const computedPrice = baseSize.discountedPrice || baseSize.originalPrice || selectedProduct.packagePrice || 0

    openWhatsAppOrder({
      phoneNumber: "+971502996885",
      product: {
        id: selectedProduct.id,
        name: selectedProduct.name,
        category: selectedProduct.category,
        price: computedPrice,
        originalPrice: baseSize.originalPrice,
        image: selectedProduct.image,
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

  const handleClearFavorites = () => {
    clearFavorites()
    setShowClearConfirm(false)
  }

  
  // Helper function to get smallest price from sizes
  const getSmallestPrice = (sizes: any[]) => {
    if (!sizes || sizes.length === 0) return 0
    const prices = sizes.map(size => size.discountedPrice || size.originalPrice || 0)
    return Math.min(...prices.filter(price => price > 0))
  }

  // Helper function to get smallest original price from sizes
  const getSmallestOriginalPrice = (sizes: any[]) => {
    if (!sizes || sizes.length === 0) return 0
    const prices = sizes.map(size => size.originalPrice || 0)
    return Math.min(...prices.filter(price => price > 0))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navigation />
      
      {/* Enhanced Size Selector Modal */}
      {showSizeSelector && selectedProduct && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeSizeSelector}
          style={{ touchAction: 'none' }}
        >
          <motion.div 
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto overflow-x-hidden shadow-2xl relative"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ touchAction: 'pan-y' }}
          >
            {/* Purple transparent rectangles */}
            <motion.div 
              className="absolute -inset-4 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-lg -z-10"
              animate={{
                rotate: [0, 2, 0, -2, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div 
              className="absolute -inset-2 bg-gradient-to-r from-purple-300/30 to-pink-300/30 rounded-lg -z-10"
              animate={{
                rotate: [0, -1, 0, 1, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            <div className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-medium">{selectedProduct.name}</h3>
                  <p className="text-gray-600 text-sm">Select your preferred size</p>
                </div>
                <div className="flex">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromFavorites(selectedProduct.id)
                    }}
                    className="mr-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-gray-100 transition-colors"
                    aria-label="Remove from favorites"
                  >
                    <Heart 
                      className="h-5 w-5 text-red-500 fill-red-500"
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
                    src={selectedProduct.image || "/placeholder.svg"}
                    alt={selectedProduct.name}
                    fill
                    className="rounded-lg object-cover"
                  />
                </div>
                <div>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    Choose your preferred size
                  </p>
                                    <div className="flex items-center mt-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            selectedProduct.rating && selectedProduct.rating > 0 && i < Math.floor(selectedProduct.rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
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
                  sizes={selectedProduct.sizes || []}
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
                  <div className="text-xl font-medium ml-2">
                    {(() => {
                      const qty = quantity;

                      // Handle gift packages
                      if (selectedProduct?.isGiftPackage) {
                        const unitPrice = selectedProduct.packagePrice || 0;
                        const unitOriginalPrice = selectedProduct.packageOriginalPrice || 0;
                        const totalPrice = unitPrice * qty;
                        const totalOriginalPrice = unitOriginalPrice * qty;
                        
                        if (unitOriginalPrice > 0 && unitPrice < unitOriginalPrice) {
                          return (
                            <>
                              <span className="line-through text-gray-400 mr-2 text-lg">{formatPrice(totalOriginalPrice)}</span>
                              <span className="text-red-600 font-bold">{formatPrice(totalPrice)}</span>
                            </>
                          );
                        } else {
                          return <>{formatPrice(totalPrice)}</>;
                        }
                      }
                      
                      // Handle regular products with selected size
                      if (selectedSize) {
                        const unitOriginal = selectedSize.originalPrice || 0;
                        const unitDiscount = selectedSize.discountedPrice || 0;
                        const hasDiscount = unitOriginal > 0 && selectedSize.discountedPrice !== undefined && unitDiscount < unitOriginal;
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
                      
                      // For custom size, use first size price
                      if (isCustomSizeMode && selectedProduct.sizes && selectedProduct.sizes.length > 0) {
                        const firstSize = selectedProduct.sizes[0];
                        const unitPrice = firstSize.discountedPrice || firstSize.originalPrice || 0;
                        return <>{formatPrice(unitPrice * qty)}</>;
                      }
                      
                      // Fallback to smallest price from sizes
                      const baseUnitPrice = getSmallestPrice(selectedProduct?.sizes || []);
                      return <>{formatPrice(baseUnitPrice * qty)}</>;
                    })()}
                  </div>
                </div>
                
                <Button 
                  onClick={() => {
                    if (!selectedProduct || selectedProduct.isOutOfStock) return
                    if (!isCustomSizeMode) {
                      // Standard size flow: add directly
                      buyNowWithSize()
                      return
                    }
                    // Custom size flow
                    if (!isMeasurementsValid) {
                      alert("Please complete your custom measurements")
                      return
                    }
                    setShowCustomSizeConfirmation(true)
                  }} 
                  className={`flex items-center rounded-full px-6 py-5 relative overflow-hidden group ${
                    selectedProduct?.isOutOfStock || (!isCustomSizeMode && selectedSize && selectedSize.stockCount !== undefined && selectedSize.stockCount === 0)
                      ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                      : 'bg-black hover:bg-gray-800'
                  }`}
                  disabled={
                    selectedProduct?.isOutOfStock ||
                    (!isCustomSizeMode && selectedSize && selectedSize.stockCount !== undefined && selectedSize.stockCount === 0) ||
                    (isCustomSizeMode ? !isMeasurementsValid : !selectedSize)
                  }
                  aria-label={selectedProduct?.isOutOfStock ? "Out of stock" : "Buy Now"}
                >
                  <span className="relative z-10">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {selectedProduct?.isOutOfStock ? "Out of Stock" : "Buy Now"}
                  </span>
                  <motion.span 
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
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
                buyNowWithSize()
                setShowCustomSizeConfirmation(false)
              }}
              className="bg-black hover:bg-gray-800"
            >
              Confirm & Buy Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <section className="pt-28 md:pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <Link href="/" className={`inline-flex items-center text-gray-600 hover:text-black mb-6 transition-colors ${settings.language === "ar" ? "flex-row-reverse" : ""}`}>
              <ArrowLeft className={`h-4 w-4 ${settings.language === "ar" ? "ml-2 rotate-180" : "mr-2"}`} />
              {t("backToHome")}
            </Link>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-light tracking-wider mb-2">{t("myFavorites")}</h1>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100px" }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-1 bg-gradient-to-r from-purple-400 to-pink-400 mb-4 rounded-full"
                />
                <p className="text-gray-600">
                  {favoritesState.count === 0
                    ? t("noFavoritesDesc")
                    : `${favoritesState.count} ${favoritesState.count === 1 ? t("item") || "item" : t("items") || "items"}`}
                </p>
              </div>

              {favoritesState.count > 0 && (
                <div className={`flex items-center ${settings.language === "ar" ? "space-x-reverse space-x-4" : "space-x-4"}`}>
                  {!showClearConfirm ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowClearConfirm(true)}
                      className={`text-red-600 border-red-200 hover:bg-red-50 ${settings.language === "ar" ? "flex-row-reverse" : ""}`}
                    >
                      <Trash2 className={`h-4 w-4 ${settings.language === "ar" ? "ml-2" : "mr-2"}`} />
                      {t("clearAllFavorites")}
                    </Button>
                  ) : (
                    <div className={`flex items-center ${settings.language === "ar" ? "space-x-reverse space-x-2" : "space-x-2"}`}>
                      <span className="text-sm text-gray-600">{t("areYouSure")}</span>
                      <Button size="sm" variant="outline" onClick={() => setShowClearConfirm(false)}>
                        {t("cancel")}
                      </Button>
                      <Button size="sm" onClick={handleClearFavorites} className="bg-red-600 hover:bg-red-700">
                        {t("confirm")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {favoritesState.count === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mb-8"
              >
                <div className="relative mx-auto mb-6 flex justify-center">
                  <div className="w-28 h-28 bg-gradient-to-r from-pink-50 to-purple-50 rounded-full flex items-center justify-center">
                    <Heart className="h-14 w-14 text-purple-400" />
                  </div>
                </div>
                <h2 className="text-2xl font-light tracking-wider mb-4 text-purple-700">{t("noFavoritesYet")}</h2>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100px" }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto my-6 rounded-full"
                />
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  {t("noFavoritesDesc")}
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                <Link href="/products">
                  <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-6 relative overflow-hidden group">
                    <span className="relative z-10">Explore Collections</span>
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
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favoritesState.items.map((item: FavoriteItem, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="relative h-full"
                >
                  <div className="group relative h-full">
                    {/* Remove from Favorites Button */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeFromFavorites(item.id)}
                      className="absolute top-4 right-6 z-10 p-2.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300"
                      aria-label="Remove from favorites"
                    >
                      <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                    </motion.button>
                    
                    {/* Product Card */}
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full relative overflow-hidden">
                      {/* Purple transparent rectangles */}
                      <motion.div 
                        className="absolute -inset-4 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-lg -z-10"
                        animate={{
                          rotate: [0, 0.5, 0, -0.5, 0],
                        }}
                        transition={{
                          duration: 8,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <motion.div 
                        className="absolute -inset-2 bg-gradient-to-r from-purple-300/15 to-pink-300/15 rounded-lg -z-10"
                        animate={{
                          rotate: [0, -0.3, 0, 0.3, 0],
                        }}
                        transition={{
                          duration: 6,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <CardContent className="p-0 h-full flex flex-col relative z-10">
                        <Link href={`/products/${item.category}/${item.id}`} className="block relative aspect-square flex-grow">
                          <div className="relative w-full h-full group-hover:scale-105 transition-transform duration-500">
                            {/* Badges - positioned inside image container */}
                            <div className="absolute top-4 left-4 z-10 space-y-2">
                              {item.isOutOfStock && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  whileInView={{ scale: 1 }}
                                  transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                                  viewport={{ once: true }}
                                >
                                  <Badge className="bg-gradient-to-r from-red-600 to-red-800 text-white text-xs px-2 py-1">Out of Stock</Badge>
                                </motion.div>
                              )}
                              {item.isBestseller && !item.isOutOfStock && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  whileInView={{ scale: 1 }}
                                  transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                                  viewport={{ once: true }}
                                >
                                  <Badge className="bg-black text-white text-xs px-2 py-1">Bestseller</Badge>
                                </motion.div>
                              )}
                              {item.isNew && !item.isBestseller && !item.isOutOfStock && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  whileInView={{ scale: 1 }}
                                  transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                                  viewport={{ once: true }}
                                >
                                  <Badge variant="secondary" className="text-xs px-2 py-1">New</Badge>
                                </motion.div>
                              )}
                            </div>
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                console.error(`Failed to load image for ${item.name}:`, item.image);
                                console.error('Image error details:', e);
                                // Fallback to placeholder if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.src = "/placeholder.svg";
                              }}
                              onLoad={() => {
                                console.log(`Successfully loaded image for ${item.name}:`, item.image);
                              }}
                              unoptimized={item.image?.startsWith('http')} // Don't optimize external URLs
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                            <div className="flex items-center mb-1">
                              <div className="flex items-center">
                                {[0, 1, 2, 3, 4].map((i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < (item.rating || 0)
                                        ? "fill-yellow-400 text-yellow-400" 
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs ml-2">
                                ({(item.rating || 0).toFixed(1)})
                              </span>
                            </div>

                            <h3 className="text-lg font-medium mb-1">
                              {item.name}
                            </h3>
                            
                            <div className="flex items-center justify-between">
                              <div className="text-lg font-light flex-1 min-w-0">
                                {(() => {
                                  // Handle gift packages
                                  if (item.isGiftPackage) {
                                    const packagePrice = item.packagePrice || 0;
                                    const packageOriginalPrice = item.packageOriginalPrice || 0;
                                    
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
                                  
                                  // Handle regular products with sizes
                                  if (item.sizes && item.sizes.length > 0) {
                                    const smallestPrice = getSmallestPrice(item.sizes);
                                    const getSmallestOriginalPrice = (sizes: any[]) => {
                                      if (!sizes || sizes.length === 0) return 0
                                      const prices = sizes.map(size => size.originalPrice || 0)
                                      return Math.min(...prices.filter(price => price > 0))
                                    }
                                    const smallestOriginalPrice = getSmallestOriginalPrice(item.sizes);
                                    
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
                                  }
                                  
                                  // Fallback to item price
                                  return <>{formatPrice(item.price)}</>;
                                })()}
                              </div>
                              
                              <button 
                                className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors flex-shrink-0"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  
                                  if (item.isGiftPackage) {
                                    setSelectedProduct(item)
                                    setShowGiftPackageSelector(true)
                                  } else if (item.sizes && item.sizes.length > 0) {
                                    openSizeSelector(item)
                                  } else {
                                    buyNow(item)
                                  }
                                }}
                                aria-label="Buy Now"
                              >
                                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                            </div>
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gift Package Selector Modal */}
      {showGiftPackageSelector && selectedProduct && (
        <GiftPackageSelector
          product={{
            _id: selectedProduct.id,
            id: selectedProduct.id,
            name: selectedProduct.name,
            description: selectedProduct.name,
            images: [selectedProduct.image],
            rating: selectedProduct.rating || 0,
            category: selectedProduct.category as any,
            isNew: selectedProduct.isNew || false,
            isBestseller: selectedProduct.isBestseller || false,
            isGiftPackage: selectedProduct.isGiftPackage,
            packagePrice: selectedProduct.packagePrice,
            packageOriginalPrice: selectedProduct.packageOriginalPrice,
            giftPackageSizes: selectedProduct.giftPackageSizes,
          }}
          isOpen={showGiftPackageSelector}
          onClose={() => setShowGiftPackageSelector(false)}
          onToggleFavorite={(product) => {
            if (favoritesState.items.some(item => item.id === product.id)) {
              removeFromFavorites(product.id)
            } else {
              // Add to favorites using the existing addToFavorites function
              // This will be handled by the favorites context
            }
          }}
          isFavorite={(productId: string) => favoritesState.items.some(item => item.id === productId)}
        />
      )}

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
