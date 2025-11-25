"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { useScroll } from "@/lib/scroll-context"
import { motion, useViewportScroll, useTransform, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Sparkles, Star, ShoppingCart, Heart, X, Instagram, Facebook, Package } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { Badge } from "@/components/ui/badge"
import { useFavorites } from "@/lib/favorites-context"
import { useCart } from "@/lib/cart-context"
import { GiftPackageSelector } from "@/components/gift-package-selector"
import { StarRating } from "@/lib/star-rating"
import { useCurrencyFormatter } from "@/hooks/use-currency"
import { useCustomSize } from "@/hooks/use-custom-size"
import { CustomSizeForm, SizeChartRow } from "@/components/custom-size-form"

interface ProductSize {
  size: string
  volume: string
  originalPrice?: number
  discountedPrice?: number
}

interface Product {
  _id: string
  id: string
  name: string
  description: string
  images: string[]
  rating: number
  reviews: number
  category: "men" | "women" | "packages" | "outlet"
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
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites()
  const { dispatch: cartDispatch } = useCart()
  const collectionsRef = useRef<HTMLElement>(null)
  const { formatPrice } = useCurrencyFormatter()
  
  // Size selector state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showSizeSelector, setShowSizeSelector] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
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
    // Hide hero logo when header logo becomes visible
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
    // Check if the user has already seen the intro
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
    
    if (!hasSeenIntro) {
      setShowIntro(true);
      
      // Auto-hide intro after 4 seconds
      const timer = setTimeout(() => {
        setShowIntro(false);
        sessionStorage.setItem('hasSeenIntro', 'true');
      }, 4000);
      
      return () => clearTimeout(timer);
    }
  }, []);

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

  const openSizeSelector = (product: Product) => {
    // For gift packages, we don't need to set selectedSize since it's handled differently
    if (product.isGiftPackage) {
      setSelectedProduct(product)
      setShowSizeSelector(true)
    } else {
      setSelectedProduct(product)
      setSelectedSize(product.sizes.length > 0 ? product.sizes[0] : null)
      setQuantity(1)
      setShowSizeSelector(true)
      setIsCustomSizeMode(true)
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
    if (isCustomSizeMode && (!isMeasurementsValid || !confirmMeasurements)) return

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

  const handleCollectionClick = (productId: string, category: string) => {
    // Navigate immediately without delay
    window.location.href = `/products/${category}`
  }

  const products = [
    {
      id: "signature-soiree",
      title: "Signature Soirée",
      description: "Hand-finished gowns that shimmer beneath moonlit chandeliers.",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
      category: "women",
    },
    {
      id: "luminous-couture",
      title: "Luminous Couture",
      description: "Architectural silhouettes crafted for modern muses and red-carpet moments.",
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
      category: "men",
    },
    {
      id: "style-capsules",
      title: "Style Capsules",
      description: "Curated ensembles, accessories, and finishing layers for every soirée.",
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
      category: "packages",
    },
    {
      id: "atelier-archive",
      title: "Atelier Archive",
      description: "Limited pieces from past seasons, reimagined for new celebrations.",
      image: "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=600&q=80",
      category: "outlet",
    },
  ]

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

      {/* Elegant Intro Animation */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              transition: { duration: 0.8, ease: "easeInOut" }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          >
            <motion.div 
              className="absolute inset-0 overflow-hidden"
              initial={{ scale: 1.1 }}
              animate={{ 
                scale: 1,
                transition: { duration: 2, ease: "easeOut" }
              }}
            >
              
              
              
            </motion.div>

            <div className="relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  transition: { duration: 1.2 }
                }}
                className="mb-8"
              >
                <Image 
                  src="/alanoud-word-light.svg" 
                  alt="Alanoud Alqadi Atelier" 
                  width={320} 
                  height={160} 
                  priority
                  className="mx-auto filter brightness-125"
                  style={{ width: 'auto', height: 'auto' }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  transition: { duration: 1, delay: 0.5 }
                }}
                className="mt-4"
              >
                <div className="h-px w-24 bg-white/60 mx-auto mb-4" />
                <p className="text-white/80 text-sm font-light tracking-widest">SOIRÉE COUTURE</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                      onClick={addToCart} 
                      className={`flex items-center rounded-full px-6 py-5 ${
                        selectedProduct?.isOutOfStock 
                          ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                          : 'bg-black hover:bg-gray-800'
                      }`}
                      disabled={
                        selectedProduct?.isOutOfStock ||
                        (isCustomSizeMode ? (!isMeasurementsValid || !confirmMeasurements) : !selectedSize)
                      }
                      aria-label={selectedProduct?.isOutOfStock ? "Out of stock" : "Add to cart"}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {selectedProduct?.isOutOfStock ? "Out of Stock" : "Add to Cart"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </>
      )}

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

        {/* Logo Over Hero */}
        <div 
          className="text-center z-10 transition-opacity duration-0"
          style={{ 
            opacity: isHeroLogoVisible ? 1 : 0,
            pointerEvents: isHeroLogoVisible ? 'auto' : 'none',
            display: isLogoVisible ? 'none' : 'block'
          }}
        >
          <Image 
            src="/Anod-logo-white.png" 
            alt="Alanod Logo" 
            width={864} 
            height={288} 
            priority
            className="h-72 w-auto mx-auto"
          />
        </div>
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
              Embrace Your
            </motion.h1>
            <motion.h2 
              className="text-4xl md:text-6xl font-light tracking-wider text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              viewport={{ once: true }}
            >
              Soirée Moment
            </motion.h2>
            <motion.p 
              className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.7 }}
              viewport={{ once: true }}
            >
              Step into gowns that move like poetry. Each Alanoud Alqadi silhouette is draped, beaded, and tailored by hand so every entrance feels cinematic and every celebration unforgettable.
            </motion.p>
            
            {/* Explore Collections Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              viewport={{ once: true }}
            >
              <Button
                onClick={scrollToCollections}
                className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-6 text-lg relative overflow-hidden group"
              >
                <span className="relative z-10">Explore Collections</span>
                <ArrowRight className="ml-2 h-5 w-5 relative z-10" />
                <motion.span 
                  className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.4 }}
                />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>


      {/* Products Section - Collections */}
      <motion.section 
        ref={collectionsRef} 
        id="collections"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        viewport={{ once: true, amount: 0.3 }}
        className="py-20 bg-gray-50 overflow-hidden"
      >
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light tracking-wider mb-4">Couture Capsules</h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "100px" }}
              transition={{ duration: 0.8, delay: 0.5 }}
              viewport={{ once: true }}
              className="h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto my-6 rounded-full"
            />
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore four signature worlds of Alanoud Alqadi—each curated for a different kind of celebration, from intimate soirées to grand ballroom affairs.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
              >
                <Card 
                  className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                  onClick={() => handleCollectionClick(product.id, product.category)}
                >
                  <CardContent className="p-0">
                    <div className="relative overflow-hidden">
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt="Product Collection"
                        width={300}
                        height={500}
                        className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
                      
                                          </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
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
              <h2 className="text-3xl md:text-4xl font-light tracking-wider mb-6">The Art of Couture</h2>
              <motion.p 
                className="text-gray-600 mb-6 leading-relaxed"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                viewport={{ once: true }}
              >
                At Alanoud Alqadi Atelier, every gown begins with a story. Our design house sketches with emotion, sculpts with purpose, and celebrates the grace of the women who wear our work.
              </motion.p>
              <motion.p 
                className="text-gray-600 mb-8 leading-relaxed"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
              >
                From the first fitting to the final bow, each piece is hand-finished with couture techniques—intricate draping, delicate embroidery, and luminous beadwork that captures the light with every step.
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
                    <span className="relative z-10">Learn More About Us</span>
                    <ArrowRight className="ml-2 h-4 w-4 relative z-10" />
                    <motion.span 
                      className="absolute inset-0 bg-black opacity-0 group-hover:opacity-100"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.4 }}
                    />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30, scale: 1.1 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <Image
                src="https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=800&q=80"
                alt="Couture dressmaking studio"
                width={400}
                height={500}
                className="w-full h-96 object-cover rounded-lg shadow-lg"
              />
              <motion.div 
                className="absolute -inset-4 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-lg -z-10"
                animate={{
                  rotate: [0, 5, 0, -5, 0],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
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
                src="/alanoud-word-light.svg" 
                alt="Alanoud Alqadi Atelier" 
                width={180} 
                height={90} 
                className="h-16 w-auto" 
              />
              <p className="text-gray-400 text-sm">
                Couture-crafted soirée dresses inspired by Middle Eastern artistry and modern glamour.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="font-medium mb-4">Navigation</h3>
              <div className="space-y-2 text-sm">
                <Link href="/" className="block text-gray-400 hover:text-white transition-colors">
                  Home
                </Link>
                <Link href="/about" className="block text-gray-400 hover:text-white transition-colors">
                  About
                </Link>
                <Link href="/products" className="block text-gray-400 hover:text-white transition-colors">
                  Products
                </Link>
                <Link href="/contact" className="block text-gray-400 hover:text-white transition-colors">
                  Contact
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="font-medium mb-4">Collections</h3>
              <div className="space-y-2 text-sm">
                <Link href="/products/men" className="block text-gray-400 hover:text-white transition-colors">
                  Signature Soirée
                </Link>
                <Link href="/products/women" className="block text-gray-400 hover:text-white transition-colors">
                  Luminous Couture
                </Link>
                <Link href="/products/packages" className="block text-gray-400 hover:text-white transition-colors">
                  Style Capsules
                </Link>
                <Link href="/products/outlet" className="block text-gray-400 hover:text-white transition-colors">
                  Atelier Archive
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h3 className="font-medium mb-4">Contact</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Email: atelier@alanoudalqadi.com</p>
                <p className="mb-3">Follow the maison</p>
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
