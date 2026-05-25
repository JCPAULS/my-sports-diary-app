import exifr from 'exifr'
import { findVenueByCoords, getVenueSportHint, type VenueInfo } from '@/lib/venues'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessedPhoto {
  dataUrl: string
  date: string | null
  lat: number | null
  lng: number | null
  venue: VenueInfo | null
  sportHint: string | null
}

export interface ImportGroup {
  photos: ProcessedPhoto[]
  suggestedDate: string | null
  suggestedVenue: VenueInfo | null
  suggestedSportId: string | null
  isUnmatched: boolean
}

// ─── Compression ──────────────────────────────────────────────────────────────

const COMPRESS_MAX_DIM = 1600
const COMPRESS_QUALITY = 0.75

export async function compressFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > COMPRESS_MAX_DIM || height > COMPRESS_MAX_DIM) {
        if (width >= height) { height = Math.round(height * COMPRESS_MAX_DIM / width); width = COMPRESS_MAX_DIM }
        else { width = Math.round(width * COMPRESS_MAX_DIM / height); height = COMPRESS_MAX_DIM }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', COMPRESS_QUALITY))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target!.result as string)
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    }
    img.src = objectUrl
  })
}

// ─── EXIF + compress ──────────────────────────────────────────────────────────

export async function processPhotoFile(file: File): Promise<ProcessedPhoto> {
  const [dataUrl, exifData] = await Promise.all([
    compressFile(file),
    exifr.parse(file, { gps: true }).catch(() => null),
  ])

  let date: string | null = null
  let lat: number | null = null
  let lng: number | null = null

  if (exifData) {
    const dto = exifData.DateTimeOriginal
    if (dto instanceof Date && !isNaN(dto.getTime())) {
      date = [
        dto.getFullYear(),
        String(dto.getMonth() + 1).padStart(2, '0'),
        String(dto.getDate()).padStart(2, '0'),
      ].join('-')
    }
    if (typeof exifData.latitude === 'number') lat = exifData.latitude
    if (typeof exifData.longitude === 'number') lng = exifData.longitude
  }

  const venue = lat !== null && lng !== null ? findVenueByCoords(lat, lng) : null
  const sportHint = venue ? getVenueSportHint(venue.name) : null

  return { dataUrl, date, lat, lng, venue, sportHint }
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

export function groupPhotos(photos: ProcessedPhoto[]): ImportGroup[] {
  const byKey = new Map<string, ProcessedPhoto[]>()
  const unmatched: ProcessedPhoto[] = []

  for (const p of photos) {
    if (!p.date) { unmatched.push(p); continue }
    // Group by date + venue (or just date when no venue matched)
    const key = `${p.date}|${p.venue ? p.venue.name : 'noVenue'}`
    const arr = byKey.get(key) ?? []
    arr.push(p)
    byKey.set(key, arr)
  }

  const groups: ImportGroup[] = []
  for (const [, groupPhotos] of byKey) {
    const first = groupPhotos[0]
    groups.push({
      photos: groupPhotos,
      suggestedDate: first.date,
      suggestedVenue: first.venue,
      suggestedSportId: first.sportHint,
      isUnmatched: false,
    })
  }

  // Most recent first
  groups.sort((a, b) => (b.suggestedDate ?? '') > (a.suggestedDate ?? '') ? 1 : -1)

  if (unmatched.length > 0) {
    groups.push({
      photos: unmatched,
      suggestedDate: null,
      suggestedVenue: null,
      suggestedSportId: null,
      isUnmatched: true,
    })
  }

  return groups
}
