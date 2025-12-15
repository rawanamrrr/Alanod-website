import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { supabase } from "@/lib/supabase"

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

    const { data: result, error } = await supabase
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

    const { data: codes, error } = await supabase
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
