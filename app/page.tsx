'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Photo } from '@/lib/types'
import AuthGate from '@/components/AuthGate'
import Onboarding from '@/components/Onboarding'
import MapView from '@/components/MapView'
import PhotoModal from '@/components/PhotoModal'
import UploadModal from '@/components/UploadModal'
import Header from '@/components/Header'

export default function Home() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadPhotos = useCallback(async () => {
    try {
      const res = await fetch('/api/photos')
      if (res.ok) {
        const data = await res.json()
        setPhotos(data.photos)
      }
    } catch (e) {
      console.error('Failed to load photos:', e)
    }
  }, [])

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth')
        if (res.ok) {
          setIsAuthed(true)
          const hasSeenOnboarding = localStorage.getItem('onboarding_complete')
          if (!hasSeenOnboarding) {
            setShowOnboarding(true)
          }
          await loadPhotos()
        }
      } catch {}
      setLoading(false)
    }
    checkAuth()
  }, [loadPhotos])

  function handleAuthSuccess() {
    setIsAuthed(true)
    const hasSeenOnboarding = localStorage.getItem('onboarding_complete')
    if (!hasSeenOnboarding) {
      setShowOnboarding(true)
    }
    loadPhotos()
  }

  function handleOnboardingComplete() {
    localStorage.setItem('onboarding_complete', 'true')
    setShowOnboarding(false)
  }

  function handlePhotoUploaded() {
    loadPhotos()
    setShowUpload(false)
  }

  function handleCommentAdded(updatedPhoto: Photo) {
    setPhotos((prev) =>
      prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p)),
    )
    setSelectedPhoto(updatedPhoto)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center animate-fade-in">
          <div className="text-5xl mb-4 animate-pulse-soft">💝</div>
          <p className="text-primary-400 font-script text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthed) {
    return <AuthGate onSuccess={handleAuthSuccess} />
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="min-h-screen bg-white relative">
      <Header photoCount={photos.length} />
      <MapView
        photos={photos}
        onPhotoClick={setSelectedPhoto}
      />

      {/* Upload FAB */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-8 right-8 z-[1000] w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-2xl active:scale-95"
        aria-label="Upload photos"
      >
        +
      </button>

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={handlePhotoUploaded}
        />
      )}
    </div>
  )
}
