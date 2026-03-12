import { put, list, del } from '@vercel/blob'
import type { AppData, Photo } from './types'

const IS_LOCAL = process.env.NODE_ENV === 'development' && !process.env.BLOB_READ_WRITE_TOKEN

// --------------- Local filesystem (dev only) ---------------
async function localFs() {
  const fs = await import('fs/promises')
  const path = await import('path')
  const DATA_DIR = path.join(process.cwd(), '.local-storage')
  const ensureDirs = async () => {
    await fs.mkdir(path.join(DATA_DIR, 'photos'), { recursive: true })
    await fs.mkdir(path.join(DATA_DIR, 'thumbs'), { recursive: true })
    await fs.mkdir(path.join(DATA_DIR, 'meta'), { recursive: true })
  }
  return { fs, path, DATA_DIR, ensureDirs }
}

// Convert a blob URL to a proxy URL that our API serves
function proxyUrl(blobUrl: string, pathPrefix: string): string {
  return `/api/local-files/${pathPrefix}?url=${encodeURIComponent(blobUrl)}`
}

function authHeaders() {
  return { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
}

// --------------- App Data ---------------
// Each photo's metadata is stored as a separate blob: meta/{id}.json
// This eliminates read-modify-write race conditions on a single metadata.json

async function readLegacyMetadata(): Promise<AppData> {
  try {
    const { blobs } = await list({ prefix: 'metadata' })
    const metaBlob = blobs.find((b) => b.pathname === 'metadata.json')
    if (metaBlob) {
      const url = metaBlob.downloadUrl || metaBlob.url
      const res = await fetch(url, {
        headers: authHeaders(),
        cache: 'no-store',
      })
      if (res.ok) return res.json()
    }
  } catch (e) {
    console.error('Failed to read legacy metadata:', e)
  }
  return { photos: [] }
}

export async function getAppData(): Promise<AppData> {
  if (IS_LOCAL) {
    const { fs, path, DATA_DIR, ensureDirs } = await localFs()
    await ensureDirs()
    const metaDir = path.join(DATA_DIR, 'meta')
    try {
      const files = await fs.readdir(metaDir)
      const photos: Photo[] = []
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const raw = await fs.readFile(path.join(metaDir, file), 'utf-8')
        photos.push(JSON.parse(raw))
      }
      return { photos }
    } catch {
      return { photos: [] }
    }
  }

  try {
    const photos: Photo[] = []
    let cursor: string | undefined
    // Paginate through all meta/ blobs
    do {
      const result = await list({ prefix: 'meta/', cursor })
      for (const blob of result.blobs) {
        if (!blob.pathname.endsWith('.json')) continue
        try {
          const url = blob.downloadUrl || blob.url
          const res = await fetch(url, {
            headers: authHeaders(),
            cache: 'no-store',
          })
          if (res.ok) {
            photos.push(await res.json())
          }
        } catch (e) {
          console.error(`Failed to read ${blob.pathname}:`, e)
        }
      }
      cursor = result.hasMore ? result.cursor : undefined
    } while (cursor)

    // If no per-photo meta found, try legacy metadata.json and migrate
    if (photos.length === 0) {
      const legacy = await readLegacyMetadata()
      if (legacy.photos.length > 0) {
        console.log(`Migrating ${legacy.photos.length} photos from legacy metadata.json`)
        for (const photo of legacy.photos) {
          await savePhotoMeta(photo)
        }
        return legacy
      }
    }

    return { photos }
  } catch (e) {
    console.error('Failed to read app data:', e)
  }
  return { photos: [] }
}

export async function savePhotoMeta(photo: Photo): Promise<void> {
  if (IS_LOCAL) {
    const { fs, path, DATA_DIR, ensureDirs } = await localFs()
    await ensureDirs()
    await fs.writeFile(
      path.join(DATA_DIR, 'meta', `${photo.id}.json`),
      JSON.stringify(photo, null, 2),
    )
    return
  }

  await put(`meta/${photo.id}.json`, JSON.stringify(photo), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

export async function deletePhotoMeta(id: string): Promise<void> {
  if (IS_LOCAL) {
    const { fs, path, DATA_DIR } = await localFs()
    await fs.unlink(path.join(DATA_DIR, 'meta', `${id}.json`)).catch(() => {})
    return
  }

  try {
    const { blobs } = await list({ prefix: `meta/${id}.json` })
    const blob = blobs.find((b) => b.pathname === `meta/${id}.json`)
    if (blob) await del(blob.url)
  } catch (e) {
    console.error('Failed to delete photo meta:', e)
  }
}

// Keep saveAppData for backward compat / migration, but it now writes individual files
export async function saveAppData(data: AppData): Promise<void> {
  for (const photo of data.photos) {
    await savePhotoMeta(photo)
  }
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
