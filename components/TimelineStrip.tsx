'use client'

import { useRef, useEffect } from 'react'
import type { Photo } from '@/lib/types'

interface TimelineStripProps {
  photos: Photo[]
  selectedIndex: number | null
  onPhotoSelect: (index: number) => void
}

export default function TimelineStrip({
  photos,
  selectedIndex,
  onPhotoSelect,
}: TimelineStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (selectedIndex !== null && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [selectedIndex])

  if (photos.length === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[900] safe-bottom">
      <div
        ref={scrollRef}
        className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white/80 backdrop-blur-sm border-t border-white/50"
      >
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            ref={(el) => { itemRefs.current[i] = el }}
            onClick={() => onPhotoSelect(i)}
            className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden transition-all duration-200 ${
              selectedIndex === i
                ? 'ring-2 ring-primary-500 ring-offset-2 scale-105'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            <img
              src={photo.thumbnailUrl}
              alt={photo.caption || ''}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
