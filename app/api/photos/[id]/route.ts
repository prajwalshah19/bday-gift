import { NextRequest, NextResponse } from 'next/server'
import { getAppData, saveAppData, deletePhotoBlobs } from '@/lib/store'

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

  await saveAppData(data)

  return NextResponse.json(photo)
}

// Delete a photo
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const data = await getAppData()
  const photoIndex = data.photos.findIndex((p) => p.id === params.id)

  if (photoIndex === -1) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  const photo = data.photos[photoIndex]
  await deletePhotoBlobs(photo.url, photo.thumbnailUrl)

  data.photos.splice(photoIndex, 1)
  await saveAppData(data)

  return NextResponse.json({ success: true })
}
