import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import type { Product as BaseProduct } from "@/lib/models/types"

type CachedProductsEntry = {
  status: number
  body: string
  headers: Record<string, string>
  expiresAt: number
}

const LIST_CACHE_TTL_MS = Number(process.env.PRODUCTS_CACHE_TTL_MS ?? 30_000)
const DETAIL_CACHE_TTL_MS = Number(process.env.PRODUCT_DETAIL_CACHE_TTL_MS ?? 300_000)

const globalForProducts = globalThis as typeof globalThis & {
  _productsCache?: Map<string, CachedProductsEntry>
}

const productsCache = globalForProducts._productsCache ?? new Map<string, CachedProductsEntry>()
if (!globalForProducts._productsCache) {
  globalForProducts._productsCache = productsCache
}

const buildCacheKey = (url: URL) => {
  const params = Array.from(url.searchParams.entries())
    .sort(([a, aVal], [b, bVal]) => {
      const nameCompare = a.localeCompare(b)
      return nameCompare !== 0 ? nameCompare : aVal.localeCompare(bVal)
    })
    .map(([key, value]) => `${key}=${value}`)
    .join("&")

  return params ? `${url.pathname}?${params}` : url.pathname
}

const getCachedResponse = (url: URL) => {
  const cacheKey = buildCacheKey(url)
  const entry = productsCache.get(cacheKey)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    productsCache.delete(cacheKey)
    return null
  }

  return new NextResponse(entry.body, {
    status: entry.status,
    headers: entry.headers,
  })
}

const setCachedResponse = (
  url: URL,
  status: number,
  body: string,
  headers: Record<string, string>,
  ttl: number,
) => {
  const cacheKey = buildCacheKey(url)
  productsCache.set(cacheKey, {
    status,
    body,
    headers,
    expiresAt: Date.now() + Math.max(ttl, 1_000),
  })
}

const clearProductsCache = () => {
  if (productsCache.size > 0) {
    productsCache.clear()
  }
}

// Configure the API route to handle larger payloads
export const maxDuration = 60 // 60 seconds
export const dynamic = 'force-dynamic' // Ensure dynamic evaluation

// Ensure this route runs on Node.js runtime (larger body size than Edge)
export const runtime = 'nodejs'

// Helper function for error responses
const errorResponse = (message: string, status: number) => {
  return NextResponse.json(
    { 
      error: message, 
      timestamp: new Date().toISOString() 
    },
    { status }
  )
}

// Helper function to calculate isOutOfStock based on stockCount
const calculateIsOutOfStock = (sizes: any[]): boolean => {
  if (!sizes || sizes.length === 0) return false
  // Check if all sizes have stockCount = 0 or undefined/null
  const allSizesOutOfStock = sizes.every((size: any) => {
    const stockCount = size.stockCount ?? size.stock_count
    return stockCount === undefined || stockCount === null || stockCount === 0
  })
  return allSizesOutOfStock
}

type ApiProduct = BaseProduct & {
  _id: string
  createdAt: string
  updatedAt: string
}

// Transform Supabase product to match expected format
const transformProduct = (product: any): ApiProduct => {
  const sizes = product.sizes || []
  // Auto-calculate isOutOfStock if not explicitly set
  const isOutOfStock = product.is_out_of_stock !== undefined 
    ? product.is_out_of_stock 
    : calculateIsOutOfStock(sizes)
  
  // Use product.id (UUID) as _id for backward compatibility, fallback to product_id
  const productId = product.id || product.product_id
  
  return {
    _id: productId, // Add _id for backward compatibility with admin dashboard
    id: product.product_id,
    product_id: product.product_id,
    name: product.name,
    description: product.description,
    longDescription: product.long_description,
    price: product.price || 0,
    beforeSalePrice: product.before_sale_price,
    afterSalePrice: product.after_sale_price,
    sizes: sizes.map((size: any) => ({
      ...size,
      stockCount: size.stockCount ?? size.stock_count,
    })),
    images: product.images || [],
    rating: product.rating || 0,
    reviews: product.reviews || 0,
    notes: product.notes || { top: [], middle: [], base: [] },
    category: product.category,
    isNew: product.is_new === true, // Explicitly check for true, not just truthy
    isBestseller: product.is_bestseller === true, // Explicitly check for true
    isActive: product.is_active !== false,
    isOutOfStock: isOutOfStock,
    isGiftPackage: product.is_gift_package || false,
    packagePrice: product.package_price,
    packageOriginalPrice: product.package_original_price,
    giftPackageSizes: product.gift_package_sizes || [],
    createdAt: product.created_at ? new Date(product.created_at).toISOString() : new Date().toISOString(),
    updatedAt: product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString(),
  }
}

// Lighter transform for product list views (used by collections / home pages)
const transformProductList = (product: any): ApiProduct => {
  const sizes = product.sizes || []

  const productId = product.id || product.product_id

  return {
    _id: productId,
    id: product.product_id,
    product_id: product.product_id,
    name: product.name,
    description: product.description,
    // Omit heavy fields for list views
    longDescription: undefined as unknown as string,
    price: product.price || 0,
    beforeSalePrice: product.before_sale_price,
    afterSalePrice: product.after_sale_price,
    sizes: sizes.map((size: any) => ({
      ...size,
      stockCount: size.stockCount ?? size.stock_count,
    })),
    images: product.images || [],
    rating: product.rating || 0,
    reviews: product.reviews || 0,
    notes: undefined as unknown as BaseProduct["notes"],
    category: product.category,
    isNew: product.is_new === true,
    isBestseller: product.is_bestseller === true,
    isActive: product.is_active !== false,
    // Trust DB flag instead of recalculating for lists
    isOutOfStock: product.is_out_of_stock ?? false,
    isGiftPackage: product.is_gift_package || false,
    packagePrice: product.package_price,
    packageOriginalPrice: product.package_original_price,
    giftPackageSizes: product.gift_package_sizes || [],
    createdAt: product.created_at ? new Date(product.created_at).toISOString() : new Date().toISOString(),
    updatedAt: product.updated_at ? new Date(product.updated_at).toISOString() : new Date().toISOString(),
  }
}

// Columns used for list queries (omit long_description and notes for smaller payloads)
const LIST_SELECT = `
  id,
  product_id,
  name,
  description,
  price,
  before_sale_price,
  after_sale_price,
  sizes,
  images,
  rating,
  reviews,
  category,
  is_new,
  is_bestseller,
  is_active,
  is_out_of_stock,
  is_gift_package,
  package_price,
  package_original_price,
  gift_package_sizes,
  created_at,
  updated_at
`

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log("🔍 [API] GET /api/products - Request received")

  try {
    const { searchParams } = new URL(request.url)
    const requestUrl = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"
    
    // Check if user is admin (for includeInactive parameter and cache bypass)
    let isAdmin = false
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
        isAdmin = decoded.role === "admin"
        console.log(`🔐 [API] Admin check: isAdmin=${isAdmin}`)
      } catch (e) {
        console.log(`⚠️ [API] Token verification failed:`, e)
        // Not a valid token, ignore
      }
    }
    
    // Skip cache for admin requests with includeInactive (to ensure fresh data for analytics)
    const cachedResponse = (includeInactive && isAdmin) ? null : getCachedResponse(requestUrl)
    if (cachedResponse) {
      console.log(`⚡ [API] GET /api/products - Cache hit in ${Date.now() - startTime}ms`)
      return cachedResponse
    }
    
    const id = searchParams.get("id")
    const category = searchParams.get("category")
    const isBestsellerParam = searchParams.get("isBestseller")
    const isNewParam = searchParams.get("isNew")
    const isGiftPackageParam = searchParams.get("isGiftPackage")
    const hasPageParam = searchParams.has("page")
    const hasLimitParam = searchParams.has("limit")
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 40)
    const skip = (page - 1) * limit

    // Single product request
    if (id) {
      // Use admin client if including inactive products (for admin dashboard)
      const client = isAdmin ? (supabaseAdmin || supabase) : supabase
      
      let query = client
        .from("products")
        .select("*")
      
      // Only filter by is_active if not including inactive products (or if not admin)
      if (!includeInactive || !isAdmin) {
        query = query.eq("is_active", true)
      }

      // Try by product_id first (the actual product ID used in app)
      query = query.eq("product_id", id)
      
      const { data: product, error } = await query.single()

      if (error || !product) {
        return errorResponse("Product not found", 404)
      }

      const transformedProduct = transformProduct(product)
      const headers = {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      }
      const body = JSON.stringify(transformedProduct)
      setCachedResponse(requestUrl, 200, body, headers, DETAIL_CACHE_TTL_MS)
      return new NextResponse(body, { status: 200, headers })
    }

    // Category listing
    // Use admin client if including inactive products (for admin dashboard)
    const client = (includeInactive && isAdmin) ? (supabaseAdmin || supabase) : supabase
    
    let query = client
      .from("products")
      .select(LIST_SELECT)
    
    // Only filter by is_active if not including inactive products (or if not admin)
    if (!includeInactive || !isAdmin) {
      query = query.eq("is_active", true)
    }

    if (category) {
      query = query.eq("category", category)
    }
    if (isBestsellerParam !== null) {
      query = query.eq("is_bestseller", isBestsellerParam === 'true')
    }
    if (isNewParam !== null) {
      query = query.eq("is_new", isNewParam === 'true')
    }
    if (isGiftPackageParam !== null) {
      query = query.eq("is_gift_package", isGiftPackageParam === 'true')
    }

    if (hasPageParam) {
      query = query.order("created_at", { ascending: false })
        .range(skip, skip + limit - 1)

      const { data: products, error } = await query

      if (error) {
        console.error("Error fetching products:", error)
        return errorResponse("Failed to fetch products", 500)
      }

      // Get total count separately for pagination (estimated for speed)
      let countQuery = client
        .from("products")
        .select("product_id", { count: 'estimated', head: true })
      
      // Only filter by is_active if not including inactive products (or if not admin)
      if (!includeInactive || !isAdmin) {
        countQuery = countQuery.eq("is_active", true)
      }

      if (category) countQuery = countQuery.eq("category", category)
      if (isBestsellerParam !== null) countQuery = countQuery.eq("is_bestseller", isBestsellerParam === 'true')
      if (isNewParam !== null) countQuery = countQuery.eq("is_new", isNewParam === 'true')
      if (isGiftPackageParam !== null) countQuery = countQuery.eq("is_gift_package", isGiftPackageParam === 'true')

      const { count: total } = await countQuery
      const totalPages = Math.max(Math.ceil((total || 0) / limit), 1)

      const transformedProducts = (products || []).map(transformProductList)
      // For list view, only include first image
      const productsForList = transformedProducts.map((p: ApiProduct) => ({
        ...p,
        images: p.images.slice(0, 1),
        longDescription: undefined,
        notes: undefined,
      }))

      console.log(`⏱️ [API] Request completed in ${Date.now() - startTime}ms (page=${page}, limit=${limit}, total=${total})`)
      const headers = {
        "Content-Type": "application/json",
        "X-Total-Count": String(total || 0),
        "X-Page": String(page),
        "X-Limit": String(limit),
        "X-Total-Pages": String(totalPages),
        "Cache-Control": "no-store",
      }
      const body = JSON.stringify(productsForList)
      setCachedResponse(requestUrl, 200, body, headers, LIST_CACHE_TTL_MS)
      return new NextResponse(body, { status: 200, headers })
    } else {
      query = query.order("created_at", { ascending: false })

      if (hasLimitParam) {
        query = query.limit(limit)
      }

      console.log(`🔍 [API] Executing query with: includeInactive=${includeInactive}, isAdmin=${isAdmin}, client=${client === supabaseAdmin ? 'admin' : 'anon'}`)
      const { data: products, error } = await query

      if (error) {
        console.error("❌ [API] Error fetching products:", error)
        console.error("❌ [API] Error details:", JSON.stringify(error, null, 2))
        return errorResponse("Failed to fetch products", 500)
      }

      console.log(`📦 [API] Raw products from DB: ${products?.length || 0} products`)
      if (products && products.length > 0) {
        console.log(`📦 [API] First product sample:`, {
          id: products[0].product_id,
          name: products[0].name,
          is_active: products[0].is_active,
          is_new: products[0].is_new,
          is_bestseller: products[0].is_bestseller,
          is_out_of_stock: products[0].is_out_of_stock,
        })
      }
      
      const transformedProducts = (products || []).map(transformProduct)
      // For list view, only include first image
      const productsForList = transformedProducts.map((p: ApiProduct) => ({
        ...p,
        images: p.images.slice(0, 1),
        longDescription: undefined,
        notes: undefined,
      }))

      console.log(`⏱️ [API] Request completed in ${Date.now() - startTime}ms (all=${productsForList.length}, includeInactive=${includeInactive}, isAdmin=${isAdmin})`)
      if (includeInactive && isAdmin) {
        console.log(`📊 [API] Admin analytics - Total: ${productsForList.length}, Active: ${productsForList.filter((p: ApiProduct) => p.isActive).length}, New: ${productsForList.filter((p: ApiProduct) => p.isNew).length}, Bestsellers: ${productsForList.filter((p: ApiProduct) => p.isBestseller).length}, OutOfStock: ${productsForList.filter((p: ApiProduct) => p.isOutOfStock).length}`)
      }
      const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      }
      const body = JSON.stringify(productsForList)
      setCachedResponse(requestUrl, 200, body, headers, LIST_CACHE_TTL_MS)
      return new NextResponse(body, { status: 200, headers })
    }

  } catch (error) {
    console.error("❌ [API] Error in GET /api/products:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    )
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log("🔍 [API] POST /api/products - Request received")

  try {
    // Increase body size limit to handle multiple base64 images
    ;(request as unknown as { [k: string]: unknown })["__NEXT_PRIVATE_BODY_SIZE_LIMIT"] = "25mb"
    // Authentication check
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return errorResponse("Authorization required", 401)
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (jwtError) {
      return errorResponse("Invalid token", 401)
    }

    if (decoded.role !== "admin") {
      return errorResponse("Admin access required", 403)
    }

    // Parse and validate data
    const productData = await request.json()
    
    // Generate unique product ID
    const productId = productData.id || `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Prepare product data for Supabase
    let newProduct: any

    if (productData.isGiftPackage) {
      // Gift package
      newProduct = {
        product_id: productId,
        name: productData.name,
        description: productData.description,
        long_description: productData.longDescription || "",
        sizes: [],
        gift_package_sizes: productData.giftPackageSizes || [],
        package_price: productData.packagePrice ? Number(productData.packagePrice) : 0,
        package_original_price: productData.packageOriginalPrice ? Number(productData.packageOriginalPrice) : undefined,
        images: productData.images || ["/placeholder.svg"],
        rating: 0,
        reviews: 0,
        notes: {
          top: productData.notes?.top || [],
          middle: productData.notes?.middle || [],
          base: productData.notes?.base || [],
        },
        category: productData.category,
        is_new: productData.isNew ?? false,
        is_bestseller: productData.isBestseller ?? false,
        is_out_of_stock: productData.isOutOfStock ?? false,
        is_active: productData.isActive ?? true,
        is_gift_package: true,
        price: productData.packagePrice ? Number(productData.packagePrice) : 0,
        before_sale_price: undefined,
        after_sale_price: undefined,
      }
    } else {
      // Regular product
      const sizes = productData.sizes?.map((size: any) => {
        let stockCount: number | undefined = undefined
        if (size.stockCount !== undefined && size.stockCount !== null && size.stockCount !== "") {
          const parsed = Number(size.stockCount)
          if (!isNaN(parsed) && parsed >= 0) {
            stockCount = parsed
          }
        }
        return {
          size: size.size,
          volume: size.volume,
          originalPrice: size.originalPrice ? Number(size.originalPrice) : undefined,
          discountedPrice: size.discountedPrice ? Number(size.discountedPrice) : undefined,
          stockCount: stockCount,
        }
      }) || []
      
      // Auto-calculate isOutOfStock based on stockCount
      const isOutOfStock = calculateIsOutOfStock(sizes)
      
      newProduct = {
        product_id: productId,
        name: productData.name,
        description: productData.description,
        long_description: productData.longDescription || "",
        sizes: sizes,
        images: productData.images || ["/placeholder.svg"],
        rating: 0,
        reviews: 0,
        notes: {
          top: productData.notes?.top || [],
          middle: productData.notes?.middle || [],
          base: productData.notes?.base || [],
        },
        category: productData.category,
        is_new: productData.isNew ?? false,
        is_bestseller: productData.isBestseller ?? false,
        // For regular products, always derive out-of-stock from size stock counts
        is_out_of_stock: isOutOfStock,
        is_active: productData.isActive ?? true,
        is_gift_package: false,
        price: productData.sizes && productData.sizes.length > 0 
          ? Math.min(...productData.sizes.map((size: any) => 
              size.discountedPrice ? Number(size.discountedPrice) : Number(size.originalPrice)
            ))
          : 0,
        before_sale_price: productData.beforeSalePrice !== undefined && productData.beforeSalePrice !== "" ? Number(productData.beforeSalePrice) : undefined,
        after_sale_price: productData.afterSalePrice !== undefined && productData.afterSalePrice !== "" ? Number(productData.afterSalePrice) : undefined,
      }
    }

    // Use admin client to bypass RLS for product creation
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block product creation.")
    }

    // Insert into database
    const { data: result, error } = await client
      .from("products")
      .insert(newProduct)
      .select()
      .single()

    if (error) {
      console.error("Error creating product:", error)
      const errorMessage = error.message || "Failed to create product"
      return errorResponse(errorMessage, 500)
    }

    clearProductsCache()

    console.log(`⏱️ [API] Product created in ${Date.now() - startTime}ms`)
    return NextResponse.json({
      success: true,
      product: transformProduct(result),
      message: "Product created successfully",
    })

  } catch (error) {
    console.error("❌ [API] Error in POST /api/products:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    )
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now()
  console.log("🔍 [API] PUT /api/products - Request received")

  try {
    // Increase body size limit to handle multiple base64 images
    ;(request as unknown as { [k: string]: unknown })["__NEXT_PRIVATE_BODY_SIZE_LIMIT"] = "25mb"
    // Authentication check
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return errorResponse("Authorization required", 401)
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (jwtError) {
      return errorResponse("Invalid token", 401)
    }

    if (decoded.role !== "admin") {
      return errorResponse("Admin access required", 403)
    }

    // Get ID and data
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return errorResponse("Product ID is required", 400)
    }

    const productData = await request.json()

    // Prepare update based on category
    let updateData: any

    if (productData.isGiftPackage) {
      // Gift package update
      updateData = {
        name: productData.name,
        description: productData.description,
        long_description: productData.longDescription || "",
        category: productData.category,
        sizes: [],
        gift_package_sizes: productData.giftPackageSizes || [],
        package_price: productData.packagePrice ? Number(productData.packagePrice) : 0,
        package_original_price: productData.packageOriginalPrice ? Number(productData.packageOriginalPrice) : undefined,
        images: productData.images,
        notes: productData.notes,
        is_active: productData.isActive,
        is_new: productData.isNew,
        is_bestseller: productData.isBestseller,
        is_out_of_stock: productData.isOutOfStock,
        is_gift_package: true,
        price: productData.packagePrice ? Number(productData.packagePrice) : 0,
        before_sale_price: undefined,
        after_sale_price: undefined,
      }
    } else {
      // Regular product update
      const sizes = productData.sizes?.map((size: any) => {
        let stockCount: number | undefined = undefined
        if (size.stockCount !== undefined && size.stockCount !== null && size.stockCount !== "") {
          const parsed = Number(size.stockCount)
          if (!isNaN(parsed) && parsed >= 0) {
            stockCount = parsed
          }
        }
        return {
          size: size.size,
          volume: size.volume,
          originalPrice: size.originalPrice ? Number(size.originalPrice) : undefined,
          discountedPrice: size.discountedPrice ? Number(size.discountedPrice) : undefined,
          stockCount: stockCount,
        }
      }) || []
      
      // Auto-calculate isOutOfStock based on stockCount
      const isOutOfStock = calculateIsOutOfStock(sizes)
      
      updateData = {
        name: productData.name,
        description: productData.description,
        long_description: productData.longDescription || "",
        category: productData.category,
        sizes: sizes,
        images: productData.images,
        notes: productData.notes,
        is_active: productData.isActive,
        is_new: productData.isNew,
        is_bestseller: productData.isBestseller,
        // For regular products, always derive out-of-stock from size stock counts
        is_out_of_stock: isOutOfStock,
        is_gift_package: false,
        price: productData.sizes && productData.sizes.length > 0
          ? Math.min(...productData.sizes.map((size: any) => 
              size.discountedPrice ? Number(size.discountedPrice) : Number(size.originalPrice)
            ))
          : 0,
        before_sale_price: productData.beforeSalePrice !== undefined && productData.beforeSalePrice !== "" ? Number(productData.beforeSalePrice) : undefined,
        after_sale_price: productData.afterSalePrice !== undefined && productData.afterSalePrice !== "" ? Number(productData.afterSalePrice) : undefined,
      }
    }

    // Use admin client to bypass RLS for product update
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block product update.")
    }

    // Perform update (try by product_id first)
    const { data: updatedProduct, error } = await client
      .from("products")
      .update(updateData)
      .eq("product_id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating product:", error)
      const errorMessage = error.message || "Failed to update product"
      return errorResponse(errorMessage, 500)
    }
    
    if (!updatedProduct) {
      return errorResponse("Product not found", 404)
    }

    clearProductsCache()
    console.log(`⏱️ [API] Product updated in ${Date.now() - startTime}ms`)
    return NextResponse.json({ 
      success: true,
      product: transformProduct(updatedProduct),
      message: "Product updated successfully"
    })

  } catch (error) {
    console.error("❌ [API] Error in PUT /api/products:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    )
  }
}

export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  console.log("🔍 [API] DELETE /api/products - Request received")

  try {
    // Authentication check
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return errorResponse("Authorization required", 401)
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (jwtError) {
      return errorResponse("Invalid token", 401)
    }

    if (decoded.role !== "admin") {
      return errorResponse("Admin access required", 403)
    }

    // Get ID
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return errorResponse("Product ID is required", 400)
    }

    // Use admin client to bypass RLS for product deletion
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block product deletion.")
    }

    // Delete product (try by product_id)
    const { error } = await client
      .from("products")
      .delete()
      .eq("product_id", id)

    if (error) {
      console.error("Error deleting product:", error)
      return errorResponse("Product not found or failed to delete", 404)
    }

    clearProductsCache()
    console.log(`⏱️ [API] Product deleted in ${Date.now() - startTime}ms`)
    return NextResponse.json({ 
      success: true,
      message: "Product deleted successfully"
    })

  } catch (error) {
    console.error("❌ [API] Error in DELETE /api/products:", error)
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    )
  }
}
