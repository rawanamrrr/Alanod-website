import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Validate product ID
    if (!id || id === "undefined") {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get("orderId")

    // The id is already the base product ID from the product page
    const baseProductId = id

    console.log("Base product ID from params:", baseProductId)

    // Build a single query for all reviews related to this base product ID
    const orFilters = [
      `product_id.eq.${baseProductId}`,
      `product_id.like.${baseProductId}-%`,
      `original_product_id.like.${baseProductId}%`
    ].join(",")

    const reviewsClient = supabaseAdmin || supabase

    let reviewsQuery = reviewsClient
      .from("reviews")
      .select("*")
      .or(orFilters)
      .order("created_at", { ascending: false })

    if (orderId) {
      reviewsQuery = reviewsQuery.eq("order_id", orderId)
    }

    const { data: matchingReviews, error } = await reviewsQuery

    if (error) {
      console.error("Error fetching reviews:", error)
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    }

    console.log(`Found ${matchingReviews?.length || 0} reviews matching base ID variations`)

    // Remove duplicates based on id in case a review matches multiple conditions
    const uniqueReviews = (matchingReviews || []).filter((review: any, index: number, self: any[]) => 
      index === self.findIndex((r: any) => r.id === review.id)
    )

    console.log(`Returning ${uniqueReviews.length} unique reviews for base ID`)

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
