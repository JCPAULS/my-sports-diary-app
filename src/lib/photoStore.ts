import { supabase } from '@/lib/supabase'

const urlCache = new Map<string, { url: string; expiresAt: number }>()
const TTL = 7 * 24 * 60 * 60 // 7 days in seconds

export function isStoragePath(s: string): boolean {
  return !s.startsWith('data:') && !s.startsWith('http')
}

export async function getSignedUrl(path: string): Promise<string> {
  if (!isStoragePath(path)) return path

  const cached = urlCache.get(path)
  if (cached && cached.expiresAt > Date.now() / 1000 + 300) return cached.url

  const { data, error } = await supabase.storage
    .from('game-photos')
    .createSignedUrl(path, TTL)

  if (error || !data?.signedUrl) {
    console.warn('[photoStore] signed URL failed', path, error)
    return path
  }

  urlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() / 1000 + TTL })
  return data.signedUrl
}

export async function uploadPhoto(userId: string, gameId: string, dataUrl: string): Promise<string> {
  const photoId = crypto.randomUUID()
  const path = `${userId}/${gameId}/${photoId}.jpg`

  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'image/jpeg' })

  const { error } = await supabase.storage
    .from('game-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

  if (error) throw error
  return path
}

export async function processPhotoForSave(photo: string, userId: string, gameId: string): Promise<string> {
  if (isStoragePath(photo)) return photo
  return uploadPhoto(userId, gameId, photo)
}

export async function deleteGamePhotos(userId: string, gameId: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from('game-photos')
    .list(`${userId}/${gameId}`)

  if (error || !data?.length) return

  const paths = data.map((f) => `${userId}/${gameId}/${f.name}`)
  await supabase.storage.from('game-photos').remove(paths)
}
