import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAppData, uploadPhoto, uploadThumbnail, savePhotoMeta } from '@/lib/store'
import type { Photo } from '@/lib/types'

// Get all photos
export async function GET() {
  const data = await getAppData()
  return NextResponse.json(data)
}

// Upload a new photo
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const photo = formData.get('photo') as File | null
    const thumbnail = formData.get('thumbnail') as File | null
    const lat = parseFloat(formData.get('lat') as string)
    const lng = parseFloat(formData.get('lng') as string)
    const dateTaken = formData.get('dateTaken') as string | null
    const caption = formData.get('caption') as string | null

    if (!photo || !thumbnail || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Missing required fields (photo, thumbnail, lat, lng)' },
        { status: 400 },
      )
    }

    const id = uuidv4()
    const ext = photo.name.split('.').pop() || 'jpg'

    // Upload photo and thumbnail to blob storage
    const photoBuffer = Buffer.from(await photo.arrayBuffer())
    const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer())

    const [photoUrl, thumbnailUrl] = await Promise.all([
      uploadPhoto(photoBuffer, `${id}.${ext}`),
      uploadThumbnail(thumbBuffer, `${id}.jpg`),
    ])

    const newPhoto: Photo = {
      id,
      url: photoUrl,
      thumbnailUrl,
      lat,
      lng,
      dateTaken: dateTaken || undefined,
      dateUploaded: new Date().toISOString(),
      caption: caption || undefined,
      comments: [],
    }

    // Save this photo's metadata as its own blob — no read-modify-write race
    await savePhotoMeta(newPhoto)

    return NextResponse.json(newPhoto, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Upload failed:', msg, e)
    return NextResponse.json({ error: 'Upload failed', detail: msg }, { status: 500 })
  }
}
