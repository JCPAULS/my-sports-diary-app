import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapPin } from '@/lib/venues'

// ─── Auto-fit bounds helper ───────────────────────────────────────────────────

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap()
  useEffect(() => {
    const valid = pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    if (!valid.length) return
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 9)
    } else {
      const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number]))
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [48, 48] })
    }
  }, [map, pins])
  return null
}

// ─── Marker icon builder ──────────────────────────────────────────────────────

function makePinIcon(gameCount: number): L.DivIcon {
  const badge =
    gameCount > 1
      ? `<div style="
          position:absolute;top:-6px;right:-7px;
          background:var(--color-gold,#d4a017);border:1.5px solid #000;
          border-radius:50%;width:17px;height:17px;
          display:flex;align-items:center;justify-content:center;
          font-size:9px;font-weight:700;font-family:sans-serif;color:#000;
          line-height:1;
        ">${gameCount > 99 ? '99+' : gameCount}</div>`
      : ''

  const html = `<div style="position:relative;width:24px;height:32px;">
    <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C6.48 0 2 4.48 2 10c0 8.5 10 22 10 22s10-13.5 10-22C22 4.48 17.52 0 12 0z"
        style="fill:var(--color-red,#c8312b)" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="12" cy="10" r="4.5" fill="rgba(255,255,255,0.88)"/>
    </svg>
    ${badge}
  </div>`

  return L.divIcon({
    className: '',
    html,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -34],
  })
}

// ─── Stadium popup card ───────────────────────────────────────────────────────

function StadiumPopupContent({ pin }: { pin: MapPin }) {
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const hasPhoto = !!pin.photoUrl
  const showPlaceholder = !hasPhoto || imgState === 'error'

  return (
    <div style={{ width: 280 }}>
      {/* Photo area */}
      <div style={{ height: 160, overflow: 'hidden', background: '#ede0bf', position: 'relative', flexShrink: 0 }}>
        {hasPhoto && imgState !== 'error' && (
          <img
            src={pin.photoUrl!}
            alt={pin.name}
            loading="lazy"
            onLoad={() => setImgState('loaded')}
            onError={() => setImgState('error')}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              display: 'block',
              opacity: imgState === 'loaded' ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
        )}
        {hasPhoto && imgState === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 24, height: 24,
              border: '2px solid rgba(0,0,0,0.1)',
              borderTopColor: 'rgba(0,0,0,0.4)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        )}
        {showPlaceholder && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#ede0bf', gap: 6,
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="rgba(0,0,0,0.18)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span style={{ fontSize: 9, fontFamily: 'sans-serif', color: 'rgba(0,0,0,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              No photo
            </span>
          </div>
        )}
      </div>

      {/* Info section */}
      <div style={{ padding: '10px 12px 10px' }}>
        <p style={{
          fontFamily: '"Bebas Neue", sans-serif',
          fontSize: 17, lineHeight: 1.1,
          color: '#000', margin: 0, marginBottom: 3,
          letterSpacing: '0.03em',
        }}>
          {pin.name}
        </p>
        <p style={{ fontFamily: '"Archivo", sans-serif', fontSize: 12, color: '#666', margin: 0, marginBottom: 5 }}>
          {pin.city}, {pin.state}
        </p>
        <p style={{ fontFamily: '"Caveat", cursive', fontSize: 14, color: '#888', margin: 0 }}>
          {pin.gameCount} {pin.gameCount === 1 ? 'game' : 'games'} logged here
        </p>
        {pin.teams && pin.teams.length > 0 && (
          <p style={{ fontFamily: '"Archivo", sans-serif', fontSize: 10, color: '#bbb', margin: 0, marginTop: 3 }}>
            {pin.teams.slice(0, 3).join(' · ')}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface StadiumMapProps {
  pins: MapPin[]
}

export default function StadiumMap({ pins }: StadiumMapProps) {
  const icons = useMemo(
    () => pins.map((p) => makePinIcon(p.gameCount)),
    [pins]
  )

  const center: [number, number] = pins.length
    ? [pins[0].lat, pins[0].lng]
    : [39.5, -98.35]

  // Stable key derived from pin coordinates — forces a clean Leaflet remount
  // when the pin set changes, preventing "Map container is already initialized".
  const mapKey = pins.map((p) => `${p.lat},${p.lng}`).join('|')

  return (
    <MapContainer
      key={mapKey}
      center={center}
      zoom={4}
      scrollWheelZoom={false}
      className="w-full h-64 lg:h-80 border-2 border-ink"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pins={pins} />
      {pins.map((p, i) => (
        <Marker key={`${p.name}-${p.lat}`} position={[p.lat, p.lng]} icon={icons[i]}>
          <Popup className="stadium-popup" minWidth={280} maxWidth={280} autoPan={true}>
            <StadiumPopupContent pin={p} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
