export interface Photo {
  id: string
  url: string
  thumbnailUrl: string
  lat: number
  lng: number
  dateTaken?: string
  dateUploaded: string
  caption?: string
  comments: Comment[]
}

export interface Comment {
  id: string
  text: string
  author: string
  date: string
}

export interface AppData {
  photos: Photo[]
}
