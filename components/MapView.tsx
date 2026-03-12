'use client'

import dynamic from 'next/dynamic'
import type { Photo } from '@/lib/types'
import type { MapStyle } from '@/lib/useSettings'

const MapContent = dynamic(() => import('./MapContent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#fdf2f4]">
      <p className="text-gray-400 font-script text-xl animate-pulse-soft">
        Loading map...
      </p>
    </div>
  ),
})

interface MapViewProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
  flyToPhoto: Photo | null
  mapStyle: MapStyle
  showJourneyLines: boolean
}

export default function MapView({
  photos,
  onPhotoClick,
  flyToPhoto,
  mapStyle,
  showJourneyLines,
}: MapViewProps) {
  return (
    <MapContent
      photos={photos}
      onPhotoClick={onPhotoClick}
      flyToPhoto={flyToPhoto}
      mapStyle={mapStyle}
      showJourneyLines={showJourneyLines}
    />
  )
}
