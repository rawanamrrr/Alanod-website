import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const getAuthToken = (): string | null => {
  const authDataRaw = typeof window !== "undefined" ? localStorage.getItem("sense_auth") : null
  if (!authDataRaw) return null
  try {
    const parsed = JSON.parse(authDataRaw)
    return parsed?.token || null
  } catch {
    return null
  }
}

export const uploadImage = async (image: string, folder: string) => {
  const token = getAuthToken()

  if (!token) {
    throw new Error("Not authenticated")
  }

  const res = await fetch("/api/admin/upload-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageBase64: image, folder }),
  })

  if (!res.ok) {
    let message = "Image upload failed"
    try {
      const data = await res.json()
      message = data?.error || message
    } catch {}
    throw new Error(message)
  }

  const data = await res.json()
  return data.publicUrl as string
}

export const convertImageFileToWebP = async (
  file: File,
  opts?: {
    maxDimension?: number
    quality?: number
  },
) => {
  const maxDimension = opts?.maxDimension ?? 1000
  const quality = opts?.quality ?? 0.6

  if (typeof window === "undefined") {
    return file
  }

  if (!file.type.startsWith("image/")) {
    return file
  }

  if (file.type === "image/webp") {
    return file
  }

  const imageBitmap = await createImageBitmap(file)
  
  // For mobile, we can be more aggressive with resizing
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768
  const effectiveMaxDim = isMobile ? Math.min(maxDimension, 800) : maxDimension
  
  const scale = Math.min(1, effectiveMaxDim / Math.max(imageBitmap.width, imageBitmap.height))

  const width = Math.max(1, Math.round(imageBitmap.width * scale))
  const height = Math.max(1, Math.round(imageBitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    return file
  }

  ctx.drawImage(imageBitmap, 0, 0, width, height)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality)
  })

  if (!blob) {
    return file
  }

  const baseName = file.name.replace(/\.[^.]+$/, "")
  return new File([blob], `${baseName}.webp`, { type: "image/webp" })
}

export const uploadImageFile = async (file: File, folder: string) => {
  const token = getAuthToken()

  if (!token) {
    throw new Error("Not authenticated")
  }

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "images"

  const extMatch = file.name?.match(/\.([a-zA-Z0-9]+)$/)
  const ext = (extMatch?.[1] || (file.type === "image/webp" ? "webp" : "webp")).toLowerCase()

  try {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now()
    const signRes = await fetch("/api/admin/upload-image/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ folder, ext }),
    })

    const t1 = typeof performance !== "undefined" ? performance.now() : Date.now()

    if (!signRes.ok) {
      let message = "Failed to sign upload"
      try {
        const data = await signRes.json()
        message = data?.error || message
      } catch {}
      throw new Error(message)
    }

    const signed = await signRes.json()
    const filePath = signed.filePath as string
    const signedToken = signed.token as string

    if (!filePath || !signedToken) {
      throw new Error("Signed upload data missing")
    }

    const t2 = typeof performance !== "undefined" ? performance.now() : Date.now()

    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(filePath, signedToken, file, {
      contentType: file.type || "application/octet-stream",
    })

    const t3 = typeof performance !== "undefined" ? performance.now() : Date.now()

    if (error) {
      throw error
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath)

    const t4 = typeof performance !== "undefined" ? performance.now() : Date.now()
    console.log(
      "✅ Signed upload",
      {
        filePath,
        sizeKb: Math.round(file.size / 1024),
        signMs: Math.round(t1 - t0),
        uploadMs: Math.round(t3 - t2),
        publicUrlMs: Math.round(t4 - t3),
      },
    )

    return publicUrl as string
  } catch (e) {
    console.warn("⚠️ Signed upload failed, falling back to server upload", e)
  }

  const form = new FormData()
  form.append("file", file)
  form.append("folder", folder)

  const res = await fetch("/api/admin/upload-image", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  })

  if (!res.ok) {
    let message = "Image upload failed"
    try {
      const data = await res.json()
      message = data?.error || message
    } catch {}
    throw new Error(message)
  }

  const data = await res.json()
  return data.publicUrl as string
}
