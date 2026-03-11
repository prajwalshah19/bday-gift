import { put, list, del } from '@vercel/blob'
import type { AppData } from './types'

const METADATA_PATH = 'metadata.json'

export async function getAppData(): Promise<AppData> {
  try {
    const { blobs } = await list({ prefix: METADATA_PATH })
    const metaBlob = blobs.find((b) => b.pathname === METADATA_PATH)
    if (metaBlob) {
      const response = await fetch(metaBlob.url, { cache: 'no-store' })
      if (response.ok) {
        return response.json()
      }
    }
  } catch (e) {
    console.error('Failed to read app data:', e)
  }
  return { photos: [] }
}

export async function saveAppData(data: AppData): Promise<void> {
  // Delete existing metadata blob first
  try {
    const { blobs } = await list({ prefix: METADATA_PATH })
    const existing = blobs.find((b) => b.pathname === METADATA_PATH)
    if (existing) {
      await del(existing.url)
    }
  } catch {}

  await put(METADATA_PATH, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
}

export async function uploadPhoto(
  file: Buffer,
  filename: string,
): Promise<string> {
  const blob = await put(`photos/${filename}`, file, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'image/jpeg',
  })
  return blob.url
}

export async function uploadThumbnail(
  file: Buffer,
  filename: string,
): Promise<string> {
  const blob = await put(`thumbs/${filename}`, file, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'image/jpeg',
  })
  return blob.url
}

export async function deletePhotoBlobs(
  photoUrl: string,
  thumbnailUrl: string,
): Promise<void> {
  try {
    await del([photoUrl, thumbnailUrl])
  } catch (e) {
    console.error('Failed to delete photo blobs:', e)
  }
}
