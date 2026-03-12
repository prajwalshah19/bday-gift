import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAppData, savePhotoMeta } from '@/lib/store'

// Add a comment to a photo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { text, author } = await request.json()

  if (!text || !author) {
    return NextResponse.json(
      { error: 'Text and author are required' },
      { status: 400 },
    )
  }

  const data = await getAppData()
  const photo = data.photos.find((p) => p.id === params.id)

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  const comment = {
    id: uuidv4(),
    text,
    author,
    date: new Date().toISOString(),
  }

  photo.comments.push(comment)
  await savePhotoMeta(photo)

  return NextResponse.json(photo, { status: 201 })
}

// Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { searchParams } = new URL(request.url)
  const commentId = searchParams.get('commentId')

  if (!commentId) {
    return NextResponse.json(
      { error: 'commentId is required' },
      { status: 400 },
    )
  }

  const data = await getAppData()
  const photo = data.photos.find((p) => p.id === params.id)

  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }

  photo.comments = photo.comments.filter((c) => c.id !== commentId)
  await savePhotoMeta(photo)

  return NextResponse.json(photo)
}
