'use client'

import dynamic from 'next/dynamic'
import type { Photo } from '@/lib/types'

const MapContent = dynamic(() => import('./MapContent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 font-script text-xl animate-pulse-soft">
        Loading map...
      </p>
    </div>
  ),
})

interface MapViewProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
}

export default function MapView({ photos, onPhotoClick }: MapViewProps) {
  return <MapContent photos={photos} onPhotoClick={onPhotoClick} />
}
