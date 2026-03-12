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
    console.log('Blob list result:', blobs.map(b => b.pathname))
    const metaBlob = blobs.find((b) => b.pathname === 'metadata.json')
    if (metaBlob) {
      // Use downloadUrl to bypass CDN caching
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

  // put() with addRandomSuffix: false overwrites existing blob
  await put('metadata.json', JSON.stringify(data), {
    addRandomSuffix: false,
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
    addRandomSuffix: false,
    contentType: 'image/jpeg',
  })
  return blob.url
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
    addRandomSuffix: false,
    contentType: 'image/jpeg',
  })
  return blob.url
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
    await del([photoUrl, thumbnailUrl])
  } catch (e) {
    console.error('Failed to delete photo blobs:', e)
  }
}
