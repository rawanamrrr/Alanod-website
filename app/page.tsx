"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useScroll } from "@/lib/scroll-context"
import { motion, useViewportScroll, useTransform, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Sparkles, Star, ShoppingCart, Heart, X, Instagram, Facebook, Package, AlertCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"
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
    { label: "XS", bust: "80-84", waist: "60-64", hips: "86-90" },
    { label: "S", bust: "85-89", waist: "65-69", hips: "91-95" },
    { label: "M", bust: "90-94", waist: "70-74", hips: "96-100" },
    { label: "L", bust: "95-100", waist: "75-80", hips: "101-106" },
    { label: "XL", bust: "101-106", waist: "81-86", hips: "107-112" },
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
            >
              <motion.div 
                className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
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
                      <span className="text-gray-600">{t("total")}:</span>
                      <span className="text-xl font-medium ml-2">
                        {selectedSize ? (
                          selectedSize.originalPrice && selectedSize.discountedPrice && 
                          selectedSize.discountedPrice < selectedSize.originalPrice ? (
                            <>
                              <span className="line-through text-gray-400 mr-2 text-lg">{formatPrice(selectedSize.originalPrice || 0)}</span>
                              <span className="text-red-600 font-bold">{formatPrice(selectedSize.discountedPrice || 0)}</span>
                            </>
                          ) : (
                            <>{formatPrice(selectedSize.discountedPrice || selectedSize.originalPrice || 0)}</>
                          )
                        ) : (
                          <>{formatPrice(getSmallestPrice(selectedProduct.sizes))}</>
                        )}
                      </span>
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
                      className={`flex items-center rounded-full px-6 py-5 ${
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
        {/* Image Background - Full Screen */}
        <motion.div 
          className="absolute inset-0 z-0"
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ duration: 8, ease: "easeOut" }}
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
              className="text-4xl md:text-6xl font-light tracking-wider text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              viewport={{ once: true }}
            >
              {t("embraceYour")}
            </motion.h1>
            <motion.h2 
              className="text-4xl md:text-6xl font-light tracking-wider text-gray-900"
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
            <h2 className="text-3xl md:text-4xl font-light tracking-wider mb-4">{t("allProducts")}</h2>
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
                  key={product._id}
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
                            <div className="text-left">
                              {product.sizes && product.sizes.length > 0 && (
                                <span className="text-lg font-light">
                                  {formatPrice(Math.min(...product.sizes.map(s => s.discountedPrice || s.originalPrice || 0).filter(p => p > 0)))}
                                </span>
                              )}
                            </div>
                            <button 
                              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                openSizeSelector(product)
                              }}
                              aria-label="Add to cart"
                            >
                              <ShoppingCart className="h-5 w-5" />
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
      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        viewport={{ once: true, amount: 0.3 }}
        className="bg-black text-white py-12"
      >
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Image 
                src="/Anod-logo-white.png" 
                alt="Alanoud Alqadi Atelier" 
                width={864} 
                height={288} 
                className="h-24 w-auto" 
              />
                      <p className="text-gray-400 text-sm">
                {t("footerDesc")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="font-medium mb-4">{t("navigation")}</h3>
              <div className="space-y-2 text-sm">
                <Link href="/" className="block text-gray-400 hover:text-white transition-colors">
                  {t("home")}
                </Link>
                <Link href="/about" className="block text-gray-400 hover:text-white transition-colors">
                  {t("about")}
                </Link>
                <Link href="/products" className="block text-gray-400 hover:text-white transition-colors">
                  {t("collections")}
                </Link>
                <Link href="/contact" className="block text-gray-400 hover:text-white transition-colors">
                  {t("contact")}
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="font-medium mb-4">{t("collectionsFooter")}</h3>
              <div className="space-y-2 text-sm">
                <Link href="/products/winter" className="block text-gray-400 hover:text-white transition-colors">
                  {t("winterCollection")}
                </Link>
                <Link href="/products/summer" className="block text-gray-400 hover:text-white transition-colors">
                  {t("summerCollection")}
                </Link>
                <Link href="/products/fall" className="block text-gray-400 hover:text-white transition-colors">
                  {t("fallCollection")}
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h3 className="font-medium mb-4">{t("contact")}</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Email: atelier@alanoudalqadi.com</p>
                <p className="mb-3">{t("followMaison")}</p>
                <div className="flex space-x-3">
                  <Link
                    href="https://www.instagram.com/alanoudalqadiofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                      <Instagram className="h-4 w-4 text-white" />
                    </div>
                  </Link>
                  <Link
                    href="https://www.facebook.com/alanoudalqadiofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                      <Facebook className="h-4 w-4 text-white" />
                    </div>
                  </Link>
                  <Link
                    href="https://www.tiktok.com/@alanoudalqadiofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg">
                      <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400"
          >
            <p>&copy; 2025 Alanoud Alqadi Atelier. All rights reserved.</p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  )
}
