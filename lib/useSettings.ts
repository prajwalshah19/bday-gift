'use client'

import { useState, useCallback } from 'react'

export type MapStyle = 'watercolor' | 'light' | 'dark'

export interface Settings {
  showJourneyLines: boolean
  mapStyle: MapStyle
}

const STORAGE_KEY = 'app_settings'

const defaults: Settings = {
  showJourneyLines: true,
  mapStyle: 'watercolor',
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaults, ...JSON.parse(raw) }
  } catch {}
  return defaults
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return [settings, updateSettings]
}
