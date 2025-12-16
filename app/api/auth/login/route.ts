import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { supabaseAdmin } from "@/lib/supabase"
import type { User } from "@/lib/models/types"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Use admin client to bypass RLS for authentication
    if (!supabaseAdmin) {
      console.error("Supabase admin client not configured")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Fetch user from Supabase (using admin client to bypass RLS)
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single()

    if (error || !user) {
      console.error("User lookup error:", error)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    })

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }

    return NextResponse.json({
      user: userData,
      token,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
