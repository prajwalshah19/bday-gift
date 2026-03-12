import { NextRequest, NextResponse } from 'next/server'
import { getAppData, savePhotoMeta, deletePhotoMeta, deletePhotoBlobs } from '@/lib/store'

// Update photo caption and/or location
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await request.json()
  const data = await getAppData()
  const photo = data.photos.find((p) => p.id === params.id)

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  if (body.caption !== undefined) photo.caption = body.caption
  if (body.lat !== undefined && body.lng !== undefined) {
    photo.lat = Number(body.lat)
    photo.lng = Number(body.lng)
  }

  await savePhotoMeta(photo)

  return NextResponse.json(photo)
}

// Delete a photo
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const data = await getAppData()
  const photo = data.photos.find((p) => p.id === params.id)

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  await Promise.all([
    deletePhotoBlobs(photo.url, photo.thumbnailUrl),
    deletePhotoMeta(photo.id),
  ])

  return NextResponse.json({ success: true })
}
