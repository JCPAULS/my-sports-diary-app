import exifr from 'exifr'

export interface PhotoMeta {
  date: string | null   // YYYY-MM-DD parsed from DateTimeOriginal
  lat: number | null    // decimal degrees, null if GPS unavailable
  lng: number | null
}

export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    const data = await exifr.parse(file, { gps: true })
    if (!data) return { date: null, lat: null, lng: null }

    let date: string | null = null
    const dto = data.DateTimeOriginal
    if (dto instanceof Date && !isNaN(dto.getTime())) {
      date = [
        dto.getFullYear(),
        String(dto.getMonth() + 1).padStart(2, '0'),
        String(dto.getDate()).padStart(2, '0'),
      ].join('-')
    }

    const lat = typeof data.latitude === 'number' ? data.latitude : null
    const lng = typeof data.longitude === 'number' ? data.longitude : null

    console.log('[exifr] meta:', { date, lat, lng })
    return { date, lat, lng }
  } catch (err) {
    console.warn('[exifr] parse failed (no metadata or unsupported format):', err)
    return { date: null, lat: null, lng: null }
  }
}
