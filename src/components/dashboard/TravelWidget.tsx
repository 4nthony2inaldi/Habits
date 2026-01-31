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

export function TravelWidget({ entries, profile, title = 'Travel', subtitle }: TravelWidgetProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Helper function to group consecutive dates into trips
  const groupDatesIntoTrips = (dates: string[]): Trip[] => {
    if (dates.length === 0) return []

    // Sort dates chronologically
    const sortedDates = [...dates].sort()
    const trips: Trip[] = []

    let tripStart = sortedDates[0]
    let tripEnd = sortedDates[0]

    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i])
      const previousDate = new Date(sortedDates[i - 1])

      // Check if dates are consecutive (within 1 day)
      const diffInDays = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)

      if (diffInDays <= 1) {
        // Extend current trip
        tripEnd = sortedDates[i]
      } else {
        // Start new trip
        trips.push({ startDate: tripStart, endDate: tripEnd })
        tripStart = sortedDates[i]
        tripEnd = sortedDates[i]
      }
    }

    // Add the last trip
    trips.push({ startDate: tripStart, endDate: tripEnd })

    return trips
  }

  // Calculate travel stats
  const stats = useMemo(() => {
    const homeCity = profile.home_city?.toLowerCase() || ''

    // Count nights away (city_sleep is not home or unknown/empty)
    let nightsAway = 0
    let flights = 0
    let trains = 0
    // Track unique dates per location coordinate key
    const cityDatesMap = new Map<string, { name: string; lat: number; lng: number; dates: Set<string> }>()
    // Track sleep cities for tooltip
    const sleepCitiesMap = new Map<string, number>()

    entries.forEach((entry) => {
      // Count flights and trains from life_events
      if (entry.life_events?.some((e) => e.event_type === 'flight')) flights++
      if (entry.life_events?.some((e) => e.event_type === 'train')) trains++

      // Check if slept away from home
      const sleepCity = entry.city_sleep || ''
      const sleepCityLower = sleepCity.toLowerCase()
      if (sleepCityLower && sleepCityLower !== 'home' && sleepCityLower !== 'unknown' && sleepCityLower !== homeCity) {
        nightsAway++
        // Track sleep city with original casing
        const existingCount = sleepCitiesMap.get(sleepCity) || 0
        sleepCitiesMap.set(sleepCity, existingCount + 1)
      }

      // Collect unique cities with coordinates (from wake, noon, sleep locations)
      // Track by date to count unique days, not individual entries
      const entryDate = entry.entry_date
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
            const existing = cityDatesMap.get(key)
            if (existing) {
              existing.dates.add(entryDate)
            } else {
              cityDatesMap.set(key, { name, lat, lng, dates: new Set([entryDate]) })
            }
          }
        }
      })
    })

    // Convert to CityData with trips
    const cities: CityData[] = Array.from(cityDatesMap.values()).map(({ name, lat, lng, dates }) => {
      const datesArray = Array.from(dates)
      return {
        name,
        lat,
        lng,
        days: datesArray.length,
        trips: groupDatesIntoTrips(datesArray),
      }
    })

    // Convert sleep cities map to sorted array (by nights, descending)
    const sleepCities = Array.from(sleepCitiesMap.entries())
      .map(([name, nights]) => ({ name, nights }))
      .sort((a, b) => b.nights - a.nights)

    return {
      nightsAway,
      flights,
      trains,
      cities,
      uniqueCityCount: cities.length,
      sleepCities,
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
          <div className="relative group text-center p-2 bg-indigo-50 rounded-lg cursor-help">
            <div className="flex items-center justify-center mb-1">
              <Moon className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-lg font-bold text-indigo-700">{stats.nightsAway}</p>
            <p className="text-[10px] text-indigo-600">Nights Away</p>
            {stats.sleepCities.length > 0 && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                  <div className="font-medium mb-1">Places stayed:</div>
                  {stats.sleepCities.map((c, i) => (
                    <div key={i} className="text-gray-300">{c.name} ({c.nights})</div>
                  ))}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </div>
            )}
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
          <div className="relative group text-center p-2 bg-emerald-50 rounded-lg cursor-help">
            <div className="flex items-center justify-center mb-1">
              <MapPin className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-700">{stats.uniqueCityCount}</p>
            <p className="text-[10px] text-emerald-600">Cities</p>
            {stats.cities.length > 0 && (
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                  <div className="font-medium mb-1">Cities visited:</div>
                  {[...stats.cities].sort((a, b) => b.days - a.days).map((c, i) => (
                    <div key={i} className="text-gray-300">{c.name} ({c.days} days)</div>
                  ))}
                </div>
                <div className="absolute right-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </div>
            )}
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
