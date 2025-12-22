import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const uploadImage = async (image: string, folder: string) => {
  const timestamp = new Date().toISOString()
  const fileName = `${timestamp}.webp`
  const filePath = `${folder}/${fileName}`

  const byteCharacters = atob(image.split(',')[1])
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: 'image/webp' })

  const { data, error } = await supabase.storage
    .from('images')
    .upload(filePath, blob, {
      contentType: 'image/webp',
      upsert: false,
    })

  if (error) {
    throw error
  }

  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath)

  return publicUrl
}
