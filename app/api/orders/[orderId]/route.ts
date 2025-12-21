import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { supabase } from "@/lib/supabase"
import type { Order } from "@/lib/models/types"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Only admins can update order status
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { status } = await request.json()
    const { orderId } = await params

    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("order_id", orderId)
      .select()
      .single()

    if (error || !updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Return order in expected format
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

    return NextResponse.json({ success: true, order: transformedOrder })
  } catch (error) {
    console.error("Update order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
