import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import jwt from "jsonwebtoken";

function errorResponse(message: string, status: number = 400) {
  console.error(`API Error [${status}]:`, message);
  return NextResponse.json({ error: message }, { status });
}

// Helper function to get the smallest price from sizes
function getSmallestPrice(sizes: any[]) {
  if (!sizes || sizes.length === 0) return 0;
  
  const prices = sizes.map(size => size.discountedPrice || size.originalPrice || size.price || 0);
  return Math.min(...prices.filter(price => price > 0));
}

// Helper function to transform sizes to match the expected format
function transformSizes(sizes: any[]) {
  if (!sizes || sizes.length === 0) return [];
  
  return sizes.map(size => ({
    size: size.size,
    volume: size.volume,
    originalPrice: size.originalPrice || size.price || 0,
    discountedPrice: size.discountedPrice || size.price || 0,
  }));
}

export async function GET(request: NextRequest) {
  console.log("Favorites API - GET Request Received");

  // Auth check
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    console.log("No Authorization header found");
    return errorResponse("Authorization required", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    console.log("No token found in Authorization header");
    return errorResponse("Authorization required", 401);
  }

  let decoded: { userId: string };
  try {
    console.log("Verifying token...");
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    console.log("Token successfully decoded:", decoded);
  } catch (err) {
    console.error("Token verification failed:", err);
    return errorResponse("Invalid or expired token", 401);
  }

  try {
    // Use admin client to bypass RLS for reading user favorites
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block favorites read.")
    }

    // Fetch user from Supabase
    const { data: user, error: userError } = await client
      .from("users")
      .select("favorites")
      .eq("id", decoded.userId)
      .single();
    
    if (userError || !user) {
      console.log("User not found in database");
      return errorResponse("User not found", 404);
    }

    const favorites: string[] = user.favorites || [];
    console.log(`Found ${favorites.length} favorites for user`);

    if (!favorites.length) {
      console.log("No favorites found - returning empty array");
      return NextResponse.json([]);
    }

    // Fetch product details
    console.log("Fetching favorite products from database...");
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(`
        product_id,
        name,
        sizes,
        images,
        category,
        description,
        rating,
        is_new,
        is_bestseller,
        is_out_of_stock,
        is_gift_package,
        package_price,
        package_original_price,
        gift_package_sizes
      `)
      .in("product_id", favorites);

    if (productsError) {
      console.error("Error fetching products:", productsError);
      return errorResponse("Failed to fetch products", 500);
    }

    console.log(`Found ${products?.length || 0} products matching favorites`);

    // Transform products to match the expected format
    const transformedProducts = (products || []).map((product: any) => ({
      id: product.product_id,
      name: product.name,
      price: product.is_gift_package 
        ? (product.package_price || 0) 
        : getSmallestPrice(product.sizes || []),
      image: product.images && product.images.length > 0 ? product.images[0] : "/placeholder.svg",
      category: product.category,
      ...(product.rating !== undefined ? { rating: product.rating } : {}),
      isNew: product.is_new || false,
      isBestseller: product.is_bestseller || false,
      isOutOfStock: product.is_out_of_stock || false,
      sizes: product.is_gift_package ? [] : transformSizes(product.sizes || []),
      // Gift package fields
      isGiftPackage: product.is_gift_package || false,
      packagePrice: product.package_price || 0,
      packageOriginalPrice: product.package_original_price || 0,
      giftPackageSizes: product.gift_package_sizes || [],
    }));

    // Maintain order
    const productMap = Object.fromEntries(transformedProducts.map((p: any) => [p.id, p]));
    const ordered = favorites.map((id) => productMap[id]).filter(Boolean);

    console.log("Transformed sizes for first product:", ordered[0]?.sizes);
    return NextResponse.json(ordered, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (err) {
    console.error("Database error:", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  console.log("Favorites API - POST Request Received");

  // Auth check
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return errorResponse("Authorization required", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  let decoded: { userId: string };
  
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  } catch (err) {
    return errorResponse("Invalid or expired token", 401);
  }

  try {
    const { productId } = await request.json();
    if (!productId) {
      return errorResponse("productId required", 400);
    }

    // Use admin client to bypass RLS for all operations
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block favorites operations.")
    }

    // Fetch user
    const { data: user, error: userError } = await client
      .from("users")
      .select("favorites")
      .eq("id", decoded.userId)
      .single();
    
    if (userError || !user) {
      console.error("Error fetching user:", userError);
      return errorResponse("User not found", 404);
    }

    const favorites: string[] = user.favorites || [];
    if (!favorites.includes(productId)) {
      const newFavorites = [...favorites, productId];
      
      const { error: updateError } = await client
        .from("users")
        .update({ favorites: newFavorites })
        .eq("id", decoded.userId);

      if (updateError) {
        console.error("Error updating favorites:", updateError);
        return errorResponse("Failed to update favorites", 500);
      }

      console.log(`Added product ${productId} to favorites`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in POST favorites:", err);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest) {
  console.log("Favorites API - DELETE Request Received");

  // Auth check
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return errorResponse("Authorization required", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  let decoded: { userId: string };
  
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  } catch (err) {
    return errorResponse("Invalid or expired token", 401);
  }

  try {
    const { productId } = await request.json();
    if (!productId) {
      return errorResponse("productId required", 400);
    }

    // Use admin client to bypass RLS for all operations
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block favorites operations.")
    }

    // Fetch user
    const { data: user, error: userError } = await client
      .from("users")
      .select("favorites")
      .eq("id", decoded.userId)
      .single();
    
    if (userError || !user) {
      console.error("Error fetching user:", userError);
      return errorResponse("User not found", 404);
    }

    const favorites: string[] = user.favorites || [];
    const newFavorites = favorites.filter((id) => id !== productId);

    const { error: updateError } = await client
      .from("users")
      .update({ favorites: newFavorites })
      .eq("id", decoded.userId);

    if (updateError) {
      console.error("Error updating favorites:", updateError);
      return errorResponse("Failed to update favorites", 500);
    }
    
    console.log(`Removed product ${productId} from favorites`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in DELETE favorites:", err);
    return errorResponse("Internal server error", 500);
  }
}
