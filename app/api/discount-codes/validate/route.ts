import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import type { OrderItem } from "@/lib/models/types"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    let userId = "guest"

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
        userId = decoded.userId
      } catch (error) {
      }
    }

    const client = supabaseAdmin || supabase

    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block discount validation.")
    }

    const { code, orderAmount, items, email }: { code: string, orderAmount: number, items: OrderItem[], email?: string } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Discount code is required" }, { status: 400 })
    }

    if (items && !Array.isArray(items)) {
      return NextResponse.json({ error: "Items must be an array" }, { status: 400 })
    }

    // Find active discount code (case insensitive)
    const { data: discountCodes } = await client
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
    if (discountCode.usage_limit) {
      if (userId !== "guest") {
        const { count: userUsageCount, error: usageError } = await client
          .from("orders")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", userId)
          .eq("discount_code", discountCode.code)

        if (usageError) {
          console.error("Error checking discount code usage for user:", usageError)
          return NextResponse.json(
            { error: "Failed to validate discount code" },
            { status: 500 }
          )
        }

        if ((userUsageCount || 0) >= discountCode.usage_limit) {
          return NextResponse.json(
            { error: `You have already used this discount code ${discountCode.usage_limit} times.` },
            { status: 400 }
          )
        }
      } else if (email) {
        const { count: guestUsageCount, error: guestUsageError } = await client
          .from("orders")
          .select("*", { count: 'exact', head: true })
          .contains("shipping_address", { email })
          .eq("discount_code", discountCode.code)

        if (guestUsageError) {
          console.error("Error checking discount code usage for guest:", guestUsageError)
          return NextResponse.json(
            { error: "Failed to validate discount code" },
            { status: 500 }
          )
        }

        if ((guestUsageCount || 0) >= discountCode.usage_limit) {
          return NextResponse.json(
            { error: `This email has already used this discount code ${discountCode.usage_limit} times.` },
            { status: 400 }
          )
        }
      }
    }

    // Check minimum order amount
    if (discountCode.min_purchase && orderAmount < discountCode.min_purchase) {
      const remaining = discountCode.min_purchase - orderAmount
      return NextResponse.json(
        {
          error: "MIN_ORDER_AMOUNT",
          minOrderAmount: discountCode.min_purchase,
          minOrderRemaining: remaining,
        },
        { status: 400 }
      )
    }

    // Get the actual discount type (use original_type if available, otherwise discount_type)
    const actualType = discountCode.original_type || discountCode.discount_type

    // Calculate discount
    let discountAmount = 0
    let discountDetails = {}

    if (actualType === "percentage" || (discountCode.discount_type === "percentage" && !discountCode.original_type)) {
      discountAmount = (orderAmount * discountCode.discount_value) / 100
      // Apply max discount if specified
      if (discountCode.max_discount) {
        discountAmount = Math.min(discountAmount, discountCode.max_discount)
      }
      discountDetails = { percentage: discountCode.discount_value }
    } 
    else if (actualType === "fixed" || discountCode.discount_type === "fixed") {
      discountAmount = Math.min(discountCode.discount_value, orderAmount)
      discountDetails = { fixedAmount: discountCode.discount_value }
    }
    else if (actualType === "buyXgetX") {
      // Buy X Get X Free discount
      if (!items || items.length === 0) {
        return NextResponse.json(
          { error: "Add items to your cart to apply this discount" },
          { status: 400 }
        )
      }

      const buyX = discountCode.buy_x || 0
      const getX = discountCode.get_x || 0

      if (!buyX || !getX) {
        return NextResponse.json(
          { error: "Invalid discount code configuration" },
          { status: 400 }
        )
      }

      // Calculate total quantity in cart
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

      // Check if cart meets the buyX requirement
      if (totalQuantity < buyX) {
        const needed = buyX - totalQuantity
        return NextResponse.json(
          {
            error: `Add ${needed} more item${needed > 1 ? 's' : ''} to your cart to apply this discount (Buy ${buyX} Get ${getX} Free)`,
            neededItems: needed,
            buyX,
            getX,
          },
          { status: 400 }
        )
      }

      // Calculate how many free items the customer gets
      const setsOfBuyX = Math.floor(totalQuantity / buyX)
      const freeItemsCount = setsOfBuyX * getX

      // Find the cheapest items to make free
      const sortedItems = [...items]
        .flatMap(item => 
          Array(item.quantity || 1).fill(null).map(() => ({
            price: item.price || 0,
            name: item.name || '',
            id: item.id || '',
          }))
        )
        .sort((a, b) => a.price - b.price)

      // Calculate discount as the sum of the cheapest items (up to freeItemsCount)
      discountAmount = sortedItems
        .slice(0, freeItemsCount)
        .reduce((sum, item) => sum + item.price, 0)

      discountDetails = {
        buyX,
        getX,
        freeItemsCount,
        type: "buyXgetX"
      }
    }
    else if (actualType === "buyXgetYpercent") {
      // Buy X Get Y% Off on next item discount
      if (!items || items.length === 0) {
        return NextResponse.json(
          { error: "Add items to your cart to apply this discount" },
          { status: 400 }
        )
      }

      const buyX = discountCode.buy_x || 0
      const discountPercentage = discountCode.discount_percentage || 0

      if (!buyX || !discountPercentage) {
        return NextResponse.json(
          { error: "Invalid discount code configuration" },
          { status: 400 }
        )
      }

      // Calculate total quantity in cart
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

      // Check if cart meets the buyX requirement
      if (totalQuantity < buyX) {
        const needed = buyX - totalQuantity
        return NextResponse.json(
          {
            error: `Add ${needed} more item${needed > 1 ? 's' : ''} to get ${discountPercentage}% off on the next item (Buy ${buyX} Get ${discountPercentage}% Off)`,
            neededItems: needed,
            buyX,
            discountPercentage,
          },
          { status: 400 }
        )
      }

      // Find the cheapest item (next item after buying X)
      const sortedItems = [...items]
        .flatMap(item => 
          Array(item.quantity || 1).fill(null).map(() => ({
            price: item.price || 0,
            name: item.name || '',
            id: item.id || '',
          }))
        )
        .sort((a, b) => a.price - b.price)

      // Apply discount to the cheapest item (the "next" item)
      if (sortedItems.length > 0) {
        const cheapestItemPrice = sortedItems[0].price
        discountAmount = (cheapestItemPrice * discountPercentage) / 100
      }

      discountDetails = {
        buyX,
        discountPercentage,
        type: "buyXgetYpercent"
      }
    }

    // If we reach here and no discount was calculated, the discount type is not supported
    if (discountAmount === 0 && actualType !== "buyXgetX" && actualType !== "buyXgetYpercent") {
      return NextResponse.json(
        { error: "This discount code type is not supported" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      discountAmount,
      code: discountCode.code,
      type: actualType, // Return the actual type (buyXgetX, buyXgetYpercent, etc.)
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
