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

    const { code, type, value, minOrderAmount, maxUses, expiresAt, description } = await request.json()

    if (!code || !type) {
      return NextResponse.json({ error: "Code and type are required" }, { status: 400 })
    }

    if (type !== "percentage" && type !== "fixed") {
      return NextResponse.json({ error: "Only percentage and fixed discount types are supported" }, { status: 400 })
    }

    if (!value) {
      return NextResponse.json({ error: "Value is required for this discount type" }, { status: 400 })
    }

    const discountCode: Omit<DiscountCode, 'id' | 'created_at' | 'updated_at'> = {
      code: code.toUpperCase(),
      description: description || null,
      discount_type: type,
      discount_value: Number(value),
      min_purchase: minOrderAmount ? Number(minOrderAmount) : undefined,
      max_discount: undefined,
      valid_from: undefined,
      valid_until: expiresAt ? new Date(expiresAt) : undefined,
      usage_limit: maxUses ? Number(maxUses) : undefined,
      usage_count: 0,
      is_active: true,
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
      return NextResponse.json({ error: "Failed to create discount code" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      discountCode: {
        ...result,
        _id: result.id, // For backward compatibility
      },
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
    const transformedCodes = (codes || []).map(code => ({
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
    const updateData: Partial<DiscountCode> = {}

    if (body.code !== undefined) {
      updateData.code = body.code.toUpperCase()
    }
    if (body.type !== undefined) {
      updateData.discount_type = body.type
    }
    if (body.value !== undefined) {
      updateData.discount_value = Number(body.value)
    }
    if (body.minOrderAmount !== undefined) {
      updateData.min_purchase = body.minOrderAmount ? Number(body.minOrderAmount) : null
    }
    if (body.maxUses !== undefined) {
      updateData.usage_limit = body.maxUses ? Number(body.maxUses) : null
    }
    if (body.expiresAt !== undefined) {
      updateData.valid_until = body.expiresAt ? new Date(body.expiresAt) : null
    }
    if (body.isActive !== undefined) {
      updateData.is_active = body.isActive
    }

    const { data: result, error } = await client
      .from("discount_codes")
      .update(updateData)
      .eq("id", codeId)
      .select()
      .single()

    if (error) {
      console.error("Error updating discount code:", error)
      return NextResponse.json({ 
        error: error.message || "Failed to update discount code" 
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
