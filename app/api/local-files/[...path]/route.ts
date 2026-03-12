import { NextRequest, NextResponse } from 'next/server'

const IS_LOCAL = process.env.NODE_ENV === 'development' && !process.env.BLOB_READ_WRITE_TOKEN

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  if (IS_LOCAL) {
    // Dev: serve from local filesystem
    const fs = await import('fs/promises')
    const path = await import('path')
    const DATA_DIR = path.join(process.cwd(), '.local-storage')
    const filePath = path.join(DATA_DIR, ...params.path)

    if (!filePath.startsWith(DATA_DIR)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
      const file = await fs.readFile(filePath)
      const ext = path.extname(filePath).slice(1).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      return new NextResponse(file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  // Prod: proxy from Vercel Blob
  // The blob URL is passed as a query param
  const blobUrl = _request.nextUrl.searchParams.get('url')
  if (!blobUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 })
  }

  try {
    const res = await fetch(blobUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Blob fetch failed', status: res.status }, { status: 502 })
    }

    const body = res.body
    const contentType = res.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 })
  }
}
