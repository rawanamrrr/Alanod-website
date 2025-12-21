import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/models/types";

const validCategories = ["winter", "summer", "fall"] as const;
type ValidCategory = typeof validCategories[number];

// Transform Supabase product to match expected format
const transformProduct = (product: any): Product => {
  return {
    id: product.product_id,
    product_id: product.product_id,
    name: product.name,
    description: product.description,
    longDescription: product.long_description,
    price: product.price || 0,
    beforeSalePrice: product.before_sale_price,
    afterSalePrice: product.after_sale_price,
    sizes: product.sizes || [],
    images: product.images || [],
    rating: product.rating || 0,
    reviews: product.reviews || 0,
    notes: product.notes || { top: [], middle: [], base: [] },
    category: product.category,
    isNew: product.is_new || false,
    isBestseller: product.is_bestseller || false,
    isActive: product.is_active !== false,
    isOutOfStock: product.is_out_of_stock || false,
    isGiftPackage: product.is_gift_package || false,
    packagePrice: product.package_price,
    packageOriginalPrice: product.package_original_price,
    giftPackageSizes: product.gift_package_sizes || [],
    createdAt: product.created_at ? new Date(product.created_at) : new Date(),
    updatedAt: product.updated_at ? new Date(product.updated_at) : new Date(),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; productId: string }> }
) {
  try {
    const { category, productId } = await params;

    // Validate category
    if (!validCategories.includes(category as ValidCategory)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    // Query product from Supabase
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("category", category)
      .eq("product_id", productId)
      .eq("is_active", true)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Return response
    return NextResponse.json(transformProduct(product), {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
