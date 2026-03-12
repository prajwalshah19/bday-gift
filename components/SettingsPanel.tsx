'use client'

import type { Settings, MapStyle } from '@/lib/useSettings'

interface SettingsPanelProps {
  settings: Settings
  onUpdateSettings: (patch: Partial<Settings>) => void
  onClose: () => void
}

const styleOptions: { value: MapStyle; label: string; desc: string }[] = [
  { value: 'watercolor', label: 'Watercolor', desc: 'Painterly & warm' },
  { value: 'light', label: 'Light', desc: 'Clean & minimal' },
  { value: 'dark', label: 'Dark', desc: 'Moody nighttime' },
]

export default function SettingsPanel({
  settings,
  onUpdateSettings,
  onClose,
}: SettingsPanelProps) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      <div
        className="relative bg-white w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-script text-2xl text-primary-600">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Journey Lines Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Journey Lines</p>
              <p className="text-xs text-gray-400">Connect photos chronologically</p>
            </div>
            <button
              onClick={() =>
                onUpdateSettings({ showJourneyLines: !settings.showJourneyLines })
              }
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                settings.showJourneyLines ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  settings.showJourneyLines ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Map Style */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Map Style</p>
            <div className="grid grid-cols-3 gap-2">
              {styleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdateSettings({ mapStyle: opt.value })}
                  className={`rounded-xl p-3 text-center transition-all duration-200 border-2 ${
                    settings.mapStyle === opt.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-700">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
