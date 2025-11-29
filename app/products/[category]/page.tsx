"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Star, ShoppingCart, X, Heart, Instagram, Facebook, Package, AlertCircle } from "lucide-react"
import { useParams } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { useCart } from "@/lib/cart-context"
import { useFavorites } from "@/lib/favorites-context"
import { GiftPackageSelector } from "@/components/gift-package-selector"
import { useCurrencyFormatter } from "@/hooks/use-currency"
import { useCustomSize } from "@/hooks/use-custom-size"
import { CustomSizeForm, SizeChartRow } from "@/components/custom-size-form"
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
  // Gift package fields
  isGiftPackage?: boolean
  packagePrice?: number
  packageOriginalPrice?: number
  giftPackageSizes?: any[]
}

const categoryTitles = {
  winter: "Winter Collection",
  summer: "Summer Collection",
  fall: "Fall Collection",
}

const categoryDescriptions = {
  winter: "Elegant winter pieces designed for the season's special occasions.",
  summer: "Light and airy designs perfect for warm weather celebrations.",
  fall: "Rich textures and warm tones for autumn gatherings.",
}

export default function CategoryPage() {
  const { category } = useParams() as { category: string }
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
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
  
  const sizeChart: SizeChartRow[] = [
    { label: "XS", bust: "80-84", waist: "60-64", hips: "86-90" },
    { label: "S", bust: "85-89", waist: "65-69", hips: "91-95" },
    { label: "M", bust: "90-94", waist: "70-74", hips: "96-100" },
    { label: "L", bust: "95-100", waist: "75-80", hips: "101-106" },
    { label: "XL", bust: "101-106", waist: "81-86", hips: "107-112" },
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

  const { dispatch: cartDispatch } = useCart()
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites()
  const { formatPrice } = useCurrencyFormatter()

  useEffect(() => {
    if (category) {
      fetchProducts()
    }
  }, [category])

  // Debounce search query for better UX
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchQuery), 250)
    return () => clearTimeout(handle)
  }, [searchQuery])

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/products?category=${category}&limit=200`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const openSizeSelector = (product: Product) => {
    setSelectedProduct(product)
    setSelectedSize(null)
    setQuantity(1)
    setShowSizeSelector(true)
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
              values: measurements,
            }
          : undefined,
      }
    })
    
    closeSizeSelector()
  }

  const getMinPrice = (product: Product) => {
    return getSmallestPrice(product.sizes);
  }

  // Smarter search with normalization, tokenization and relevance scoring
  const filteredProducts = useMemo(() => {
    const normalize = (value: string) =>
      (value || "")
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

    const q = normalize(debouncedQuery.trim())
    if (!q) return products

    const terms = q.split(/\s+/).filter(Boolean)

    const scoreProduct = (p: Product) => {
      const name = normalize(p.name)
      const description = normalize(p.description)
      const sizesText = normalize(
        (p.sizes || []).map(s => `${s.size} ${s.volume}`).join(' ')
      )

      let score = 0

      // Full phrase boosts
      if (name === q) score += 8
      if (name.startsWith(q)) score += 5
      if (name.includes(q)) score += 3
      if (description.includes(q)) score += 2
      if (sizesText.includes(q)) score += 2

      // Token-based scoring
      for (const t of terms) {
        if (!t) continue
        if (name === t) score += 4
        else if (name.startsWith(t)) score += 3
        else if (name.includes(t)) score += 2
        if (description.includes(t)) score += 1
        if (sizesText.includes(t)) score += 2
      }

      // Light boosts
      if (p.isBestseller) score += 0.5
      if (p.isNew) score += 0.25

      // Slight rating factor
      score += Math.min(Math.max(p.rating || 0, 0), 5) * 0.05

      return score
    }

    const scored = products.map(p => ({ p, s: scoreProduct(p) }))
    const kept = scored.filter(x => x.s > 0)
    kept.sort((a, b) => b.s - a.s)
    return kept.map(x => x.p)
  }, [products, debouncedQuery])

  if (!categoryTitles[category as keyof typeof categoryTitles]) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
              <div className="pt-28 md:pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium mb-4">Category not found</h1>
          <Link href="/products">
            <Button className="bg-black text-white hover:bg-gray-800">
              Back to Collections
            </Button>
          </Link>
        </div>
      </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navigation />
        <div className="pt-28 md:pt-24 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Enhanced Size Selector Modal */}
      {showSizeSelector && selectedProduct && (
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
                          price: selectedSize ? (selectedSize.discountedPrice || selectedSize.originalPrice || 0) : getSmallestPrice(selectedProduct.sizes),
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
                    {selectedSize ? (
                      selectedSize.originalPrice && selectedSize.discountedPrice && 
                      selectedSize.discountedPrice < selectedSize.originalPrice ? (
                        <>
                          <span className="line-through text-gray-400 mr-2 text-lg">{formatPrice(selectedSize.originalPrice)}</span>
                          <span className="text-red-600 font-bold">{formatPrice(selectedSize.discountedPrice)}</span>
                        </>
                      ) : (
                        <>{formatPrice(selectedSize.discountedPrice || selectedSize.originalPrice || 0)}</>
                      )
                    ) : (
                      <>
                        {isCustomSizeMode && selectedProduct.sizes && selectedProduct.sizes.length > 0 ? (
                          <>{formatPrice(selectedProduct.sizes[0].discountedPrice || selectedProduct.sizes[0].originalPrice || 0)}</>
                        ) : (
                          <>{formatPrice(getSmallestPrice(selectedProduct.sizes))}</>
                        )}
                      </>
                    )}
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
                  aria-label={selectedProduct?.isOutOfStock ? "Out of stock" : "Add to cart"}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {selectedProduct?.isOutOfStock || (!isCustomSizeMode && selectedSize && selectedSize.stockCount !== undefined && selectedSize.stockCount === 0) ? "Out of Stock" : "Add to Cart"}
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
      <section className="pt-28 md:pt-24 pb-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <Link
              href="/products"
              className="inline-flex items-center text-gray-600 hover:text-black mb-8 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Collections
            </Link>
            <h1 className="text-4xl md:text-5xl font-light tracking-wider mb-6" style={{ fontFamily: 'var(--font-playfair-display), var(--font-crimson-text), "Playfair Display", "Crimson Text", "Bodoni Moda", "Bodoni MT", Didot, serif' }}>
              {categoryTitles[category as keyof typeof categoryTitles]}
            </h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "150px" }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto my-6 rounded-full"
            />
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {categoryDescriptions[category as keyof typeof categoryDescriptions]}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search + Products Grid */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="mb-8 max-w-xl mx-auto">
            <label htmlFor="category-search" className="sr-only">Search products</label>
            <Input
              id="category-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${categoryTitles[category as keyof typeof categoryTitles]} products...`}
            />
            <div className="mt-2 text-sm text-gray-500 text-center">
              {debouncedQuery
                ? `Showing ${filteredProducts.length} of ${products.length}`
                : `Showing all ${products.length} products`}
            </div>
          </div>
          {(debouncedQuery && filteredProducts.length === 0 && products.length > 0) ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg">No products match your search.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg">No products found in this category.</p>
              <Link href="/products">
                <Button className="mt-4 bg-black text-white hover:bg-gray-800">Browse All Collections</Button>
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredProducts.map((product, index) => {
                return (
                  <motion.div
                    key={product._id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    viewport={{ once: true }}
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
                          if (isFavorite(product.id)) {
                            removeFromFavorites(product.id)
                          } else {
                            // For gift packages, use package price; for regular products, use smallest size price
                            const price = product.isGiftPackage && product.packagePrice 
                              ? product.packagePrice 
                              : getSmallestPrice(product.sizes);
                              
                            addToFavorites({
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
                        }}
                        className="absolute top-4 right-6 z-10 p-2.5 bg-white/95 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all duration-300"
                        aria-label={isFavorite(product.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart 
                          className={`h-5 w-5 ${
                            isFavorite(product.id) 
                              ? "text-red-500 fill-red-500" 
                              : "text-gray-700"
                          }`} 
                        />
                      </motion.button>
                      
                      {/* Badges */}
                      <div className="absolute top-4 left-4 z-10 space-y-2">
                        {product.isOutOfStock && (
                          <motion.div
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                            viewport={{ once: true }}
                          >
                            <Badge className="bg-red-600 text-white">Out of Stock</Badge>
                          </motion.div>
                        )}
                        {product.isBestseller && (
                          <motion.div
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                            viewport={{ once: true }}
                          >
                            <Badge className="bg-black text-white">Bestseller</Badge>
                          </motion.div>
                        )}
                        {product.isNew && !product.isBestseller && (
                          <motion.div
                            initial={{ scale: 0 }}
                            whileInView={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                            viewport={{ once: true }}
                          >
                            <Badge variant="secondary">New</Badge>
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Product Card */}
                      <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                        <CardContent className="p-0 h-full flex flex-col">
                          <Link href={`/products/${category}/${product.id}`} className="block relative aspect-square flex-grow">
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
                                <div className="text-lg font-light">
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
                                  className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (product.isGiftPackage) {
                                      setSelectedProduct(product)
                                      setShowGiftPackageSelector(true)
                                    } else {
                                      openSizeSelector(product)
                                    }
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
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
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
      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Image src="/Anod-logo-white.png" alt="Alanoud Alqadi Atelier" width={864} height={288} className="h-24 w-auto" />
              <p className="text-gray-400 text-sm">
                Couture-crafted soirée dresses inspired by Middle Eastern artistry and modern glamour.
              </p>
            </div>

            <div>
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
            </div>

            <div>
              <h3 className="font-medium mb-4">Collections</h3>
              <div className="space-y-2 text-sm">
                <Link href="/products/winter" className="block text-gray-400 hover:text-white transition-colors">
                  Winter Collection
                </Link>
                <Link href="/products/summer" className="block text-gray-400 hover:text-white transition-colors">
                  Summer Collection
                </Link>
                <Link href="/products/fall" className="block text-gray-400 hover:text-white transition-colors">
                  Fall Collection
                </Link>
              </div>
            </div>

            <div>
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
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Alanoud Alqadi Atelier. All rights reserved.</p>
          </div>
        </div>
        </footer>
    </div>
  )
}