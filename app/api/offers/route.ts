import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { supabase, supabaseAdmin } from "@/lib/supabase"

interface Offer {
  id?: string
  title?: string | null
  description: string
  image_url?: string
  link_url?: string
  discount_code?: string
  is_active: boolean
  display_order: number
  created_at?: Date
  updated_at?: Date
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get("id")

    // If ID is provided, return a single offer
    if (id) {
      const { data: offer, error } = await supabase
        .from("offers")
        .select("*")
        .eq("id", id)
        .single()

      if (error || !offer) {
        return NextResponse.json({ error: "Offer not found" }, { status: 404 })
      }

      // Transform to expected format
      return NextResponse.json({
        _id: offer.id, // For backward compatibility
        id: offer.id,
        title: offer.title,
        description: offer.description,
        imageUrl: offer.image_url,
        linkUrl: offer.link_url,
        discountCode: offer.discount_code,
        isActive: offer.is_active,
        priority: offer.display_order,
        expiresAt: null,
        createdAt: offer.created_at ? new Date(offer.created_at) : new Date(),
        updatedAt: offer.updated_at ? new Date(offer.updated_at) : new Date(),
      })
    }

    // Otherwise return all active offers
    const { data: offers, error } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching offers:", error)
      return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 })
    }

    // Transform to expected format
    const transformedOffers = (offers || [])
      .filter((offer: any) => offer && offer.is_active === true) // Ensure only active offers
      .map((offer: any) => ({
        _id: offer.id, // For backward compatibility
        id: offer.id,
        title: offer.title || "",
        description: offer.description || "",
        imageUrl: offer.image_url || null,
        linkUrl: offer.link_url || null,
        discountCode: offer.discount_code || null,
        isActive: offer.is_active === true,
        priority: offer.display_order || 0,
        expiresAt: null,
        createdAt: offer.created_at ? new Date(offer.created_at) : new Date(),
        updatedAt: offer.updated_at ? new Date(offer.updated_at) : new Date(),
      }))

    const response = NextResponse.json(transformedOffers)
    // Add cache headers to prevent stale data in Netlify
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error) {
    console.error("Error fetching offers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
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

    const { title, description, imageUrl, linkUrl, priority, discountCode } = await request.json()

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    }

    const newOffer: Omit<Offer, 'id' | 'created_at' | 'updated_at'> = {
      title: title ? title.trim() : null,
      description: description.trim(),
      image_url: imageUrl || null,
      link_url: linkUrl || null,
      discount_code: discountCode ? discountCode.trim() : null,
      is_active: true,
      display_order: Number(priority) || 0,
    }

    // Use admin client to bypass RLS for offer creation
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block offer creation.")
    }

    const { data: result, error } = await client
      .from("offers")
      .insert(newOffer)
      .select()
      .single()

    if (error) {
      console.error("Error creating offer:", error)
      return NextResponse.json({ error: "Failed to create offer" }, { status: 500 })
    }

    // Note: Email sending to users would require fetching users from Supabase
    // This functionality can be added later if needed

    return NextResponse.json({
      success: true,
      offer: {
        ...result,
        _id: result.id, // For backward compatibility
      },
    })
  } catch (error) {
    console.error("Create offer error:", error)
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
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Offer ID is required" }, { status: 400 })
    }

    const { title, description, imageUrl, linkUrl, priority, isActive, discountCode } = await request.json()

    const updateData: any = {}
    if (title !== undefined) updateData.title = title?.trim() || null
    if (description !== undefined) updateData.description = description.trim()
    if (imageUrl !== undefined) updateData.image_url = imageUrl || null
    if (linkUrl !== undefined) updateData.link_url = linkUrl || null
    if (discountCode !== undefined) updateData.discount_code = discountCode ? discountCode.trim() : null
    if (priority !== undefined) updateData.display_order = Number(priority) || 0
    if (isActive !== undefined) updateData.is_active = isActive

    // Use admin client to bypass RLS for offer update
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block offer update.")
    }

    const { data: updatedOffer, error } = await client
      .from("offers")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error || !updatedOffer) {
      console.error("Error updating offer in Supabase:", error, "updateData:", updateData, "id:", id)
      return NextResponse.json({ error: error?.message || "Offer not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      offer: {
        ...updatedOffer,
        _id: updatedOffer.id, // For backward compatibility
      },
    })
  } catch (error) {
    console.error("Update offer error:", error)
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
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Offer ID is required" }, { status: 400 })
    }

    // Use admin client to bypass RLS for offer deletion
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block offer deletion.")
    }

    const { error } = await client
      .from("offers")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting offer:", error)
      return NextResponse.json({ error: "Offer not found or failed to delete" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Offer deleted successfully" })
  } catch (error) {
    console.error("Delete offer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
