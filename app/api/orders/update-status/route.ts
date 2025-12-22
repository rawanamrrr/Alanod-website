import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import jwt from "jsonwebtoken";

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

    const { orderId, status } = await request.json()

    if (!orderId || !status) {
      return NextResponse.json({ error: "Order ID and status are required" }, { status: 400 })
    }

    // Get the current order to check previous status
    const client = supabaseAdmin || supabase

    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block order updates.")
    }

    const { data: currentOrder } = await client
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .single()

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const previousStatus = currentOrder.status

    // Note: Balance tracking would need a separate balance table if required
    // For now, we'll skip balance updates as it's not in the core schema

    // Update the order status
    const { data: updatedOrder, error } = await client
      .from("orders")
      .update({ status: status })
      .eq("order_id", orderId)
      .select()
      .single()

    if (error || !updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Transform order for response
    const transformedOrder = {
      _id: updatedOrder.id,
      id: updatedOrder.order_id,
      userId: updatedOrder.user_id,
      items: updatedOrder.items || [],
      total: updatedOrder.total || 0,
      status: updatedOrder.status || 'pending',
      shippingAddress: updatedOrder.shipping_address || {},
      paymentMethod: updatedOrder.payment_method || 'cod',
      paymentDetails: updatedOrder.payment_details,
      discountCode: updatedOrder.discount_code,
      discountAmount: updatedOrder.discount_amount || 0,
      createdAt: updatedOrder.created_at ? new Date(updatedOrder.created_at) : new Date(),
      updatedAt: updatedOrder.updated_at ? new Date(updatedOrder.updated_at) : new Date(),
    }

    // Send order update email
    try {
      const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.alanoudalqadi.com'}/api/send-order-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: transformedOrder,
          previousStatus: previousStatus,
          newStatus: status
        })
      })

      if (updateResponse.ok) {
        console.log(`✅ Order update email sent for order ${orderId}`)
      } else {
        console.error(`❌ Failed to send order update email for order ${orderId}`)
      }
    } catch (emailError) {
      console.error("❌ Error sending order update email:", emailError)
    }

    return NextResponse.json({ 
      message: "Order status updated successfully",
      order: transformedOrder 
    })
  } catch (error) {
    console.error("Update order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
