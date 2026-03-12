'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Photo } from '@/lib/types'
import { useSettings } from '@/lib/useSettings'
import { useSkyTheme } from '@/lib/useSkyTheme'
import AuthGate from '@/components/AuthGate'
import Onboarding from '@/components/Onboarding'
import MapView from '@/components/MapView'
import PhotoModal from '@/components/PhotoModal'
import UploadModal from '@/components/UploadModal'
import Header from '@/components/Header'
import SettingsPanel from '@/components/SettingsPanel'
import TimelineStrip from '@/components/TimelineStrip'

export default function Home() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [flyToPhoto, setFlyToPhoto] = useState<Photo | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [settings, updateSettings] = useSettings()
  useSkyTheme()

  // Sort photos chronologically
  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => {
      const da = a.dateTaken || a.dateUploaded
      const db = b.dateTaken || b.dateUploaded
      return new Date(da).getTime() - new Date(db).getTime()
    })
  }, [photos])

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

  function handleSelectPhoto(photo: Photo) {
    const idx = sortedPhotos.findIndex((p) => p.id === photo.id)
    setSelectedPhotoIndex(idx >= 0 ? idx : 0)
    setFlyToPhoto(photo)
  }

  function handleTimelineSelect(index: number) {
    setSelectedPhotoIndex(index)
    setFlyToPhoto(sortedPhotos[index])
  }

  function handleNavigatePhoto(index: number) {
    setSelectedPhotoIndex(index)
    setFlyToPhoto(sortedPhotos[index])
  }

  function handleSurpriseMe() {
    if (sortedPhotos.length === 0) return
    const idx = Math.floor(Math.random() * sortedPhotos.length)
    setFlyToPhoto(sortedPhotos[idx])
    setTimeout(() => {
      setSelectedPhotoIndex(idx)
    }, 800)
  }

  function handleCommentAdded(updatedPhoto: Photo) {
    setPhotos((prev) =>
      prev.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p)),
    )
  }

  if (loading) {
    return (
      <div className="h-screen overflow-auto flex items-center justify-center bg-white">
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
    <div className="h-screen bg-white relative overflow-hidden">
      <Header photos={sortedPhotos} onSettingsClick={() => setShowSettings(true)} />
      <MapView
        photos={sortedPhotos}
        onPhotoClick={handleSelectPhoto}
        flyToPhoto={flyToPhoto}
        mapStyle={settings.mapStyle}
        showJourneyLines={settings.showJourneyLines}
      />

      {/* Timeline strip */}
      <TimelineStrip
        photos={sortedPhotos}
        selectedIndex={selectedPhotoIndex}
        onPhotoSelect={handleTimelineSelect}
      />

      {/* Surprise Me button */}
      {sortedPhotos.length > 1 && (
        <button
          onClick={handleSurpriseMe}
          className="fixed bottom-20 left-4 z-[900] bg-white/80 backdrop-blur-sm hover:bg-white text-primary-600 px-4 py-2 rounded-2xl shadow-md text-sm font-medium transition-all duration-200 active:scale-95"
        >
          Surprise me
        </button>
      )}

      {/* Upload FAB */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-20 right-4 z-[900] w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-2xl active:scale-95"
        aria-label="Upload photos"
      >
        +
      </button>

      {selectedPhotoIndex !== null && (
        <PhotoModal
          photos={sortedPhotos}
          currentIndex={selectedPhotoIndex}
          onNavigate={handleNavigatePhoto}
          onClose={() => setSelectedPhotoIndex(null)}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={handlePhotoUploaded}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
