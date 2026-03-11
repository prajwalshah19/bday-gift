'use client'

import { useState, useEffect, useRef } from 'react'
import type { Photo } from '@/lib/types'

interface PhotoModalProps {
  photo: Photo
  onClose: () => void
  onCommentAdded: (photo: Photo) => void
}

export default function PhotoModal({
  photo,
  onClose,
  onCommentAdded,
}: PhotoModalProps) {
  const [commentText, setCommentText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [sending, setSending] = useState(false)
  const [editingCaption, setEditingCaption] = useState(false)
  const [caption, setCaption] = useState(photo.caption || '')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('display_name')
    if (stored) setAuthorName(stored)
  }, [])

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  async function handleSendComment() {
    if (!commentText.trim() || !authorName.trim()) return
    setSending(true)

    localStorage.setItem('display_name', authorName)

    try {
      const res = await fetch(`/api/photos/${photo.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText, author: authorName }),
      })
      if (res.ok) {
        const updated = await res.json()
        onCommentAdded(updated)
        setCommentText('')
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth',
          })
        }, 100)
      }
    } catch (e) {
      console.error('Failed to post comment:', e)
    }
    setSending(false)
  }

  async function handleSaveCaption() {
    try {
      const res = await fetch(`/api/photos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      })
      if (res.ok) {
        const updated = await res.json()
        onCommentAdded(updated)
        setEditingCaption(false)
      }
    } catch (e) {
      console.error('Failed to save caption:', e)
    }
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return null
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/20 hover:bg-black/30 text-white rounded-full flex items-center justify-center transition-colors text-sm"
        >
          ✕
        </button>

        {/* Photo */}
        <div className="relative">
          <img
            src={photo.url}
            alt={photo.caption || 'Photo'}
            className="w-full max-h-[40vh] object-cover sm:rounded-t-3xl rounded-t-3xl"
          />
        </div>

        {/* Content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-5"
        >
          {/* Date */}
          {photo.dateTaken && (
            <p className="text-xs text-gray-400 mb-1">
              {formatDate(photo.dateTaken)}
            </p>
          )}

          {/* Caption */}
          {editingCaption ? (
            <div className="mb-4">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full border-b-2 border-primary-200 focus:border-primary-500 outline-none py-1 text-gray-800"
                placeholder="Add a caption..."
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveCaption}
                  className="text-xs text-primary-500 font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingCaption(false)}
                  className="text-xs text-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              className="text-gray-800 mb-4 cursor-pointer hover:text-primary-600 transition-colors"
              onClick={() => setEditingCaption(true)}
            >
              {photo.caption || (
                <span className="text-gray-300 italic text-sm">
                  Tap to add a caption...
                </span>
              )}
            </p>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 my-3" />

          {/* Comments */}
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Notes
          </h3>

          {photo.comments.length === 0 ? (
            <p className="text-gray-300 text-sm italic mb-4">
              No notes yet. Be the first to write one.
            </p>
          ) : (
            <div className="space-y-3 mb-4">
              {photo.comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-500 flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {comment.author}
                      </span>
                      <span className="text-xs text-gray-300">
                        {formatDate(comment.date)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Comment input */}
        <div className="border-t border-gray-100 p-4">
          {!authorName && (
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 mb-2 outline-none focus:border-primary-300 transition-colors"
            />
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a note..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-primary-300 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendComment()
                }
              }}
            />
            <button
              onClick={handleSendComment}
              disabled={!commentText.trim() || !authorName.trim() || sending}
              className="bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 text-white disabled:text-gray-400 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
