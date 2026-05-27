const AVATAR_MAX_DIM = 400
const AVATAR_QUALITY = 0.85

export async function compressAvatarImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > AVATAR_MAX_DIM || height > AVATAR_MAX_DIM) {
        if (width >= height) {
          height = Math.round((height * AVATAR_MAX_DIM) / width)
          width = AVATAR_MAX_DIM
        } else {
          width = Math.round((width * AVATAR_MAX_DIM) / height)
          height = AVATAR_MAX_DIM
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', AVATAR_QUALITY))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target!.result as string)
      reader.readAsDataURL(file)
    }
    img.src = url
  })
}

export function avatarInitials(name?: string | null): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
