import { useState, useEffect } from 'react'
import { getSignedUrl, isStoragePath } from '@/lib/photoStore'

interface PhotoImgProps {
  src: string
  alt?: string
  className?: string
}

export default function PhotoImg({ src, alt, className }: PhotoImgProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>(() =>
    isStoragePath(src) ? '' : src
  )

  useEffect(() => {
    if (!isStoragePath(src)) {
      setResolvedSrc(src)
      return
    }
    let cancelled = false
    getSignedUrl(src)
      .then((url) => { if (!cancelled) setResolvedSrc(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [src])

  if (!resolvedSrc) {
    return <div className={`bg-ink/10 ${className ?? ''}`} />
  }

  return <img src={resolvedSrc} alt={alt} className={className} />
}
