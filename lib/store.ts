import { put, list, del } from '@vercel/blob'
import type { AppData } from './types'

const IS_LOCAL = process.env.NODE_ENV === 'development' && !process.env.BLOB_READ_WRITE_TOKEN

// --------------- Local filesystem (dev only) ---------------
async function localFs() {
  const fs = await import('fs/promises')
  const path = await import('path')
  const DATA_DIR = path.join(process.cwd(), '.local-storage')
  const ensureDirs = async () => {
    await fs.mkdir(path.join(DATA_DIR, 'photos'), { recursive: true })
    await fs.mkdir(path.join(DATA_DIR, 'thumbs'), { recursive: true })
  }
  return { fs, path, DATA_DIR, ensureDirs }
}

// Convert a blob URL to a proxy URL that our API serves
function proxyUrl(blobUrl: string, pathPrefix: string): string {
  return `/api/local-files/${pathPrefix}?url=${encodeURIComponent(blobUrl)}`
}

// --------------- App Data (metadata.json) ---------------
export async function getAppData(): Promise<AppData> {
  if (IS_LOCAL) {
    const { fs, DATA_DIR, ensureDirs } = await localFs()
    const path = await import('path')
    try {
      await ensureDirs()
      const raw = await fs.readFile(path.join(DATA_DIR, 'metadata.json'), 'utf-8')
      return JSON.parse(raw)
    } catch {
      return { photos: [] }
    }
  }

  try {
    const { blobs } = await list({ prefix: 'metadata' })
    const metaBlob = blobs.find((b) => b.pathname === 'metadata.json')
    if (metaBlob) {
      const url = metaBlob.downloadUrl || metaBlob.url
      const res = await fetch(url + '?t=' + Date.now())
      if (res.ok) return res.json()
    }
  } catch (e) {
    console.error('Failed to read app data:', e)
  }
  return { photos: [] }
}

export async function saveAppData(data: AppData): Promise<void> {
  if (IS_LOCAL) {
    const { fs, DATA_DIR, ensureDirs } = await localFs()
    const path = await import('path')
    await ensureDirs()
    await fs.writeFile(path.join(DATA_DIR, 'metadata.json'), JSON.stringify(data, null, 2))
    return
  }

  await put('metadata.json', JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

// --------------- Photo Upload ---------------
export async function uploadPhoto(
  file: Buffer,
  filename: string,
): Promise<string> {
  if (IS_LOCAL) {
    const { fs, DATA_DIR, ensureDirs } = await localFs()
    const path = await import('path')
    await ensureDirs()
    await fs.writeFile(path.join(DATA_DIR, 'photos', filename), file)
    return `/api/local-files/photos/${filename}`
  }

  const blob = await put(`photos/${filename}`, file, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'image/jpeg',
  })
  return proxyUrl(blob.url, `photos/${filename}`)
}

// --------------- Thumbnail Upload ---------------
export async function uploadThumbnail(
  file: Buffer,
  filename: string,
): Promise<string> {
  if (IS_LOCAL) {
    const { fs, DATA_DIR, ensureDirs } = await localFs()
    const path = await import('path')
    await ensureDirs()
    await fs.writeFile(path.join(DATA_DIR, 'thumbs', filename), file)
    return `/api/local-files/thumbs/${filename}`
  }

  const blob = await put(`thumbs/${filename}`, file, {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'image/jpeg',
  })
  return proxyUrl(blob.url, `thumbs/${filename}`)
}

// --------------- Delete ---------------
export async function deletePhotoBlobs(
  photoUrl: string,
  thumbnailUrl: string,
): Promise<void> {
  if (IS_LOCAL) {
    const { fs, DATA_DIR } = await localFs()
    const path = await import('path')
    try {
      await Promise.all([
        fs.unlink(path.join(DATA_DIR, photoUrl.replace('/api/local-files/', ''))).catch(() => {}),
        fs.unlink(path.join(DATA_DIR, thumbnailUrl.replace('/api/local-files/', ''))).catch(() => {}),
      ])
    } catch {}
    return
  }

  try {
    // Extract real blob URL from proxy URL
    const extractBlobUrl = (proxyStr: string) => {
      try {
        const u = new URL(proxyStr, 'http://localhost')
        return u.searchParams.get('url') || proxyStr
      } catch {
        return proxyStr
      }
    }
    await del([extractBlobUrl(photoUrl), extractBlobUrl(thumbnailUrl)])
  } catch (e) {
    console.error('Failed to delete photo blobs:', e)
  }
}
