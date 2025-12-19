import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { supabase, supabaseAdmin } from "@/lib/supabase"

interface DiscountCode {
  id?: string
  code: string
  description?: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  min_purchase?: number
  max_discount?: number
  valid_from?: Date | null
  valid_until?: Date | null
  usage_limit?: number
  usage_count: number
  is_active: boolean
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

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { code, type, value, minOrderAmount, maxUses, expiresAt, description, buyX, getX, discountPercentage } = await request.json()

    if (!code || !type) {
      return NextResponse.json({ error: "Code and type are required" }, { status: 400 })
    }

    // Validate value only for percentage and fixed types
    if ((type === "percentage" || type === "fixed") && !value) {
      return NextResponse.json({ error: "Value is required for this discount type" }, { status: 400 })
    }

    // For buyXgetX and buyXgetYpercent, validate their specific fields
    if (type === "buyXgetX") {
      if (!buyX || !getX) {
        return NextResponse.json({ error: "Buy X and Get X quantities are required for this discount type" }, { status: 400 })
      }
    } else if (type === "buyXgetYpercent") {
      if (!buyX || !discountPercentage) {
        return NextResponse.json({ error: "Buy X quantity and discount percentage are required for this discount type" }, { status: 400 })
      }
    }

    // Store special types as "percentage" in database, but keep the original type in metadata
    // For buyXgetX and buyXgetYpercent, we'll use a default value of 0 and store metadata separately
    const discountCode: any = {
      code: code.toUpperCase(),
      description: description || null,
      discount_type: (type === "buyXgetX" || type === "buyXgetYpercent") ? "percentage" : type,
      discount_value: (type === "buyXgetX" || type === "buyXgetYpercent") ? 0 : Number(value || 0),
      min_purchase: minOrderAmount ? Number(minOrderAmount) : undefined,
      max_discount: undefined,
      valid_from: undefined,
      valid_until: expiresAt ? new Date(expiresAt) : undefined,
      usage_limit: maxUses ? Number(maxUses) : undefined,
      usage_count: 0,
      is_active: true,
      // Store special type metadata
      buy_x: buyX ? Number(buyX) : undefined,
      get_x: getX ? Number(getX) : undefined,
      discount_percentage: discountPercentage ? Number(discountPercentage) : undefined,
      original_type: type, // Store the original type for reference
    }

    // Use admin client to bypass RLS for discount code creation
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block discount code creation.")
    }

    const { data: result, error } = await client
      .from("discount_codes")
      .insert(discountCode)
      .select()
      .single()

    if (error) {
      console.error("Error creating discount code:", error)
      const errorMessage = error.message || "Failed to create discount code"
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    if (!result) {
      console.error("No result returned from database")
      return NextResponse.json({ error: "Failed to create discount code: No data returned" }, { status: 500 })
    }

    // Transform to expected format (matching GET endpoint format)
    const transformedCode = {
      _id: result.id,
      id: result.id,
      code: result.code,
      // Use original_type if available, otherwise use discount_type
      type: result.original_type || result.discount_type,
      value: result.discount_value,
      minOrderAmount: result.min_purchase,
      maxUses: result.usage_limit,
      currentUses: result.usage_count,
      isActive: result.is_active,
      expiresAt: result.valid_until ? new Date(result.valid_until) : null,
      createdAt: result.created_at ? new Date(result.created_at) : new Date(),
      updatedAt: result.updated_at ? new Date(result.updated_at) : new Date(),
      description: result.description || undefined,
      // Include special type fields
      buyX: result.buy_x,
      getX: result.get_x,
      discountPercentage: result.discount_percentage,
    }

    return NextResponse.json({
      success: true,
      discountCode: transformedCode,
    })
  } catch (error) {
    console.error("Create discount code error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Use admin client to bypass RLS for reading discount codes
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block discount code reading.")
    }

    const { data: codes, error } = await client
      .from("discount_codes")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching discount codes:", error)
      return NextResponse.json({ error: "Failed to fetch discount codes" }, { status: 500 })
    }

    // Transform to expected format
    const transformedCodes = (codes || []).map((code: any) => ({
      _id: code.id, // For backward compatibility
      id: code.id,
      code: code.code,
      type: code.discount_type,
      value: code.discount_value,
      minOrderAmount: code.min_purchase,
      maxUses: code.usage_limit,
      currentUses: code.usage_count,
      isActive: code.is_active,
      expiresAt: code.valid_until ? new Date(code.valid_until) : null,
      createdAt: code.created_at ? new Date(code.created_at) : new Date(),
      updatedAt: code.updated_at ? new Date(code.updated_at) : new Date(),
      description: code.description || undefined,
    }))

    return NextResponse.json(transformedCodes)
  } catch (error) {
    console.error("Get discount codes error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const codeId = searchParams.get("id")

    if (!codeId) {
      return NextResponse.json({ error: "Discount code ID is required" }, { status: 400 })
    }

    const body = await request.json()

    // Use admin client to bypass RLS for discount code updates
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block discount code updates.")
    }

    // If only isActive is being updated (toggle status)
    if (Object.keys(body).length === 1 && body.hasOwnProperty("isActive")) {
      const { data: result, error } = await client
        .from("discount_codes")
        .update({ is_active: body.isActive })
        .eq("id", codeId)
        .select()
        .single()

      if (error) {
        console.error("Error updating discount code status:", error)
        return NextResponse.json({ 
          error: error.message || "Failed to update discount code status" 
        }, { status: 500 })
      }

      // Transform to expected format
      const transformedCode = {
        _id: result.id,
        id: result.id,
        code: result.code,
        type: result.discount_type,
        value: result.discount_value,
        minOrderAmount: result.min_purchase,
        maxUses: result.usage_limit,
        currentUses: result.usage_count,
        isActive: result.is_active,
        expiresAt: result.valid_until ? new Date(result.valid_until) : null,
        createdAt: result.created_at ? new Date(result.created_at) : new Date(),
        updatedAt: result.updated_at ? new Date(result.updated_at) : new Date(),
      }

      return NextResponse.json({
        success: true,
        discountCode: transformedCode,
      })
    }

    // Full update
    const updateData: any = {}

    if (body.code !== undefined) {
      updateData.code = body.code.toUpperCase()
    }
    if (body.type !== undefined) {
      // Store special types as "percentage" in database, but keep original type
      updateData.discount_type = (body.type === "buyXgetX" || body.type === "buyXgetYpercent") ? "percentage" : body.type
      updateData.original_type = body.type
    }
    if (body.value !== undefined) {
      updateData.discount_value = Number(body.value)
    }
    if (body.minOrderAmount !== undefined) {
      updateData.min_purchase = body.minOrderAmount ? Number(body.minOrderAmount) : undefined
    }
    if (body.maxUses !== undefined) {
      updateData.usage_limit = body.maxUses ? Number(body.maxUses) : undefined
    }
    if (body.expiresAt !== undefined) {
      updateData.valid_until = body.expiresAt ? new Date(body.expiresAt) : null
    }
    if (body.isActive !== undefined) {
      updateData.is_active = body.isActive
    }
    if (body.description !== undefined) {
      updateData.description = body.description || null
    }
    // Handle special type fields
    if (body.buyX !== undefined) {
      updateData.buy_x = body.buyX ? Number(body.buyX) : undefined
    }
    if (body.getX !== undefined) {
      updateData.get_x = body.getX ? Number(body.getX) : undefined
    }
    if (body.discountPercentage !== undefined) {
      updateData.discount_percentage = body.discountPercentage ? Number(body.discountPercentage) : undefined
    }

    const { data: result, error } = await client
      .from("discount_codes")
      .update(updateData)
      .eq("id", codeId)
      .select()
      .single()

    if (error) {
      console.error("Error updating discount code:", error)
      const errorMessage = error.message || "Failed to update discount code"
      return NextResponse.json({ 
        error: errorMessage
      }, { status: 500 })
    }

    if (!result) {
      console.error("No result returned from database")
      return NextResponse.json({ error: "Discount code not found after update" }, { status: 404 })
    }

    // Transform to expected format
    const transformedCode = {
      _id: result.id,
      id: result.id,
      code: result.code,
      // Use original_type if available, otherwise use discount_type
      type: result.original_type || result.discount_type,
      value: result.discount_value,
      minOrderAmount: result.min_purchase,
      maxUses: result.usage_limit,
      currentUses: result.usage_count,
      isActive: result.is_active,
      expiresAt: result.valid_until ? new Date(result.valid_until) : null,
      createdAt: result.created_at ? new Date(result.created_at) : new Date(),
      updatedAt: result.updated_at ? new Date(result.updated_at) : new Date(),
      description: result.description || undefined,
      // Include special type fields
      buyX: result.buy_x,
      getX: result.get_x,
      discountPercentage: result.discount_percentage,
    }

    return NextResponse.json({
      success: true,
      discountCode: transformedCode,
    })
  } catch (error) {
    console.error("Update discount code error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const codeId = searchParams.get("id")

    if (!codeId) {
      return NextResponse.json({ error: "Discount code ID is required" }, { status: 400 })
    }

    // Use admin client to bypass RLS for discount code deletion
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block discount code deletion.")
    }

    const { error } = await client
      .from("discount_codes")
      .delete()
      .eq("id", codeId)

    if (error) {
      console.error("Error deleting discount code:", error)
      return NextResponse.json({ 
        error: error.message || "Failed to delete discount code" 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete discount code error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
