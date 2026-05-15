import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapPin } from '@/lib/venues'

// ─── Auto-fit bounds helper ───────────────────────────────────────────────────

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap()
  useEffect(() => {
    if (!pins.length) return
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 9)
    } else {
      const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [48, 48] })
    }
  }, [map, pins])
  return null
}

// ─── Marker icon builder ──────────────────────────────────────────────────────

function makePinIcon(gameCount: number): L.DivIcon {
  // SVG map-pin: teardrop body with white inner circle
  // Uses CSS variable --color-red so it follows the active theme
  const badge =
    gameCount > 1
      ? `<div style="
          position:absolute;top:-6px;right:-7px;
          background:#d4a017;border:1.5px solid #000;
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

  return (
    <MapContainer
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
          <Popup>
            <p className="font-bebas text-base leading-tight">{p.name}</p>
            <p className="text-xs text-gray-500">{p.city}, {p.state}</p>
            <p className="font-bebas text-xs text-gray-400 mt-0.5">
              {p.gameCount} {p.gameCount === 1 ? 'game' : 'games'}
            </p>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
