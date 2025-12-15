import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { supabase } from "@/lib/supabase"
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

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        email,
        password: hashedPassword,
        name,
        role: "user",
      })
      .select()
      .single()

    if (error || !newUser) {
      console.error("Registration error:", error)
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
