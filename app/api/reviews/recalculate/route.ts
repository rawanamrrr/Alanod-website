import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function calculateAverageRating(productId: string) {
  console.log("🔍 Calculating average rating for productId:", productId);
  
  // Build a single query for all reviews related to this base product ID
  const orFilters = [
    `product_id.eq.${productId}`,
    `product_id.like.${productId}-%`,
    `original_product_id.like.${productId}%`
  ].join(",");

  const { data: matchingReviews, error } = await supabase
    .from("reviews")
    .select("id, rating, product_id, original_product_id")
    .or(orFilters);

  if (error) {
    console.error("Error fetching reviews for rating recalculation:", error);
    return 0;
  }

  if (!matchingReviews || matchingReviews.length === 0) {
    console.log("❌ No reviews found, returning 0");
    return 0;
  }

  // Remove duplicates in case a review matches multiple OR conditions
  const uniqueReviews = matchingReviews.filter((review: any, index: number, self: any[]) => 
    index === self.findIndex((r: any) => r.id === review.id)
  );

  console.log("🔄 Total unique reviews:", uniqueReviews.length);

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
      // Reuse the same OR filter pattern to count matching reviews without scanning the whole table
      const orFilters = [
        `product_id.eq.${productId}`,
        `product_id.like.${productId}-%`,
        `original_product_id.like.${productId}%`
      ].join(",");

      const { data: matchingReviews, error } = await supabase
        .from("reviews")
        .select("id")
        .or(orFilters);

      if (error || !matchingReviews) {
        console.error("Error fetching reviews for count recalculation:", error);
        return 0;
      }

      const uniqueIds = new Set(matchingReviews.map((r: any) => r.id));
      return uniqueIds.size;
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
