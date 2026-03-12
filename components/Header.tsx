'use client'

import { useMemo } from 'react'
import type { Photo } from '@/lib/types'

interface HeaderProps {
  photos: Photo[]
  onSettingsClick: () => void
}

export default function Header({ photos, onSettingsClick }: HeaderProps) {
  const placesCount = useMemo(() => {
    const set = new Set<string>()
    photos.forEach((p) => {
      const key = `${p.lat.toFixed(1)},${p.lng.toFixed(1)}`
      set.add(key)
    })
    return set.size
  }, [photos])

  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] pointer-events-none">
      <div className="flex items-center justify-between px-4 py-4">
        {/* Logo */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md pointer-events-auto">
          <h1 className="font-script text-2xl text-primary-600">Our Map</h1>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Stats */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md">
            <span className="text-sm text-gray-500">
              <span className="text-primary-500 font-medium">{photos.length}</span>
              {' '}
              {photos.length === 1 ? 'memory' : 'memories'}
              {placesCount > 0 && (
                <>
                  {' · '}
                  <span className="text-primary-500 font-medium">{placesCount}</span>
                  {' '}
                  {placesCount === 1 ? 'place' : 'places'}
                </>
              )}
            </span>
          </div>

          {/* Settings button */}
          <button
            onClick={onSettingsClick}
            className="bg-white/80 backdrop-blur-sm rounded-2xl w-10 h-10 shadow-md flex items-center justify-center text-gray-400 hover:text-primary-500 transition-colors"
            aria-label="Settings"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
