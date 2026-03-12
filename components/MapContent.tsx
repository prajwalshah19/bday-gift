'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import Supercluster from 'supercluster'
import type { Photo } from '@/lib/types'
import type { MapStyle } from '@/lib/useSettings'

interface MapContentProps {
  photos: Photo[]
  onPhotoClick: (photo: Photo) => void
  flyToPhoto: Photo | null
  mapStyle: MapStyle
  showJourneyLines: boolean
}

const TILE_URLS: Record<MapStyle, string> = {
  watercolor:
    'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  light:
    'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark:
    'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

const BG_COLORS: Record<MapStyle, string> = {
  watercolor: '#f0ebe3',
  light: '#e8e8e8',
  dark: '#1a1a2e',
}

function buildStyle(style: MapStyle): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: [TILE_URLS[style]],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': BG_COLORS[style],
        },
      },
      {
        id: 'raster-layer',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: 20,
        paint: {
          'raster-fade-duration': 300,
        },
      },
    ],
    sky: {
      'sky-color': '#fdf2f4',
      'horizon-color': '#fecdd3',
      'fog-color': '#fdf2f4',
      'sky-horizon-blend': 0.5,
      'horizon-fog-blend': 0.5,
      'fog-ground-blend': 0.3,
    },
  }
}

type PhotoFeature = GeoJSON.Feature<GeoJSON.Point, { index: number }>

export default function MapContent({
  photos,
  onPhotoClick,
  flyToPhoto,
  mapStyle,
  showJourneyLines,
}: MapContentProps) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clusters, setClusters] = useState<any[]>([])

  // Memoize style so it only changes when mapStyle prop changes
  const memoizedStyle = useMemo(() => buildStyle(mapStyle), [mapStyle])

  // Supercluster index
  const superclusterRef = useRef<Supercluster<{ index: number }>>(
    new Supercluster({ radius: 60, maxZoom: 16 }),
  )

  const points: PhotoFeature[] = useMemo(
    () =>
      photos.map((p, i) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: { index: i },
      })),
    [photos],
  )

  useEffect(() => {
    superclusterRef.current = new Supercluster({ radius: 60, maxZoom: 16 })
    superclusterRef.current.load(points)
    updateClusters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points])

  const updateClusters = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const bounds = map.getBounds()
    const zoom = Math.floor(map.getZoom())
    const bbox: GeoJSON.BBox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]
    const c = superclusterRef.current.getClusters(bbox, zoom) as unknown[]
    setClusters(c)
  }, [])

  // Fit bounds on initial load / photo changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || photos.length === 0) return
    const timeout = setTimeout(() => {
      if (photos.length === 1) {
        map.flyTo({ center: [photos[0].lng, photos[0].lat], zoom: 12, duration: 1500 })
      } else {
        const bounds = new maplibregl.LngLatBounds()
        photos.forEach((p) => bounds.extend([p.lng, p.lat]))
        map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1500 })
      }
    }, 500)
    return () => clearTimeout(timeout)
  }, [photos])

  // Fly to selected photo
  useEffect(() => {
    const map = mapRef.current
    if (!map || !flyToPhoto) return
    map.flyTo({
      center: [flyToPhoto.lng, flyToPhoto.lat],
      zoom: 15,
      duration: 2000,
    })
  }, [flyToPhoto])

  // Journey line GeoJSON
  const journeyLine = useMemo(() => {
    if (!showJourneyLines || photos.length < 2) return null
    const sorted = [...photos].sort((a, b) => {
      const da = a.dateTaken || a.dateUploaded
      const db = b.dateTaken || b.dateUploaded
      return new Date(da).getTime() - new Date(db).getTime()
    })
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: sorted.map((p) => [p.lng, p.lat]),
      },
      properties: {},
    }
  }, [photos, showJourneyLines])

  function handleClusterClick(
    clusterId: number,
    lng: number,
    lat: number,
  ) {
    const zoom = superclusterRef.current.getClusterExpansionZoom(clusterId)
    mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1000 })
  }

  // Register native map events for cluster updates (no React re-renders)
  const handleMapLoad = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    map.on('moveend', updateClusters)
    map.on('zoomend', updateClusters)
    updateClusters()
  }, [updateClusters])

  const initialViewState = useMemo(() => ({
    longitude: photos.length > 0 ? photos[0].lng : -30,
    latitude: photos.length > 0 ? photos[0].lat : 40,
    zoom: photos.length > 0 ? 3 : 1.5,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []) // intentionally empty — only compute once on mount

  return (
    <div className="w-full h-screen globe-bg">
      <Map
        ref={(ref) => {
          if (ref) mapRef.current = ref.getMap()
        }}
        initialViewState={initialViewState}
        onLoad={handleMapLoad}
        mapLib={maplibregl}
        style={{ width: '100%', height: '100%' }}
        mapStyle={memoizedStyle}
        projection={{ type: 'globe' }}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} visualizePitch={false} />

        {/* Journey lines */}
        {journeyLine && (
          <Source id="journey" type="geojson" data={journeyLine}>
            <Layer
              id="journey-line"
              type="line"
              paint={{
                'line-color': '#f9a8b8',
                'line-width': 3,
                'line-opacity': 0.5,
                'line-dasharray': [6, 10],
              }}
            />
          </Source>
        )}

        {/* Clusters and markers */}
        {clusters.map((feature: GeoJSON.Feature<GeoJSON.Point>) => {
          const [lng, lat] = feature.geometry.coordinates
          const props = feature.properties as Record<string, unknown>
          const isCluster = props.cluster === true

          if (isCluster) {
            const clusterId = props.cluster_id as number
            const pointCount = props.point_count as number
            return (
              <Marker key={`cluster-${clusterId}`} longitude={lng} latitude={lat}>
                <button
                  className="cluster-marker"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClusterClick(clusterId, lng, lat)
                  }}
                >
                  {pointCount}
                </button>
              </Marker>
            )
          }

          const photo = photos[props.index as number]
          if (!photo) return null

          return (
            <Marker key={photo.id} longitude={lng} latitude={lat}>
              <button
                className="marker-circle animate-bounce-in"
                onClick={(e) => {
                  e.stopPropagation()
                  onPhotoClick(photo)
                }}
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.caption || ''}
                  loading="lazy"
                />
              </button>
            </Marker>
          )
        })}
      </Map>

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 text-center shadow-lg max-w-sm mx-4">
            <div className="text-5xl mb-4">📍</div>
            <h2 className="font-script text-2xl text-primary-600 mb-2">
              No memories yet
            </h2>
            <p className="text-gray-400 text-sm">
              Tap the <span className="text-primary-500 font-bold">+</span> button
              to add your first photo
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
