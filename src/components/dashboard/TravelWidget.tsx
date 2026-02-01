'use client'

import { useMemo, useState, useEffect } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
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
  allEntries?: DailyEntryWithRelations[] // All-time entries for "days since" (ignores date filters)
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

// Extract just the city name from a full address like "New Orleans, Louisiana, United States"
function extractCityName(fullName: string): string {
  if (!fullName) return ''
  // Take only the first part before the comma
  return fullName.split(',')[0].trim()
}

export function TravelWidget({ entries, allEntries, profile, title = 'Travel', subtitle }: TravelWidgetProps) {
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

  // Calculate travel stats (respects date filters)
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
      if (entry.life_events?.some((e) => e.event_type === 'flight')) {
        flights++
      }
      if (entry.life_events?.some((e) => e.event_type === 'train')) {
        trains++
      }

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

  // Calculate "days since" from all-time data (ignores date filters)
  // Also calculates median gaps and overdue status like EventsTracker
  const daysSince = useMemo(() => {
    const homeCity = profile.home_city?.toLowerCase() || ''
    const today = new Date()
    const sourceEntries = allEntries || entries

    // Track dates and cities for "days since" calculations
    const awayData: { date: string; city: string }[] = []
    const flightData: { date: string; city: string }[] = []
    const trainData: { date: string; city: string }[] = []

    sourceEntries.forEach((entry) => {
      if (entry.life_events?.some((e) => e.event_type === 'flight')) {
        // Use sleep city as destination for flights
        const city = entry.city_sleep || entry.city_noon || ''
        flightData.push({ date: entry.entry_date, city })
      }
      if (entry.life_events?.some((e) => e.event_type === 'train')) {
        // Use sleep city as destination for trains
        const city = entry.city_sleep || entry.city_noon || ''
        trainData.push({ date: entry.entry_date, city })
      }

      const sleepCity = entry.city_sleep || ''
      const sleepCityLower = sleepCity.toLowerCase()
      if (sleepCityLower && sleepCityLower !== 'home' && sleepCityLower !== 'unknown' && sleepCityLower !== homeCity) {
        awayData.push({ date: entry.entry_date, city: sleepCity })
      }
    })

    const calculateStats = (data: { date: string; city: string }[]) => {
      if (data.length === 0) {
        return { daysSince: null, lastDate: null, lastCity: null, medianGap: null, isOverdue: false }
      }

      // Sort descending by date
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
      const lastDate = sorted[0].date
      const lastCity = sorted[0].city
      const daysSinceVal = differenceInDays(today, parseISO(lastDate))

      // Calculate median gap (need at least 2 occurrences)
      let medianGap: number | null = null
      if (data.length >= 2) {
        const sortedDates = data
          .map((d) => parseISO(d.date))
          .sort((a, b) => a.getTime() - b.getTime())

        const gaps: number[] = []
        for (let i = 1; i < sortedDates.length; i++) {
          gaps.push(differenceInDays(sortedDates[i], sortedDates[i - 1]))
        }
        gaps.sort((a, b) => a - b)

        const mid = Math.floor(gaps.length / 2)
        medianGap = gaps.length % 2 === 0
          ? Math.round((gaps[mid - 1] + gaps[mid]) / 2)
          : gaps[mid]
      }

      const isOverdue = daysSinceVal !== null && medianGap !== null && daysSinceVal > medianGap

      return { daysSince: daysSinceVal, lastDate, lastCity, medianGap, isOverdue }
    }

    return {
      away: calculateStats(awayData),
      flight: calculateStats(flightData),
      train: calculateStats(trainData),
    }
  }, [allEntries, entries, profile.home_city])

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
          {/* Away */}
          <div className="relative group text-center p-2 bg-indigo-50 rounded-lg cursor-help">
            <div className="flex items-center justify-center mb-1">
              <Moon className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-lg font-bold text-indigo-700">{stats.nightsAway}</p>
            <p className="text-[10px] text-indigo-600">Away</p>
            {daysSince.away.daysSince !== null && (
              <p className={`text-[9px] ${daysSince.away.isOverdue ? 'text-red-500' : 'text-indigo-400'}`}>
                {daysSince.away.daysSince}d ago
              </p>
            )}
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                {daysSince.away.lastCity && daysSince.away.lastDate && (
                  <div className="font-medium text-gray-900 mb-1">
                    Last: {extractCityName(daysSince.away.lastCity)} {format(parseISO(daysSince.away.lastDate), 'M/d')}
                  </div>
                )}
                {stats.sleepCities.length > 0 && (
                  <>
                    <div className="text-gray-400 text-[10px] mb-1">Top places</div>
                    <div className="text-gray-500 space-y-0.5">
                      {stats.sleepCities.slice(0, 5).map((c, i) => (
                        <div key={i}>{extractCityName(c.name)} ({c.nights})</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Flights */}
          <div className="relative group text-center p-2 bg-cyan-50 rounded-lg cursor-help">
            <div className="flex items-center justify-center mb-1">
              <Plane className="h-4 w-4 text-cyan-500" />
            </div>
            <p className="text-lg font-bold text-cyan-700">{stats.flights}</p>
            <p className="text-[10px] text-cyan-600">Flights</p>
            {daysSince.flight.daysSince !== null && (
              <p className={`text-[9px] ${daysSince.flight.isOverdue ? 'text-red-500' : 'text-cyan-400'}`}>
                {daysSince.flight.daysSince}d ago
              </p>
            )}
            {daysSince.flight.lastCity && daysSince.flight.lastDate && (
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    Last: {extractCityName(daysSince.flight.lastCity)} {format(parseISO(daysSince.flight.lastDate), 'M/d')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trains */}
          <div className="relative group text-center p-2 bg-amber-50 rounded-lg cursor-help">
            <div className="flex items-center justify-center mb-1">
              <Train className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-amber-700">{stats.trains}</p>
            <p className="text-[10px] text-amber-600">Trains</p>
            {daysSince.train.daysSince !== null && (
              <p className={`text-[9px] ${daysSince.train.isOverdue ? 'text-red-500' : 'text-amber-400'}`}>
                {daysSince.train.daysSince}d ago
              </p>
            )}
            {daysSince.train.lastCity && daysSince.train.lastDate && (
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    Last: {extractCityName(daysSince.train.lastCity)} {format(parseISO(daysSince.train.lastDate), 'M/d')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cities */}
          <div className="relative group text-center p-2 bg-emerald-50 rounded-lg cursor-help">
            <div className="flex items-center justify-center mb-1">
              <MapPin className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-700">{stats.uniqueCityCount}</p>
            <p className="text-[10px] text-emerald-600">Cities</p>
            {stats.cities.length > 0 && (
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                  <div className="font-medium text-gray-900 mb-1">Top cities</div>
                  <div className="text-gray-500 space-y-0.5">
                    {[...stats.cities].sort((a, b) => b.days - a.days).slice(0, 5).map((c, i) => (
                      <div key={i}>{extractCityName(c.name)} ({c.days})</div>
                    ))}
                  </div>
                </div>
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
