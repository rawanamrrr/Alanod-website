import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function calculateAverageRating(productId: string) {
  console.log("🔍 Calculating average rating for productId:", productId);
  
  // Get all reviews that might relate to this product
  const { data: allReviews } = await supabase
    .from("reviews")
    .select("*");

  if (!allReviews) return 0;

  // Filter reviews that match this product ID
  const matchingReviews = allReviews.filter((review: any) => {
    // Exact match
    if (review.product_id === productId) return true
    // Starts with base product ID (for variations)
    if (review.product_id?.startsWith(productId + '-')) return true
    // Original product ID matches
    if (review.original_product_id?.startsWith(productId)) return true
    return false
  });

  // Remove duplicates
  const uniqueReviews = matchingReviews.filter((review: any, index: number, self: any[]) => 
    index === self.findIndex((r: any) => r.id === review.id)
  );

  console.log("🔄 Total unique reviews:", uniqueReviews.length);

  if (uniqueReviews.length === 0) {
    console.log("❌ No reviews found, returning 0");
    return 0;
  }

  const total = uniqueReviews.reduce((sum: number, review: any) => sum + Number(review.rating), 0);
  const averageRating = Math.round((total / uniqueReviews.length) * 100) / 100;

  console.log("⭐ Calculated rating:", averageRating, "from", uniqueReviews.length, "reviews");

  return averageRating;
}

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json();
    
    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Find the product
    const { data: product } = await supabase
      .from("products")
      .select("product_id")
      .eq("product_id", productId)
      .single();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    console.log("🔄 Recalculating rating for product:", productId);
    
    const averageRating = await calculateAverageRating(productId);
    const uniqueReviewsCount = await (async () => {
      const { data: allReviews } = await supabase.from("reviews").select("*");
      if (!allReviews) return 0;
      const matching = allReviews.filter((r: any) => 
        r.product_id === productId || 
        r.product_id?.startsWith(productId + '-') ||
        r.original_product_id?.startsWith(productId)
      );
      return new Set(matching.map(r => r.id)).size;
    })();

    if (averageRating === 0 && uniqueReviewsCount === 0) {
      return NextResponse.json({ 
        message: "No reviews found for this product",
        rating: 0,
        reviewCount: 0
      });
    }

    // Update the product
    const { data: updatedProduct, error } = await supabase
      .from("products")
      .update({
        rating: averageRating,
        reviews: uniqueReviewsCount,
      })
      .eq("product_id", productId)
      .select()
      .single();

    if (error) {
      console.error("Error updating product:", error);
      return NextResponse.json({ error: "Failed to update product rating" }, { status: 500 });
    }
    
    console.log("✅ Product updated successfully");

    return NextResponse.json({ 
      success: true,
      message: "Rating recalculated successfully",
      productId: productId,
      rating: averageRating,
      reviewCount: uniqueReviewsCount,
    });

  } catch (error: any) {
    console.error("Recalculate rating error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
