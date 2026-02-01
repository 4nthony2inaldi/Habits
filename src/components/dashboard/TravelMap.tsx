'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Trip {
  startDate: string
  endDate: string
}

interface CityData {
  name: string
  lat: number
  lng: number
  days: number
  trips: Trip[]
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

    // Format date as M/D/YY
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr + 'T00:00:00')
      const month = date.getMonth() + 1
      const day = date.getDate()
      const year = date.getFullYear().toString().slice(-2)
      return `${month}/${day}/${year}`
    }

    // Format trip as date range or single date
    const formatTrip = (trip: Trip) => {
      if (trip.startDate === trip.endDate) {
        return formatDate(trip.startDate)
      }
      return `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`
    }

    // Custom marker icon
    const createIcon = (days: number) => {
      const size = Math.min(30, Math.max(20, 10 + days * 2))
      return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: ${size}px;
          height: ${size}px;
          background-color: rgba(8, 145, 178, 0.55);
          border: 2px solid rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        ">${days > 1 ? days : ''}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
    }

    // Add markers for each city
    cities.forEach((city) => {
      const marker = L.marker([city.lat, city.lng], {
        icon: createIcon(city.days),
      }).addTo(map)

      // Build trip list for popup - limit to 5 most recent trips
      const recentTrips = city.trips.slice(-5)
      const tripLines = recentTrips.map((trip) => formatTrip(trip)).join('<br/>')
      const moreTrips = city.trips.length > 5 ? `<br/><span style="color: #999; font-size: 10px;">+${city.trips.length - 5} more</span>` : ''

      marker.bindPopup(`
        <div style="text-align: center; min-width: 120px;">
          <strong>${city.name}</strong>
          <br/>
          <span style="color: #666; font-size: 12px;">${tripLines}${moreTrips}</span>
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
      className="flex-1 min-h-0 rounded-lg relative"
      style={{ minHeight: '150px' }}
    />
  )
}
