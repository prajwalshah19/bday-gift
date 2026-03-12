'use client'

import { useEffect } from 'react'

// Sky palettes for different times of day
const SKY_THEMES = {
  // 5am–8am  — sunrise: peach, gold, soft blue
  sunrise: {
    top: '#87CEEB',
    mid: '#f6d5a0',
    bottom: '#f4a77a',
    cloud: 0.6,
  },
  // 8am–5pm  — daytime: classic blue sky
  day: {
    top: '#a8d8f0',
    mid: '#d4ecf9',
    bottom: '#fce4ec',
    cloud: 0.7,
  },
  // 5pm–8pm  — sunset: warm oranges, pinks, purple
  sunset: {
    top: '#6a5acd',
    mid: '#f4a77a',
    bottom: '#ff7eb3',
    cloud: 0.5,
  },
  // 8pm–5am  — night: deep blues, subtle stars via dimmed clouds
  night: {
    top: '#0f1b3d',
    mid: '#1a2a5e',
    bottom: '#2d1b4e',
    cloud: 0.12,
  },
}

function getTheme() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 8) return SKY_THEMES.sunrise
  if (hour >= 8 && hour < 17) return SKY_THEMES.day
  if (hour >= 17 && hour < 20) return SKY_THEMES.sunset
  return SKY_THEMES.night
}

export function useSkyTheme() {
  useEffect(() => {
    function apply() {
      const t = getTheme()
      const root = document.documentElement
      root.style.setProperty('--sky-top', t.top)
      root.style.setProperty('--sky-mid', t.mid)
      root.style.setProperty('--sky-bottom', t.bottom)
      root.style.setProperty('--cloud-opacity', String(t.cloud))
    }
    apply()
    // Re-check every 10 minutes
    const interval = setInterval(apply, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
}
