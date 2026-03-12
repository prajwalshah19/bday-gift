import { NextRequest, NextResponse } from 'next/server'
import { list } from '@vercel/blob'

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const blobPath = params.path.join('/')

  try {
    const { blobs } = await list({ prefix: blobPath })
    const blob = blobs.find((b) => b.pathname === blobPath)

    if (!blob) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Fetch the blob content server-side (has access via BLOB_READ_WRITE_TOKEN)
    const res = await fetch(blob.downloadUrl, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    const data = await res.arrayBuffer()
    const ext = blobPath.split('.').pop()?.toLowerCase() || ''
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (e) {
    console.error('Blob proxy error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
