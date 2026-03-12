'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import Map, { Marker } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'

interface LocationPickerProps {
  initialLat?: number | null
  initialLng?: number | null
  onConfirm: (lat: number, lng: number) => void
  onCancel: () => void
}

const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'raster-tiles': {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'],
      tileSize: 256,
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#e8e8e8' } },
    { id: 'tiles', type: 'raster', source: 'raster-tiles', minzoom: 0, maxzoom: 20 },
  ],
}

export default function LocationPicker({
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
}: LocationPickerProps) {
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  )
  const mapRef = useRef<maplibregl.Map | null>(null)

  const initialViewState = useMemo(() => ({
    longitude: initialLng || 0,
    latitude: initialLat || 20,
    zoom: initialLat ? 10 : 2,
  }), [initialLat, initialLng])

  const handleClick = useCallback((e: maplibregl.MapMouseEvent) => {
    setPin({ lat: e.lngLat.lat, lng: e.lngLat.lng })
  }, [])

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

      <div
        className="relative bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[80vh] flex flex-col animate-slide-up shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="font-script text-xl text-primary-600">Pick a location</h3>
            <p className="text-xs text-gray-400 mt-0.5">Tap the map to place a pin</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Map */}
        <div className="h-72 sm:h-80">
          <Map
            ref={(ref) => { if (ref) mapRef.current = ref.getMap() }}
            initialViewState={initialViewState}
            mapLib={maplibregl}
            style={{ width: '100%', height: '100%' }}
            mapStyle={mapStyle}
            attributionControl={false}
            onClick={handleClick}
          >
            {pin && (
              <Marker longitude={pin.lng} latitude={pin.lat} anchor="bottom">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-primary-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                  <div className="w-2 h-2 bg-primary-500 rounded-full -mt-1 shadow" />
                </div>
              </Marker>
            )}
          </Map>
        </div>

        {/* Coordinates display */}
        {pin && (
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 text-center">
            {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
          </div>
        )}

        {/* Actions */}
        <div className="p-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => pin && onConfirm(pin.lat, pin.lng)}
            disabled={!pin}
            className="flex-1 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-gray-200 text-white disabled:text-gray-400 text-sm font-medium transition-all duration-200 active:scale-[0.98]"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
