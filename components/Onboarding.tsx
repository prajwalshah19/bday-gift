'use client'

import { useState } from 'react'

interface OnboardingProps {
  onComplete: () => void
}

const slides = [
  {
    emoji: '🗺️',
    title: 'Welcome to Our Map',
    body: 'A little corner of the internet, just for us.',
  },
  {
    emoji: '📸',
    title: 'Our Memories, Mapped',
    body: 'Upload our photos and watch them appear on the map — each one pinned right where the moment happened.',
  },
  {
    emoji: '💌',
    title: 'A Note For You',
    body: "Hi Jhanvi, happy birthday! I love you and I miss you so much. Every pin on this map is a memory that we shared together — and I can't wait to make so many more! I hope you enjoy it and can't wait to fill it with so many more! — Prajie",
  },
]

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  function nextSlide() {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }

  const slide = slides[currentSlide]
  const isLast = currentSlide === slides.length - 1

  return (
    <div className="h-screen overflow-auto flex items-center justify-center bg-gradient-to-b from-white to-primary-50 px-4">
      <div className="max-w-md w-full text-center py-12">
        {/* Slide content */}
        <div key={currentSlide} className="animate-fade-in">
          <div className="text-6xl mb-8 animate-float">{slide.emoji}</div>
          <h2 className="font-script text-4xl text-primary-600 mb-4">
            {slide.title}
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed mb-12 px-4">
            {slide.body}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? 'bg-primary-500 w-6'
                  : 'bg-primary-200'
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={nextSlide}
          className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-full text-lg font-medium transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg"
        >
          {isLast ? 'Begin Our Journey' : 'Continue'}
        </button>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onComplete}
            className="block mx-auto mt-4 text-gray-400 text-sm hover:text-gray-500 transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
