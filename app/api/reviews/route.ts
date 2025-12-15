import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { supabase } from "@/lib/supabase"

interface Review {
  id?: string
  product_id: string
  original_product_id?: string
  user_id: string
  user_name: string
  rating: number
  comment: string
  order_id: string
  created_at?: Date
  updated_at?: Date
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const { productId, rating, comment, orderId } = await request.json()

    if (!productId || !rating) {
      return NextResponse.json({ error: "Product ID and rating are required" }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5 (decimals allowed)" }, { status: 400 })
    }

    // EXTRACT BASE PRODUCT ID (remove size suffix like -bundle, -Travel, -Reguler, etc.)
    const baseProductId = productId.replace(/-[a-zA-Z0-9]+$/, '');
    console.log("Original productId:", productId, "Base productId:", baseProductId);

    // Check if product exists
    const { data: product } = await supabase
      .from("products")
      .select("product_id")
      .eq("product_id", baseProductId)
      .single()

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("product_id", baseProductId)
      .eq("user_id", decoded.userId)
      .single()

    if (existingReview) {
      return NextResponse.json({ 
        error: "You have already reviewed this product" 
      }, { status: 400 })
    }

    const review: Omit<Review, 'id' | 'created_at' | 'updated_at'> = {
      product_id: baseProductId, // Use base product ID without size suffix
      user_id: decoded.userId,
      user_name: decoded.name || decoded.email,
      rating: Number(rating),
      comment: comment?.trim() || "",
      order_id: orderId || `review-${Date.now()}`,
    }

    const { data: result, error } = await supabase
      .from("reviews")
      .insert(review)
      .select()
      .single()

    if (error) {
      console.error("Error creating review:", error)
      return NextResponse.json({ error: "Failed to create review" }, { status: 500 })
    }

    // Update product rating
    try {
      // Get reviews where productId matches the base product ID
      const { data: directReviews } = await supabase
        .from("reviews")
        .select("rating, id")
        .eq("product_id", baseProductId)

      // Get reviews where originalProductId matches the base product ID (for customized gift products)
      const { data: originalProductIdReviews } = await supabase
        .from("reviews")
        .select("rating, id")
        .ilike("original_product_id", `${baseProductId}%`)

      // Combine both sets of reviews and remove duplicates
      const allReviews = [
        ...(directReviews || []),
        ...(originalProductIdReviews || [])
      ]
      const uniqueReviews = allReviews.filter((review, index, self) => 
        index === self.findIndex(r => r.id === review.id)
      )
      
      const averageRating = uniqueReviews.reduce((sum, r) => sum + Number(r.rating), 0) / uniqueReviews.length
      const reviewCount = uniqueReviews.length

      await supabase
        .from("products")
        .update({
          rating: Math.round(averageRating * 100) / 100,
          reviews: reviewCount,
        })
        .eq("product_id", baseProductId)
    } catch (updateError) {
      console.error("Failed to update product rating, but review was saved:", updateError)
      // Don't fail the whole request if product update fails
    }

    return NextResponse.json({
      success: true,
      review: { 
        ...review,
        id: result.id,
        _id: result.id, // For backward compatibility
      },
    })
  } catch (error: any) {
    console.error("Create review error:", error)
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })
    return NextResponse.json({ 
      error: "Internal server error",
      message: error.message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")
    const userId = searchParams.get("userId")

    console.log("GET /api/reviews called with:", { productId, userId })

    if (!productId && !userId) {
      return NextResponse.json({ error: "Product ID or User ID required" }, { status: 400 })
    }

    let query = supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })

    if (productId) {
      // EXTRACT BASE PRODUCT ID (remove size suffix)
      const baseProductId = productId.replace(/-[a-zA-Z0-9]+$/, '');
      query = query.eq("product_id", baseProductId)
      console.log("Querying reviews for base productId:", baseProductId)
    }

    if (userId) {
      query = query.eq("user_id", userId)
      console.log("Querying reviews for userId:", userId)
    }

    const { data: reviews, error } = await query

    if (error) {
      console.error("Error fetching reviews:", error)
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    }

    console.log("Found", reviews?.length || 0, "reviews")

    // Convert to expected format
    const serializedReviews = (reviews || []).map(review => ({
      _id: review.id, // For backward compatibility
      id: review.id,
      productId: review.product_id,
      originalProductId: review.original_product_id,
      userId: review.user_id,
      userName: review.user_name,
      rating: review.rating,
      comment: review.comment,
      orderId: review.order_id,
      createdAt: review.created_at ? new Date(review.created_at).toISOString() : new Date().toISOString(),
      updatedAt: review.updated_at?.toISOString()
    }))

    console.log("Returning", serializedReviews.length, "serialized reviews")
    return NextResponse.json(serializedReviews)

  } catch (error: any) {
    console.error("Get reviews error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      message: error.message 
    }, { status: 500 })
  }
}
