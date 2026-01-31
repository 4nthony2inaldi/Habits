'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface CityData {
  name: string
  lat: number
  lng: number
  count: number
}

interface TravelMapProps {
  cities: CityData[]
}

export default function TravelMap({ cities }: TravelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || cities.length === 0) return

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    // Calculate bounds to fit all cities
    const bounds = L.latLngBounds(cities.map((c) => [c.lat, c.lng]))

    // Create map
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false, // Disable scroll zoom to prevent accidental zooming
      attributionControl: false, // Hide attribution for cleaner look in widget
    })

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Fit bounds with padding
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 })

    // Custom marker icon
    const createIcon = (count: number) => {
      const size = Math.min(30, Math.max(20, 10 + count * 2))
      return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: ${size}px;
          height: ${size}px;
          background-color: #0891b2;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        ">${count > 1 ? count : ''}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
    }

    // Add markers for each city
    cities.forEach((city) => {
      const marker = L.marker([city.lat, city.lng], {
        icon: createIcon(city.count),
      }).addTo(map)

      marker.bindPopup(`
        <div style="text-align: center; min-width: 100px;">
          <strong>${city.name}</strong>
          <br/>
          <span style="color: #666; font-size: 12px;">${city.count} visit${city.count > 1 ? 's' : ''}</span>
        </div>
      `)
    })

    mapRef.current = map

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [cities])

  return (
    <div
      ref={mapContainerRef}
      className="flex-1 min-h-0 rounded-lg overflow-hidden"
      style={{ minHeight: '150px' }}
    />
  )
}
