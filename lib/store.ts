import fs from 'fs/promises'
import path from 'path'
import type { AppData } from './types'

const DATA_DIR = path.join(process.cwd(), '.local-storage')
const PHOTOS_DIR = path.join(DATA_DIR, 'photos')
const THUMBS_DIR = path.join(DATA_DIR, 'thumbs')
const METADATA_PATH = path.join(DATA_DIR, 'metadata.json')

async function ensureDirs() {
  await fs.mkdir(PHOTOS_DIR, { recursive: true })
  await fs.mkdir(THUMBS_DIR, { recursive: true })
}

export async function getAppData(): Promise<AppData> {
  try {
    await ensureDirs()
    const raw = await fs.readFile(METADATA_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { photos: [] }
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await ensureDirs()
  await fs.writeFile(METADATA_PATH, JSON.stringify(data, null, 2))
}

export async function uploadPhoto(
  file: Buffer,
  filename: string,
): Promise<string> {
  await ensureDirs()
  const filePath = path.join(PHOTOS_DIR, filename)
  await fs.writeFile(filePath, file)
  return `/api/local-files/photos/${filename}`
}

export async function uploadThumbnail(
  file: Buffer,
  filename: string,
): Promise<string> {
  await ensureDirs()
  const filePath = path.join(THUMBS_DIR, filename)
  await fs.writeFile(filePath, file)
  return `/api/local-files/thumbs/${filename}`
}

export async function deletePhotoBlobs(
  photoUrl: string,
  thumbnailUrl: string,
): Promise<void> {
  try {
    const photoFile = path.join(DATA_DIR, photoUrl.replace('/api/local-files/', ''))
    const thumbFile = path.join(DATA_DIR, thumbnailUrl.replace('/api/local-files/', ''))
    await Promise.all([
      fs.unlink(photoFile).catch(() => {}),
      fs.unlink(thumbFile).catch(() => {}),
    ])
  } catch (e) {
    console.error('Failed to delete photo blobs:', e)
  }
}
