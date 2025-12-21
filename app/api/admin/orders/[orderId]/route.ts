import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import type { Order } from "@/lib/models/types"

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { orderId } = await params

    // Use admin client to bypass RLS for reading orders
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block order reading.")
    }

    console.log("🔍 [API] Looking for order with ID:", orderId)

    // Try both order_id and id fields
    let { data: order, error } = await client
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle()

    // If not found by order_id, try by id
    if (error || !order) {
      console.log("⚠️ [API] Order not found by order_id, trying by id...")
      const result = await client
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle()
      
      if (result.error) {
        console.error("❌ [API] Error fetching order:", result.error)
        return NextResponse.json({ error: "Order not found" }, { status: 404 })
      }
      
      order = result.data
      error = result.error
    }

    if (!order) {
      console.error("❌ [API] Order not found with ID:", orderId)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    console.log("✅ [API] Order found:", order.order_id || order.id)

    // Transform to expected format
    const transformedOrder = {
      _id: order.id, // For backward compatibility
      id: order.order_id,
      userId: order.user_id,
      items: order.items || [],
      total: order.total || 0,
      status: order.status || 'pending',
      shippingAddress: order.shipping_address || {},
      paymentMethod: order.payment_method || 'cod',
      paymentDetails: order.payment_details,
      discountCode: order.discount_code,
      discountAmount: order.discount_amount || 0,
      createdAt: order.created_at ? new Date(order.created_at) : new Date(),
      updatedAt: order.updated_at ? new Date(order.updated_at) : new Date(),
    }

    return NextResponse.json(transformedOrder)
  } catch (error) {
    console.error("Get admin order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { orderId } = await params
    const { status } = await request.json()

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block order updates.")
    }

    // Get the current order to check previous status
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
    // Skipping balance updates for now as it's not in the core schema

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

    // Transform order for response and email
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { orderId } = await params
    const { status } = await request.json()

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block order updates.")
    }

    // Get the current order to check previous status
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
    // Skipping balance updates for now as it's not in the core schema

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

    // If status is 'delivered', send review reminder emails for each product
    if (status === 'delivered') {
      try {
        for (const item of updatedOrder.items || []) {
          // Get product details (use admin client for consistency)
          const { data: product } = await client
            .from("products")
            .select("*")
            .eq("product_id", item.productId || item.id)
            .single()
          
          if (product) {
            const reviewReminderResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.alanoudalqadi.com'}/api/send-review-reminder`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                order: transformedOrder,
                product: {
                  id: product.product_id,
                  name: product.name,
                  images: product.images,
                }
              })
            })

            if (reviewReminderResponse.ok) {
              console.log(`✅ Review reminder email sent for product ${product.name}`)
            } else {
              console.error(`❌ Failed to send review reminder email for product ${product.name}`)
            }
          }
        }
      } catch (reviewEmailError) {
        console.error("❌ Error sending review reminder emails:", reviewEmailError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Order status updated successfully",
      order: transformedOrder
    })

  } catch (error) {
    console.error("Update admin order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
