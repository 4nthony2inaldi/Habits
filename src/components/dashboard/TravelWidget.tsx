'use client'

import { useMemo, useState, useEffect } from 'react'
import { Plane, Train, MapPin, Moon } from 'lucide-react'
import type { DailyEntryWithRelations, Profile } from '@/types/database'
import dynamic from 'next/dynamic'

// Dynamically import the map component to avoid SSR issues with Leaflet
const TravelMap = dynamic(() => import('./TravelMap'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 min-h-0 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
      Loading map...
    </div>
  ),
})

interface TravelWidgetProps {
  entries: DailyEntryWithRelations[]
  profile: Profile
  title?: string
  subtitle?: string
}

interface CityData {
  name: string
  lat: number
  lng: number
  count: number
}

export function TravelWidget({ entries, profile, title = 'Travel', subtitle }: TravelWidgetProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate travel stats
  const stats = useMemo(() => {
    const homeCity = profile.home_city?.toLowerCase() || ''

    // Count nights away (city_sleep is not home or unknown/empty)
    let nightsAway = 0
    let flights = 0
    let trains = 0
    const citiesSet = new Map<string, CityData>()

    entries.forEach((entry) => {
      // Count flights and trains from life_events
      if (entry.life_events?.some((e) => e.event_type === 'flight')) flights++
      if (entry.life_events?.some((e) => e.event_type === 'train')) trains++

      // Check if slept away from home
      const sleepCity = entry.city_sleep?.toLowerCase() || ''
      if (sleepCity && sleepCity !== 'home' && sleepCity !== 'unknown' && sleepCity !== homeCity) {
        nightsAway++
      }

      // Collect unique cities with coordinates (from wake, noon, sleep locations)
      const locations = [
        { name: entry.city_wake, lat: entry.city_wake_lat, lng: entry.city_wake_lng },
        { name: entry.city_noon, lat: entry.city_noon_lat, lng: entry.city_noon_lng },
        { name: entry.city_sleep, lat: entry.city_sleep_lat, lng: entry.city_sleep_lng },
      ]

      locations.forEach(({ name, lat, lng }) => {
        if (name && lat && lng) {
          const normalizedName = name.toLowerCase()
          // Exclude home, unknown, and empty values
          if (normalizedName !== 'home' && normalizedName !== 'unknown' && normalizedName !== homeCity) {
            const key = `${lat.toFixed(2)},${lng.toFixed(2)}` // Group nearby coordinates
            const existing = citiesSet.get(key)
            if (existing) {
              existing.count++
            } else {
              citiesSet.set(key, { name, lat, lng, count: 1 })
            }
          }
        }
      })
    })

    return {
      nightsAway,
      flights,
      trains,
      cities: Array.from(citiesSet.values()),
      uniqueCityCount: citiesSet.size,
    }
  }, [entries, profile.home_city])

  // No travel data
  if (stats.nightsAway === 0 && stats.flights === 0 && stats.trains === 0 && stats.cities.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-cyan-500" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No travel data available
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-cyan-500" />
          {title}
        </h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-indigo-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Moon className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-lg font-bold text-indigo-700">{stats.nightsAway}</p>
            <p className="text-[10px] text-indigo-600">Nights Away</p>
          </div>
          <div className="text-center p-2 bg-cyan-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Plane className="h-4 w-4 text-cyan-500" />
            </div>
            <p className="text-lg font-bold text-cyan-700">{stats.flights}</p>
            <p className="text-[10px] text-cyan-600">Flights</p>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Train className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-amber-700">{stats.trains}</p>
            <p className="text-[10px] text-amber-600">Trains</p>
          </div>
          <div className="text-center p-2 bg-emerald-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <MapPin className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-700">{stats.uniqueCityCount}</p>
            <p className="text-[10px] text-emerald-600">Cities</p>
          </div>
        </div>

        {/* Map */}
        {mounted && stats.cities.length > 0 && (
          <TravelMap cities={stats.cities} />
        )}

        {/* Fallback if no cities with coordinates */}
        {stats.cities.length === 0 && (
          <div className="flex-1 min-h-0 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
            No city coordinates available for map
          </div>
        )}
      </div>
    </div>
  )
}
