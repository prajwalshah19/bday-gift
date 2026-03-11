'use client'

import { useState, useRef, useEffect } from 'react'

interface AuthGateProps {
  onSuccess: () => void
}

export default function AuthGate({ onSuccess }: AuthGateProps) {
  const [pin, setPin] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  async function handleSubmit(currentPin: string[]) {
    const fullPin = currentPin.join('')
    if (fullPin.length !== 4) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: fullPin }),
      })

      if (res.ok) {
        onSuccess()
      } else {
        setError('Wrong code, try again')
        setPin(['', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch {
      setError('Something went wrong')
    }
    setLoading(false)
  }

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return

    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)
    setError('')

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    if (value && index === 3) {
      handleSubmit(newPin)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-primary-50 px-4">
      <div className="text-center animate-fade-in">
        {/* Heart */}
        <div className="text-6xl mb-6 heart-beat">💝</div>

        {/* Title */}
        <h1 className="font-script text-5xl text-primary-600 mb-2">
          Our Map
        </h1>
        <p className="text-gray-400 text-sm mb-10">
          Enter our secret code
        </p>

        {/* PIN Input */}
        <div className="flex gap-3 justify-center mb-6">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className="pin-input w-14 h-14 text-center text-2xl font-medium bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 disabled:opacity-50"
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-primary-500 text-sm animate-slide-up">{error}</p>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-gray-400 text-sm animate-pulse-soft">
            Checking...
          </p>
        )}
      </div>
    </div>
  )
}
