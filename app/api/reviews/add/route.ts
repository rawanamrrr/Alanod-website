import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import jwt from "jsonwebtoken";

// Global cache clearing function
const globalForCache = globalThis as typeof globalThis & {
  _productsCache?: Map<string, any>
}

const clearProductsCache = () => {
  const cache = globalForCache._productsCache;
  if (cache && cache.size > 0) {
    cache.clear();
    console.log("🗑️ Cleared products list cache");
  }
}

async function calculateAverageRating(productId: string) {
  console.log("🔍 Calculating average rating for productId:", productId);
  
  // Build a single query for all reviews related to this base product ID
  const orFilters = [
    `product_id.eq.${productId}`,
    `product_id.like.${productId}-%`,
    `original_product_id.like.${productId}%`
  ].join(",");

  const reviewsClient = supabaseAdmin || supabase;

  const { data: matchingReviews, error } = await reviewsClient
    .from("reviews")
    .select("id, rating, product_id, original_product_id")
    .or(orFilters);

  if (error) {
    console.error("Error fetching reviews for rating calculation:", error);
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

  console.log("🔄 Combined", matchingReviews.length, "total reviews,", uniqueReviews.length, "unique reviews");

  const total = uniqueReviews.reduce((sum: number, review: any) => sum + Number(review.rating), 0);
  const averageRating = Math.round((total / uniqueReviews.length) * 100) / 100;

  console.log("⭐ Total rating:", total, "Average rating:", averageRating, "from", uniqueReviews.length, "reviews");

  return averageRating;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Authorization token missing" }, 
        { status: 401 }
      );
    }

    // 2. Token Verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { 
      userId: string; 
      email: string;
      name?: string;
    };

    // 3. Parse and Validate Request
    const body = await req.json();
    
    // Accept either productId or id from the request
    const productId = body.id || body.productId;
    if (!productId) {
      return NextResponse.json(
        { error: "Product identifier is required" },
        { status: 400 }
      );
    }
    
    const orderId = body.orderId || body.order_id;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }
    
    if (body.rating === undefined || body.rating === null) {
      return NextResponse.json(
        { error: "Rating is required" },
        { status: 400 }
      );
    }

    // Validate rating
    const rating = Number(body.rating);
    if (isNaN(rating)) {
      return NextResponse.json(
        { error: "Rating must be a number" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5 (decimals allowed)" },
        { status: 400 }
      );
    }

    // 4. Verify order exists and is completed (shipped or delivered)
    // Try to find order by order_id first
    const ordersClient = supabaseAdmin || supabase;
    const reviewsClient = supabaseAdmin || supabase;

    const { data: order, error: orderError } = await ordersClient
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .eq("user_id", decoded.userId)
      .in("status", ["shipped", "delivered"])
      .single();

    if (orderError || !order) {
      // Try by ID if order_id didn't work
      const { data: orderById } = await ordersClient
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("user_id", decoded.userId)
        .in("status", ["shipped", "delivered"])
        .single();

      if (!orderById) {
        return NextResponse.json(
          { error: "Order not found or not delivered" },
          { status: 400 }
        );
      }
    }

    const orderData = order || (await ordersClient.from("orders").select("*").eq("id", orderId).single()).data;

    if (!orderData) {
      return NextResponse.json(
        { error: "Order not found or not delivered" },
        { status: 400 }
      );
    }

    // Find the specific item in the order
    const items = orderData.items || [];
    const item = items.find((i: any) => 
      i.productId === productId || i.id === productId || i.product_id === productId
    );

    if (!item) {
      return NextResponse.json(
        { error: "Product not found in order" },
        { status: 400 }
      );
    }

    if (item.reviewed) {
      return NextResponse.json(
        { error: "This product has already been reviewed" },
        { status: 400 }
      );
    }

    // EXTRACT BASE PRODUCT ID (remove size suffix like -bundle, -Travel, -Reguler, etc.)
    const baseProductId = productId;
    console.log("Original productId:", productId, "Base productId:", baseProductId);
    
    // For gift packages, extract the actual base product ID
    let actualBaseProductId = baseProductId;
    
    console.log("Review document to be created:", {
      productId: actualBaseProductId,
      actualBaseProductId: actualBaseProductId,
      orderId: orderId,
      userId: decoded.userId,
      userName: decoded.name || decoded.email,
      rating: rating,
      comment: body.comment || ""
    });

    // Check if review already exists
    const { data: existingReview } = await reviewsClient
      .from("reviews")
      .select("id")
      .eq("product_id", actualBaseProductId)
      .eq("user_id", decoded.userId)
      .eq("order_id", orderId)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this product for this order" },
        { status: 400 }
      );
    }

    const { data: productRow, error: productRowError } = await supabase
      .from("products")
      .select("product_id")
      .eq("product_id", actualBaseProductId)
      .maybeSingle();

    if (productRowError) {
      console.error("Error checking product before review insert:", productRowError);
      return NextResponse.json({ error: "Failed to verify product for review" }, { status: 500 });
    }

    if (!productRow) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // 5. Save Review to main reviews collection
    const reviewDoc = {
      product_id: actualBaseProductId,
      order_id: orderId,
      user_id: decoded.userId,
      user_name: decoded.name || decoded.email,
      rating: rating,
      comment: body.comment || "",
      original_product_id: productId, // Keep original for reference
    };

    const { data: reviewResult, error: reviewError } = await reviewsClient
      .from("reviews")
      .insert(reviewDoc)
      .select()
      .single();

    if (reviewError) {
      console.error("Error creating review:", reviewError);
      return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
    }

    // 6. Update Order - mark item as reviewed
    // In Supabase, we need to update the entire items array
    const updatedItems = items.map((i: any) => {
      if (i.productId === productId || i.id === productId || i.product_id === productId) {
        return {
          ...i,
          reviewed: true,
          review: {
            rating: rating,
            comment: body.comment || "",
            userName: decoded.name || decoded.email
          }
        };
      }
      return i;
    });

    const { error: updateOrderError } = await ordersClient
      .from("orders")
      .update({ items: updatedItems })
      .eq("order_id", orderData.order_id || orderId);

    if (updateOrderError) {
      console.error("Error updating order:", updateOrderError);
      // Don't fail the request if order update fails
    }

    // 7. Update product stats
    console.log("🔄 Updating product stats for actualBaseProductId:", actualBaseProductId);
    
    clearProductsCache();
    
    // Check if the product exists
    const { data: product } = await supabase
      .from("products")
      .select("product_id, name, rating, reviews")
      .eq("product_id", actualBaseProductId)
      .single();

    console.log("🔍 Product found in database:", !!product);
    
    if (product) {
      console.log("📝 Current product data:", {
        id: product.product_id,
        name: product.name,
        currentRating: product.rating,
        currentReviews: product.reviews
      });
    } else {
      console.log("❌ Product NOT found in database with id:", actualBaseProductId);
    }
    
    const calculatedRating = await calculateAverageRating(actualBaseProductId);
    console.log("📊 Calculated rating:", calculatedRating);
    
    // Get review count
    const { count: reviewCount } = await reviewsClient
      .from("reviews")
      .select("*", { count: 'exact', head: true })
      .eq("product_id", actualBaseProductId);

    // Update the product rating and review count
    if (product) {
      const { error: productUpdateError } = await supabase
        .from("products")
        .update({
          rating: calculatedRating,
          reviews: reviewCount || 0,
        })
        .eq("product_id", actualBaseProductId);

      if (productUpdateError) {
        console.error("Error updating product:", productUpdateError);
      } else {
        console.log("✅ Product updated successfully");
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Review submitted successfully",
      review: {
        ...reviewDoc,
        id: reviewResult.id,
        _id: reviewResult.id, // For backward compatibility
      }
    });

  } catch (error: any) {
    console.error("Review submission error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
