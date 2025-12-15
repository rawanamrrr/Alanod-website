import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate product ID
    if (!params.id || params.id === "undefined") {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get("orderId")

    // The params.id is already the base product ID from the product page
    const baseProductId = params.id

    console.log("Base product ID from params:", baseProductId)

    // Build query for Supabase
    let query = supabase
      .from("reviews")
      .select("*")
      .eq("product_id", baseProductId)
      .order("created_at", { ascending: false })

    if (orderId) {
      query = query.eq("order_id", orderId)
    }

    const { data: reviews, error } = await query

    if (error) {
      console.error("Error fetching reviews:", error)
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    }

    console.log(`Found ${reviews?.length || 0} reviews with exact base ID`)

    // Also get reviews where original_product_id matches or contains the base product ID
    // Note: Supabase doesn't support regex like MongoDB, so we'll fetch and filter
    // For now, let's get all reviews and filter in memory for variations
    let allReviewsQuery = supabase
      .from("reviews")
      .select("*")

    if (orderId) {
      allReviewsQuery = allReviewsQuery.eq("order_id", orderId)
    }

    const { data: allReviews } = await allReviewsQuery

    // Filter reviews that match the base product ID in various ways
    const matchingReviews = (allReviews || []).filter((review: any) => {
      // Exact match
      if (review.product_id === baseProductId) return true
      // Starts with base product ID (for variations)
      if (review.product_id?.startsWith(baseProductId + '-')) return true
      // Original product ID matches
      if (review.original_product_id?.startsWith(baseProductId)) return true
      return false
    })

    // Remove duplicates based on id
    const uniqueReviews = matchingReviews.filter((review: any, index: number, self: any[]) => 
      index === self.findIndex((r: any) => r.id === review.id)
    )

    console.log(`Combined ${matchingReviews.length} total reviews, ${uniqueReviews.length} unique reviews`)

    // Convert to expected format
    const serializedReviews = uniqueReviews.map((review: any) => ({
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
      updatedAt: review.updated_at ? new Date(review.updated_at).toISOString() : undefined
    }))

    return NextResponse.json({ reviews: serializedReviews })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    )
  }
}
