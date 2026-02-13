import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"

const jsonError = (message: string, status: number) => {
  return NextResponse.json({ error: message }, { status })
}

const base64ToBuffer = (base64: string) => {
  const commaIdx = base64.indexOf(",")
  const pureBase64 = commaIdx >= 0 ? base64.slice(commaIdx + 1) : base64
  return Buffer.from(pureBase64, "base64")
}

const inferExtension = (fileName?: string | null, contentType?: string | null) => {
  const safeName = fileName?.trim()
  const dotIdx = safeName ? safeName.lastIndexOf(".") : -1
  if (safeName && dotIdx > -1 && dotIdx < safeName.length - 1) {
    return safeName.slice(dotIdx + 1).toLowerCase()
  }

  const safeType = contentType?.toLowerCase() || ""
  if (safeType === "image/webp") return "webp"
  if (safeType === "image/png") return "png"
  if (safeType === "image/jpeg" || safeType === "image/jpg") return "jpg"
  if (safeType === "image/gif") return "gif"
  return "webp"
}

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

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "images"

    let folder = "products"
    let contentType = "image/webp"
    let originalName: string | null = null
    let buffer: Buffer | null = null

    const requestContentType = request.headers.get("content-type") || ""

    if (requestContentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file") as File | null
      const folderValue = form.get("folder")
      if (typeof folderValue === "string" && folderValue.trim()) {
        folder = folderValue.trim()
      }

      if (!file) {
        return jsonError("file is required", 400)
      }

      originalName = file.name
      contentType = file.type || contentType
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)

      console.log("📦 [upload-image] multipart", {
        sizeKb: Math.round(buffer.byteLength / 1024),
        type: contentType,
        name: originalName,
      })
    } else {
      const body = await request.json()
      const imageBase64 = body?.imageBase64 as string | undefined
      folder = (body?.folder as string | undefined) ?? folder

      if (!imageBase64) {
        return jsonError("imageBase64 is required", 400)
      }

      buffer = base64ToBuffer(imageBase64)
      contentType = "image/webp"
      originalName = null

      console.log("📦 [upload-image] json", {
        sizeKb: Math.round(buffer.byteLength / 1024),
        type: contentType,
      })
    }

    const timestamp = new Date().toISOString()
    const ext = inferExtension(originalName, contentType)
    const id = crypto.randomUUID()
    const fileName = `${timestamp}-${id}.${ext}`
    const filePath = `${folder}/${fileName}`

    const { error } = await supabaseAdmin.storage.from(bucket).upload(filePath, buffer, {
      contentType,
      upsert: true,
    })

    if (error) {
      return jsonError(error.message, 400)
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath)

    const durationMs = Date.now() - startedAt
    console.log("✅ [upload-image] done", { durationMs, filePath })
    return NextResponse.json({ publicUrl, filePath, bucket })
  } catch (e: any) {
    const message = typeof e?.message === "string" ? e.message : "Internal server error"
    return jsonError(message, 500)
  }
}
