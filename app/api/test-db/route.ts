import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  console.log("🧪 [API] Database test endpoint called")

  try {
    // Test basic connection by querying a table
    const { data: testData, error: testError } = await supabase
      .from("products")
      .select("id")
      .limit(1)

    if (testError) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          details: testError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Comprehensive database tests
    const tests: any = {
      connection: true,
      tables: {},
      queries: {},
    }

    // Test tables - get counts for each table
    console.log("📋 [Test] Checking tables...")
    
    const tableTests = await Promise.all([
      supabase.from("users").select("*", { count: 'exact', head: true }),
      supabase.from("products").select("*", { count: 'exact', head: true }),
      supabase.from("orders").select("*", { count: 'exact', head: true }),
      supabase.from("reviews").select("*", { count: 'exact', head: true }),
      supabase.from("offers").select("*", { count: 'exact', head: true }),
      supabase.from("discount_codes").select("*", { count: 'exact', head: true }),
      supabase.from("contact_messages").select("*", { count: 'exact', head: true }),
    ])

    tests.tables = {
      users: { count: tableTests[0].count || 0, accessible: !tableTests[0].error },
      products: { count: tableTests[1].count || 0, accessible: !tableTests[1].error },
      orders: { count: tableTests[2].count || 0, accessible: !tableTests[2].error },
      reviews: { count: tableTests[3].count || 0, accessible: !tableTests[3].error },
      offers: { count: tableTests[4].count || 0, accessible: !tableTests[4].error },
      discount_codes: { count: tableTests[5].count || 0, accessible: !tableTests[5].error },
      contact_messages: { count: tableTests[6].count || 0, accessible: !tableTests[6].error },
    }

    // Test products collection
    console.log("🧴 [Test] Testing products...")
    const { count: totalProducts } = await supabase
      .from("products")
      .select("*", { count: 'exact', head: true })

    const { count: activeProducts } = await supabase
      .from("products")
      .select("*", { count: 'exact', head: true })
      .eq("is_active", true)

    const { count: winterProducts } = await supabase
      .from("products")
      .select("*", { count: 'exact', head: true })
      .eq("category", "winter")
      .eq("is_active", true)

    const { count: summerProducts } = await supabase
      .from("products")
      .select("*", { count: 'exact', head: true })
      .eq("category", "summer")
      .eq("is_active", true)

    const { count: fallProducts } = await supabase
      .from("products")
      .select("*", { count: 'exact', head: true })
      .eq("category", "fall")
      .eq("is_active", true)

    const productStats = {
      total: totalProducts || 0,
      active: activeProducts || 0,
      byCategory: {
        winter: winterProducts || 0,
        summer: summerProducts || 0,
        fall: fallProducts || 0,
      },
    }

    // Sample products
    const { data: sampleProducts } = await supabase
      .from("products")
      .select("product_id, name, category, price")
      .eq("is_active", true)
      .limit(3)

    tests.queries.products = {
      stats: productStats,
      samples: sampleProducts || [],
    }

    // Test orders collection
    console.log("📦 [Test] Testing orders...")
    const { count: totalOrders } = await supabase
      .from("orders")
      .select("*", { count: 'exact', head: true })

    tests.queries.orders = {
      total: totalOrders || 0,
    }

    // Test users collection
    console.log("👥 [Test] Testing users...")
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: 'exact', head: true })

    tests.queries.users = {
      total: totalUsers || 0,
    }

    return NextResponse.json({
      success: true,
      database: "Supabase (PostgreSQL)",
      timestamp: new Date().toISOString(),
      tests,
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/\/.*@/, "//***:***@"),
        configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    })
  } catch (error: any) {
    console.error("❌ [API] Database test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Database test failed",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
