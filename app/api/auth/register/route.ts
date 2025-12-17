import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import type { User } from "@/lib/models/types"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Use admin client to bypass RLS for registration
    const client = supabaseAdmin || supabase
    
    if (!supabaseAdmin) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using anon key. RLS policies may block registration.")
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await client
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (checkError) {
      console.error("Error checking existing user:", checkError)
      return NextResponse.json({ error: "Failed to check user existence" }, { status: 500 })
    }

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const { data: newUser, error } = await client
      .from("users")
      .insert({
        email,
        password: hashedPassword,
        name,
        role: "user",
      })
      .select()
      .single()

    if (error) {
      console.error("Registration error:", error)
      // Return the actual error message from Supabase
      const errorMessage = error.message || "Failed to create user"
      // Check for common RLS errors
      if (errorMessage.includes("new row violates row-level security") || errorMessage.includes("RLS")) {
        return NextResponse.json({ 
          error: "Database configuration error. Please contact support." 
        }, { status: 500 })
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

    if (!newUser) {
      console.error("Registration error: No user returned")
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    const token = jwt.sign({ userId: newUser.id, email, role: "user" }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    })

    const userData = {
      id: newUser.id,
      email,
      name,
      role: "user" as const,
    }

    return NextResponse.json({
      user: userData,
      token,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
