import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"

const jsonError = (message: string, status: number) => NextResponse.json({ error: message }, { status })

export async function POST(request: NextRequest) {
  try {
    const startedAt = Date.now()
    if (!supabaseAdmin) {
      return jsonError("Server configuration error", 500)
    }

    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return jsonError("Authorization required", 401)
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (decoded.role !== "admin") {
      return jsonError("Admin access required", 403)
    }

    const body = await request.json()
    const folder = (body?.folder as string | undefined) ?? "products"
    const ext = (body?.ext as string | undefined) ?? "webp"

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "images"

    const timestamp = new Date().toISOString()
    const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "webp"
    const id = crypto.randomUUID()
    const filePath = `${folder}/${timestamp}-${id}.${safeExt}`

    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(filePath)

    if (error) {
      return jsonError(error.message, 400)
    }

    console.log("✍️ [upload-image/sign]", { durationMs: Date.now() - startedAt, filePath })

    return NextResponse.json({ ...data, bucket, filePath })
  } catch (e: any) {
    const message = typeof e?.message === "string" ? e.message : "Internal server error"
    return jsonError(message, 500)
  }
}
