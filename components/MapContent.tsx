'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Photo } from '@/lib/types'

interface MapContentProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
}

function createPhotoIcon(thumbnailUrl: string) {
  return L.divIcon({
    className: 'photo-marker',
    html: `<div class="marker-circle"><img src="${thumbnailUrl}" alt="" loading="lazy" /></div>`,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  })
}

function FitBounds({ photos }: { photos: Photo[] }) {
  const map = useMap()

  useMemo(() => {
    if (photos.length === 0) return
    if (photos.length === 1) {
      map.setView([photos[0].lat, photos[0].lng], 12)
      return
    }
    const bounds = L.latLngBounds(photos.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 })
  }, [photos, map])

  return null
}

export default function MapContent({ photos, onPhotoClick }: MapContentProps) {
  const defaultCenter: [number, number] = photos.length > 0
    ? [photos[0].lat, photos[0].lng]
    : [40, -30]
  const defaultZoom = photos.length > 0 ? 12 : 3

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      className="w-full h-screen"
      zoomControl={true}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
      />

      {photos.map((photo) => (
        <Marker
          key={photo.id}
          position={[photo.lat, photo.lng]}
          icon={createPhotoIcon(photo.thumbnailUrl)}
          eventHandlers={{
            click: () => onPhotoClick(photo),
          }}
        />
      ))}

      <FitBounds photos={photos} />

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 text-center shadow-lg max-w-sm mx-4">
            <div className="text-5xl mb-4">📍</div>
            <h2 className="font-script text-2xl text-primary-600 mb-2">
              No memories yet
            </h2>
            <p className="text-gray-400 text-sm">
              Tap the <span className="text-primary-500 font-bold">+</span> button to add your first photo
            </p>
          </div>
        </div>
      )}
    </MapContainer>
  )
}
