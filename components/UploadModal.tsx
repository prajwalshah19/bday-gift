'use client'

import { useState, useRef, useCallback } from 'react'
import exifr from 'exifr'
import LocationPicker from './LocationPicker'

interface UploadModalProps {
  onClose: () => void
  onUploaded: () => void
}

interface PendingPhoto {
  file: File
  compressed: Blob
  preview: string
  thumbnail: Blob
  lat: number | null
  lng: number | null
  dateTaken: string | null
}

async function generateThumbnail(file: File, maxSize = 200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxSize / img.width, maxSize / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No canvas context'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create thumbnail'))
        },
        'image/jpeg',
        0.8,
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

async function compressImage(file: File, maxDim = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Skip compression if already small enough
      if (img.width <= maxDim && img.height <= maxDim && file.size < 500_000) {
        resolve(file)
        return
      }
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No canvas context'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to compress image'))
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

async function extractMetadata(
  file: File,
): Promise<{ lat: number | null; lng: number | null; dateTaken: string | null }> {
  try {
    const exif = await exifr.parse(file, { gps: true, exif: true })

    if (!exif) return { lat: null, lng: null, dateTaken: null }

    const lat = exif.latitude ?? null
    const lng = exif.longitude ?? null
    const dateTaken = exif.DateTimeOriginal?.toISOString?.()
      ?? exif.CreateDate?.toISOString?.()
      ?? null

    return { lat, lng, dateTaken }
  } catch {
    return { lat: null, lng: null, dateTaken: null }
  }
}

export default function UploadModal({ onClose, onUploaded }: UploadModalProps) {
  const [pending, setPending] = useState<PendingPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [pickingLocationFor, setPickingLocationFor] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError('')
    const newPending: PendingPhoto[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue

      try {
        const [compressed, thumbnail, metadata] = await Promise.all([
          compressImage(file),
          generateThumbnail(file),
          extractMetadata(file),
        ])

        newPending.push({
          file,
          compressed,
          preview: URL.createObjectURL(file),
          thumbnail,
          ...metadata,
        })
      } catch (e) {
        console.error('Failed to process file:', file.name, e)
      }
    }

    if (newPending.length === 0) {
      setError('No valid photos found. Make sure they are image files.')
      return
    }

    const withoutLocation = newPending.filter((p) => !p.lat || !p.lng)
    if (withoutLocation.length > 0) {
      setError(
        `${withoutLocation.length} photo(s) need a location. Tap them to pick one on the map.`,
      )
    }

    setPending((prev) => [...prev, ...newPending])
  }, [])

  function handleLocationConfirm(lat: number, lng: number) {
    if (pickingLocationFor === null) return
    setPending((prev) =>
      prev.map((p, i) =>
        i === pickingLocationFor ? { ...p, lat, lng } : p,
      ),
    )
    setPickingLocationFor(null)
    // Clear error if all photos now have locations
    setPending((prev) => {
      const stillMissing = prev.filter((p) => !p.lat || !p.lng).length
      if (stillMissing === 0) setError('')
      return prev
    })
  }

  async function handleUpload() {
    const photosWithLocation = pending.filter((p) => p.lat && p.lng)
    if (photosWithLocation.length === 0) {
      setError('No photos with location data to upload.')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    let uploaded = 0
    for (const photo of photosWithLocation) {
      const formData = new FormData()
      formData.append('photo', photo.compressed, photo.file.name)
      formData.append('thumbnail', photo.thumbnail, 'thumb.jpg')
      formData.append('lat', String(photo.lat))
      formData.append('lng', String(photo.lng))
      if (photo.dateTaken) formData.append('dateTaken', photo.dateTaken)

      let lastError = ''
      let success = false
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch('/api/photos', {
            method: 'POST',
            body: formData,
          })

          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            lastError = body.detail || body.error || `HTTP ${res.status}`
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 1000))
              continue
            }
          } else {
            success = true
            break
          }
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e)
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000))
            continue
          }
        }
      }

      if (!success) {
        console.error('Upload failed after retries:', lastError)
        setError(`Failed to upload ${photo.file.name}: ${lastError}`)
        setUploading(false)
        return
      }

      uploaded++
      setUploadProgress(Math.round((uploaded / photosWithLocation.length) * 100))
    }

    // Clean up previews
    pending.forEach((p) => URL.revokeObjectURL(p.preview))
    onUploaded()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }

  function removePending(index: number) {
    setPending((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const photosWithLocation = pending.filter((p) => p.lat && p.lng)
  const photosNeedingLocation = pending.filter((p) => !p.lat || !p.lng)

  return (
    <>
      <div
        className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

        <div
          className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-script text-2xl text-primary-600">
              Add Memories
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-sm transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Dropzone */}
            {!uploading && (
              <div
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 mb-4 ${
                  dragOver
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/50'
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="text-4xl mb-3">📸</div>
                <p className="text-gray-600 font-medium mb-1">
                  Drop photos here or tap to browse
                </p>
                <p className="text-gray-400 text-xs">
                  No GPS? No problem — you can pick a location on the map
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) processFiles(e.target.files)
                  }}
                />
              </div>
            )}

            {/* Preview grid */}
            {pending.length > 0 && !uploading && (
              <div className="grid grid-cols-3 gap-2">
                {pending.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img
                      src={photo.preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {!photo.lat ? (
                      <button
                        onClick={() => setPickingLocationFor(i)}
                        className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 hover:bg-black/50 transition-colors"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="text-white text-xs font-medium">
                          Set location
                        </span>
                      </button>
                    ) : (
                      <div className="absolute bottom-1 left-1 bg-green-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        GPS
                      </div>
                    )}
                    <button
                      onClick={() => removePending(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/40 hover:bg-black/60 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload progress */}
            {uploading && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4 animate-pulse-soft">✨</div>
                <p className="text-gray-600 font-medium mb-3">
                  Uploading memories...
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                  <div
                    className="bg-primary-500 rounded-full h-2 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-gray-400 text-sm">{uploadProgress}%</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-primary-500 text-sm mt-3">{error}</p>
            )}
          </div>

          {/* Upload button */}
          {pending.length > 0 && !uploading && (
            <div className="p-5 border-t border-gray-100">
              {photosNeedingLocation.length > 0 && (
                <p className="text-xs text-gray-400 mb-2 text-center">
                  {photosNeedingLocation.length} photo{photosNeedingLocation.length > 1 ? 's' : ''} still need a location
                </p>
              )}
              <button
                onClick={handleUpload}
                disabled={photosWithLocation.length === 0}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 text-white disabled:text-gray-400 py-3 rounded-xl font-medium transition-all duration-200 active:scale-[0.98]"
              >
                Upload {photosWithLocation.length}{' '}
                {photosWithLocation.length === 1 ? 'photo' : 'photos'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Location picker overlay */}
      {pickingLocationFor !== null && (
        <LocationPicker
          initialLat={pending[pickingLocationFor]?.lat}
          initialLng={pending[pickingLocationFor]?.lng}
          onConfirm={handleLocationConfirm}
          onCancel={() => setPickingLocationFor(null)}
        />
      )}
    </>
  )
}
