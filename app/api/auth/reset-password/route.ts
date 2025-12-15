import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import type { User } from "@/lib/models/types"

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Verify token
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (error) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", decoded.userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update password
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", decoded.userId)

    if (updateError) {
      console.error("Error updating password:", updateError)
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
    }

    return NextResponse.json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
