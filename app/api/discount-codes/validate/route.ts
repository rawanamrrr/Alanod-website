import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { OrderItem } from "@/lib/models/types"

export async function POST(request: NextRequest) {
  try {
    const { code, orderAmount, items }: { code: string, orderAmount: number, items: OrderItem[] } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Discount code is required" }, { status: 400 })
    }

    if (items && !Array.isArray(items)) {
      return NextResponse.json({ error: "Items must be an array" }, { status: 400 })
    }

    // Find active discount code (case insensitive)
    const { data: discountCodes } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("is_active", true)
      .ilike("code", code.toUpperCase())

    const discountCode = discountCodes && discountCodes.length > 0 ? discountCodes[0] : null

    if (!discountCode) {
      return NextResponse.json({ error: "Invalid discount code" }, { status: 400 })
    }

    // Check expiration
    if (discountCode.valid_until && new Date() > new Date(discountCode.valid_until)) {
      return NextResponse.json({ error: "Discount code has expired" }, { status: 400 })
    }

    // Check usage limits
    if (discountCode.usage_limit && discountCode.usage_count >= discountCode.usage_limit) {
      return NextResponse.json({ error: "Discount code usage limit reached" }, { status: 400 })
    }

    // Check minimum order amount
    if (discountCode.min_purchase && orderAmount < discountCode.min_purchase) {
      const remaining = discountCode.min_purchase - orderAmount
      return NextResponse.json(
        { 
          error: `Add ${remaining.toFixed(2)} more to your cart to apply this discount (minimum order: ${discountCode.min_purchase})` 
        },
        { status: 400 }
      )
    }

    // Calculate discount
    let discountAmount = 0
    let discountDetails = {}

    if (discountCode.discount_type === "percentage") {
      discountAmount = (orderAmount * discountCode.discount_value) / 100
      // Apply max discount if specified
      if (discountCode.max_discount) {
        discountAmount = Math.min(discountAmount, discountCode.max_discount)
      }
      discountDetails = { percentage: discountCode.discount_value }
    } 
    else if (discountCode.discount_type === "fixed") {
      discountAmount = Math.min(discountCode.discount_value, orderAmount)
      discountDetails = { fixedAmount: discountCode.discount_value }
    }

    // If we reach here and no discount was calculated, the discount type is not supported
    if (discountAmount === 0) {
      return NextResponse.json(
        { error: "This discount code type is not supported" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      discountAmount,
      code: discountCode.code,
      type: discountCode.discount_type,
      value: discountCode.discount_value,
      discountDetails,
    })

  } catch (error) {
    console.error("Discount validation error:", error)
    return NextResponse.json(
      { error: "An error occurred while validating discount code" },
      { status: 500 }
    )
  }
}
