'use client'

import { useMemo, useState, useEffect } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { Plane, Train, MapPin, Moon, ZoomIn, ZoomOut } from 'lucide-react'
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

type ZoomLevel = 'cities' | 'regions' | 'continents'

// Country to continent mapping
const countryToContinent: Record<string, string> = {
  'united states': 'North America', 'usa': 'North America', 'canada': 'North America', 'mexico': 'North America',
  'united kingdom': 'Europe', 'uk': 'Europe', 'england': 'Europe', 'scotland': 'Europe', 'wales': 'Europe',
  'france': 'Europe', 'germany': 'Europe', 'italy': 'Europe', 'spain': 'Europe', 'portugal': 'Europe',
  'netherlands': 'Europe', 'belgium': 'Europe', 'switzerland': 'Europe', 'austria': 'Europe',
  'greece': 'Europe', 'ireland': 'Europe', 'poland': 'Europe', 'czech republic': 'Europe', 'czechia': 'Europe',
  'sweden': 'Europe', 'norway': 'Europe', 'denmark': 'Europe', 'finland': 'Europe',
  'morocco': 'Africa', 'egypt': 'Africa', 'south africa': 'Africa', 'kenya': 'Africa', 'tanzania': 'Africa',
  'japan': 'Asia', 'china': 'Asia', 'south korea': 'Asia', 'korea': 'Asia', 'thailand': 'Asia',
  'vietnam': 'Asia', 'indonesia': 'Asia', 'singapore': 'Asia', 'india': 'Asia', 'philippines': 'Asia',
  'australia': 'Oceania', 'new zealand': 'Oceania',
  'brazil': 'South America', 'argentina': 'South America', 'chile': 'South America', 'peru': 'South America',
  'colombia': 'South America', 'costa rica': 'Central America', 'panama': 'Central America',
  'puerto rico': 'Caribbean', 'jamaica': 'Caribbean', 'bahamas': 'Caribbean', 'cuba': 'Caribbean',
  'dominican republic': 'Caribbean', 'aruba': 'Caribbean', 'barbados': 'Caribbean',
}

// Continent center coordinates for display
const continentCenters: Record<string, { lat: number; lng: number }> = {
  'North America': { lat: 40, lng: -100 },
  'South America': { lat: -15, lng: -60 },
  'Central America': { lat: 15, lng: -85 },
  'Caribbean': { lat: 20, lng: -75 },
  'Europe': { lat: 50, lng: 10 },
  'Africa': { lat: 0, lng: 20 },
  'Asia': { lat: 35, lng: 100 },
  'Oceania': { lat: -25, lng: 135 },
}

// US state center coordinates
const usStateCenters: Record<string, { lat: number; lng: number }> = {
  'alabama': { lat: 32.8, lng: -86.8 }, 'alaska': { lat: 64, lng: -153 },
  'arizona': { lat: 34.3, lng: -111.7 }, 'arkansas': { lat: 34.9, lng: -92.4 },
  'california': { lat: 37.2, lng: -119.4 }, 'colorado': { lat: 39, lng: -105.5 },
  'connecticut': { lat: 41.6, lng: -72.7 }, 'delaware': { lat: 39, lng: -75.5 },
  'florida': { lat: 28.6, lng: -82.4 }, 'georgia': { lat: 32.6, lng: -83.4 },
  'hawaii': { lat: 20.8, lng: -156.3 }, 'idaho': { lat: 44.4, lng: -114.6 },
  'illinois': { lat: 40, lng: -89.2 }, 'indiana': { lat: 39.9, lng: -86.3 },
  'iowa': { lat: 42, lng: -93.5 }, 'kansas': { lat: 38.5, lng: -98.4 },
  'kentucky': { lat: 37.5, lng: -85.3 }, 'louisiana': { lat: 31, lng: -92 },
  'maine': { lat: 45.4, lng: -69 }, 'maryland': { lat: 39.3, lng: -76.6 },
  'massachusetts': { lat: 42.2, lng: -71.5 }, 'michigan': { lat: 44.2, lng: -85.4 },
  'minnesota': { lat: 46.3, lng: -94.3 }, 'mississippi': { lat: 32.7, lng: -89.7 },
  'missouri': { lat: 38.4, lng: -92.5 }, 'montana': { lat: 47, lng: -109.6 },
  'nebraska': { lat: 41.5, lng: -99.8 }, 'nevada': { lat: 39.3, lng: -116.6 },
  'new hampshire': { lat: 43.7, lng: -71.6 }, 'new jersey': { lat: 40.2, lng: -74.7 },
  'new mexico': { lat: 34.4, lng: -106 }, 'new york': { lat: 42.9, lng: -75.5 },
  'north carolina': { lat: 35.5, lng: -79.4 }, 'north dakota': { lat: 47.4, lng: -100.4 },
  'ohio': { lat: 40.4, lng: -82.8 }, 'oklahoma': { lat: 35.6, lng: -97.5 },
  'oregon': { lat: 44, lng: -120.5 }, 'pennsylvania': { lat: 40.9, lng: -77.8 },
  'rhode island': { lat: 41.7, lng: -71.5 }, 'south carolina': { lat: 33.9, lng: -80.9 },
  'south dakota': { lat: 44.4, lng: -100.2 }, 'tennessee': { lat: 35.8, lng: -86.3 },
  'texas': { lat: 31.5, lng: -99.4 }, 'utah': { lat: 39.3, lng: -111.7 },
  'vermont': { lat: 44, lng: -72.7 }, 'virginia': { lat: 37.5, lng: -78.8 },
  'washington': { lat: 47.4, lng: -120.5 }, 'west virginia': { lat: 38.9, lng: -80.5 },
  'wisconsin': { lat: 44.6, lng: -89.7 }, 'wyoming': { lat: 43, lng: -107.5 },
  'district of columbia': { lat: 38.9, lng: -77 }, 'washington dc': { lat: 38.9, lng: -77 },
}

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
  dates: string[] // Raw dates for re-grouping at higher zoom levels
}

// Extract just the city name from a full address like "New Orleans, Louisiana, United States"
function extractCityName(fullName: string): string {
  if (!fullName) return ''
  // Take only the first part before the comma
  return fullName.split(',')[0].trim()
}

// Parse location parts from a full address
function parseLocationParts(fullName: string): { city: string; state: string | null; country: string | null } {
  if (!fullName) return { city: '', state: null, country: null }
  const parts = fullName.split(',').map(p => p.trim())

  if (parts.length >= 3) {
    // Format: "City, State/Region, Country"
    return { city: parts[0], state: parts[1], country: parts[parts.length - 1] }
  } else if (parts.length === 2) {
    // Could be "City, Country" or "City, State" - check if second part is a US state
    const secondPart = parts[1].toLowerCase()
    if (usStateCenters[secondPart] || secondPart === 'united states' || secondPart === 'usa') {
      return { city: parts[0], state: parts[1], country: 'United States' }
    }
    return { city: parts[0], state: null, country: parts[1] }
  }
  return { city: parts[0], state: null, country: null }
}

// Get region key (state for US, country for others)
function getRegionKey(fullName: string): { key: string; displayName: string; isUS: boolean } {
  const { state, country } = parseLocationParts(fullName)
  const countryLower = country?.toLowerCase() || ''
  const isUS = countryLower === 'united states' || countryLower === 'usa'

  if (isUS && state) {
    return { key: state.toLowerCase(), displayName: state, isUS: true }
  }
  if (country) {
    return { key: countryLower, displayName: country, isUS: false }
  }
  return { key: 'unknown', displayName: 'Unknown', isUS: false }
}

// Get continent from location
function getContinent(fullName: string): string {
  const { country } = parseLocationParts(fullName)
  if (!country) return 'Unknown'
  const countryLower = country.toLowerCase()
  return countryToContinent[countryLower] || 'Unknown'
}

type TooltipId = 'away' | 'flights' | 'trains' | 'cities' | 'daysSinceTravel' | null

export function TravelWidget({ entries, allEntries, profile, title = 'Travel', subtitle }: TravelWidgetProps) {
  const [mounted, setMounted] = useState(false)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('regions') // Default to regions (states/countries)
  const [hasAutoAdjusted, setHasAutoAdjusted] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<TooltipId>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Toggle tooltip on tap (for mobile)
  const toggleTooltip = (id: TooltipId) => {
    setActiveTooltip(prev => prev === id ? null : id)
  }

  // Cycle through zoom levels
  const cycleZoomLevel = () => {
    setZoomLevel(prev => {
      if (prev === 'continents') return 'regions'
      if (prev === 'regions') return 'cities'
      return 'continents'
    })
  }

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
        dates: datesArray, // Keep raw dates for re-grouping
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

    const awayStats = calculateStats(awayData)
    const flightStats = calculateStats(flightData)
    const trainStats = calculateStats(trainData)

    // Calculate combined "days since any travel" - minimum of all travel types
    const allTravelStats = [awayStats, flightStats, trainStats].filter(s => s.daysSince !== null)
    let combined: { daysSince: number | null; lastDate: string | null; lastCity: string | null; travelType: string | null; medianGap: number | null; isOverdue: boolean } = {
      daysSince: null,
      lastDate: null,
      lastCity: null,
      travelType: null,
      medianGap: null,
      isOverdue: false,
    }

    if (allTravelStats.length > 0) {
      // Find the most recent travel (minimum daysSince)
      const mostRecent = allTravelStats.reduce((min, curr) =>
        (curr.daysSince !== null && (min.daysSince === null || curr.daysSince < min.daysSince)) ? curr : min
      )

      // Determine which type of travel was most recent
      let travelType = 'away'
      if (mostRecent === flightStats) travelType = 'flight'
      else if (mostRecent === trainStats) travelType = 'train'

      // Calculate combined median gap using all travel data
      const allTravelData = [...awayData, ...flightData, ...trainData]
      let combinedMedianGap: number | null = null
      if (allTravelData.length >= 2) {
        const sortedDates = allTravelData
          .map((d) => parseISO(d.date))
          .sort((a, b) => a.getTime() - b.getTime())

        // Remove duplicate dates
        const uniqueDates: Date[] = []
        sortedDates.forEach(date => {
          if (uniqueDates.length === 0 || date.getTime() !== uniqueDates[uniqueDates.length - 1].getTime()) {
            uniqueDates.push(date)
          }
        })

        if (uniqueDates.length >= 2) {
          const gaps: number[] = []
          for (let i = 1; i < uniqueDates.length; i++) {
            gaps.push(differenceInDays(uniqueDates[i], uniqueDates[i - 1]))
          }
          gaps.sort((a, b) => a - b)

          const mid = Math.floor(gaps.length / 2)
          combinedMedianGap = gaps.length % 2 === 0
            ? Math.round((gaps[mid - 1] + gaps[mid]) / 2)
            : gaps[mid]
        }
      }

      combined = {
        daysSince: mostRecent.daysSince,
        lastDate: mostRecent.lastDate,
        lastCity: mostRecent.lastCity,
        travelType,
        medianGap: combinedMedianGap,
        isOverdue: mostRecent.daysSince !== null && combinedMedianGap !== null && mostRecent.daysSince > combinedMedianGap,
      }
    }

    return {
      away: awayStats,
      flight: flightStats,
      train: trainStats,
      combined,
    }
  }, [allEntries, entries, profile.home_city])

  // Auto-switch to cities view if all travel is within a single country
  useEffect(() => {
    if (hasAutoAdjusted || stats.cities.length === 0) return

    // Get unique countries from all cities
    const countries = new Set<string>()
    stats.cities.forEach(city => {
      const { country } = parseLocationParts(city.name)
      if (country) {
        countries.add(country.toLowerCase())
      }
    })

    // If all travel is within one country, switch to cities view
    if (countries.size === 1) {
      setZoomLevel('cities')
      setHasAutoAdjusted(true)
    }
  }, [stats.cities, hasAutoAdjusted])

  // Reset auto-adjust when entries change (e.g., date filter change)
  useEffect(() => {
    setHasAutoAdjusted(false)
  }, [entries.length])

  // Group cities by zoom level
  const displayCities = useMemo((): CityData[] => {
    if (zoomLevel === 'cities') {
      return stats.cities
    }

    if (zoomLevel === 'regions') {
      // Group by state (US) or country (non-US)
      const regionMap = new Map<string, { displayName: string; lat: number; lng: number; dates: string[]; isUS: boolean }>()

      stats.cities.forEach(city => {
        const { key, displayName, isUS } = getRegionKey(city.name)

        if (regionMap.has(key)) {
          const existing = regionMap.get(key)!
          existing.dates = [...existing.dates, ...city.dates]
        } else {
          // Get center coordinates for the region
          let lat = city.lat
          let lng = city.lng
          if (isUS && usStateCenters[key]) {
            lat = usStateCenters[key].lat
            lng = usStateCenters[key].lng
          }
          regionMap.set(key, { displayName, lat, lng, dates: [...city.dates], isUS })
        }
      })

      return Array.from(regionMap.values()).map(r => {
        // Dedupe dates and recompute trips from combined dates
        const uniqueDates = [...new Set(r.dates)]
        return {
          name: r.displayName,
          lat: r.lat,
          lng: r.lng,
          days: uniqueDates.length,
          trips: groupDatesIntoTrips(uniqueDates),
          dates: uniqueDates,
        }
      })
    }

    // Continents
    const continentMap = new Map<string, { lat: number; lng: number; dates: string[] }>()

    stats.cities.forEach(city => {
      const continent = getContinent(city.name)

      if (continentMap.has(continent)) {
        const existing = continentMap.get(continent)!
        existing.dates = [...existing.dates, ...city.dates]
      } else {
        const center = continentCenters[continent] || { lat: city.lat, lng: city.lng }
        continentMap.set(continent, { lat: center.lat, lng: center.lng, dates: [...city.dates] })
      }
    })

    return Array.from(continentMap.entries()).map(([name, data]) => {
      // Dedupe dates and recompute trips from combined dates
      const uniqueDates = [...new Set(data.dates)]
      return {
        name,
        lat: data.lat,
        lng: data.lng,
        days: uniqueDates.length,
        trips: groupDatesIntoTrips(uniqueDates),
        dates: uniqueDates,
      }
    })
  }, [stats.cities, zoomLevel])

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
        {/* Days Since Travel Banner */}
        {daysSince.combined.daysSince !== null && (
          <button
            type="button"
            onClick={() => toggleTooltip('daysSinceTravel')}
            className={`relative group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
              daysSince.combined.isOverdue
                ? 'bg-gradient-to-r from-red-50 to-orange-50 active:from-red-100 active:to-orange-100'
                : 'bg-gradient-to-r from-cyan-50 to-indigo-50 active:from-cyan-100 active:to-indigo-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                daysSince.combined.isOverdue ? 'bg-red-100' : 'bg-cyan-100'
              }`}>
                {daysSince.combined.travelType === 'flight' ? (
                  <Plane className={`h-5 w-5 ${daysSince.combined.isOverdue ? 'text-red-500' : 'text-cyan-500'}`} />
                ) : daysSince.combined.travelType === 'train' ? (
                  <Train className={`h-5 w-5 ${daysSince.combined.isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
                ) : (
                  <Moon className={`h-5 w-5 ${daysSince.combined.isOverdue ? 'text-red-500' : 'text-indigo-500'}`} />
                )}
              </div>
              <div className="text-left">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Days Since Travel</p>
                <p className={`text-2xl font-bold ${daysSince.combined.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {daysSince.combined.daysSince}
                </p>
              </div>
            </div>
            <div className="text-right">
              {daysSince.combined.lastCity && (
                <p className="text-xs text-gray-600">{extractCityName(daysSince.combined.lastCity)}</p>
              )}
              {daysSince.combined.lastDate && (
                <p className="text-[10px] text-gray-400">{format(parseISO(daysSince.combined.lastDate), 'MMM d, yyyy')}</p>
              )}
              {daysSince.combined.medianGap !== null && (
                <p className={`text-[9px] ${daysSince.combined.isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                  typical: {daysSince.combined.medianGap}d
                </p>
              )}
            </div>
            {/* Tooltip */}
            <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 pointer-events-none ${activeTooltip === 'daysSinceTravel' ? 'block' : 'hidden group-hover:block'}`}>
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                <div className="font-medium text-gray-900 mb-1">
                  Last travel: {daysSince.combined.travelType === 'flight' ? 'Flight' : daysSince.combined.travelType === 'train' ? 'Train' : 'Night away'}
                </div>
                {daysSince.combined.isOverdue && (
                  <div className="text-red-500 text-[10px]">
                    Overdue by {daysSince.combined.daysSince! - daysSince.combined.medianGap!} days
                  </div>
                )}
              </div>
            </div>
          </button>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-2">
          {/* Away */}
          <button
            type="button"
            onClick={() => toggleTooltip('away')}
            className="relative group text-center p-2 bg-indigo-50 rounded-lg cursor-pointer active:bg-indigo-100 transition-colors"
          >
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
            <div className={`absolute left-0 bottom-full mb-2 z-50 pointer-events-none ${activeTooltip === 'away' ? 'block' : 'hidden group-hover:block'}`}>
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap text-left">
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
          </button>

          {/* Flights */}
          <button
            type="button"
            onClick={() => toggleTooltip('flights')}
            className="relative group text-center p-2 bg-cyan-50 rounded-lg cursor-pointer active:bg-cyan-100 transition-colors"
          >
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
              <div className={`absolute left-0 bottom-full mb-2 z-50 pointer-events-none ${activeTooltip === 'flights' ? 'block' : 'hidden group-hover:block'}`}>
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap text-left">
                  <div className="font-medium text-gray-900">
                    Last: {extractCityName(daysSince.flight.lastCity)} {format(parseISO(daysSince.flight.lastDate), 'M/d')}
                  </div>
                </div>
              </div>
            )}
          </button>

          {/* Trains */}
          <button
            type="button"
            onClick={() => toggleTooltip('trains')}
            className="relative group text-center p-2 bg-amber-50 rounded-lg cursor-pointer active:bg-amber-100 transition-colors"
          >
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
              <div className={`absolute left-0 bottom-full mb-2 z-50 pointer-events-none ${activeTooltip === 'trains' ? 'block' : 'hidden group-hover:block'}`}>
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap text-left">
                  <div className="font-medium text-gray-900">
                    Last: {extractCityName(daysSince.train.lastCity)} {format(parseISO(daysSince.train.lastDate), 'M/d')}
                  </div>
                </div>
              </div>
            )}
          </button>

          {/* Cities */}
          <button
            type="button"
            onClick={() => toggleTooltip('cities')}
            className="relative group text-center p-2 bg-emerald-50 rounded-lg cursor-pointer active:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center justify-center mb-1">
              <MapPin className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-700">{stats.uniqueCityCount}</p>
            <p className="text-[10px] text-emerald-600">Cities</p>
            {stats.cities.length > 0 && (
              <div className={`absolute right-0 bottom-full mb-2 z-50 pointer-events-none ${activeTooltip === 'cities' ? 'block' : 'hidden group-hover:block'}`}>
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs whitespace-nowrap text-left">
                  <div className="font-medium text-gray-900 mb-1">Top cities</div>
                  <div className="text-gray-500 space-y-0.5">
                    {[...stats.cities].sort((a, b) => b.days - a.days).slice(0, 5).map((c, i) => (
                      <div key={i}>{extractCityName(c.name)} ({c.days})</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Map with zoom controls */}
        {mounted && stats.cities.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col overflow-visible">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500">
                {zoomLevel === 'cities' ? `${displayCities.length} cities` :
                 zoomLevel === 'regions' ? `${displayCities.length} states/countries` :
                 `${displayCities.length} continents`}
              </span>
              <button
                onClick={cycleZoomLevel}
                className="flex items-center gap-1 text-[10px] text-cyan-600 hover:text-cyan-700 px-2 py-0.5 rounded hover:bg-cyan-50 transition-colors"
              >
                {zoomLevel === 'cities' ? <ZoomOut className="h-3 w-3" /> : <ZoomIn className="h-3 w-3" />}
                {zoomLevel === 'continents' ? 'Regions' : zoomLevel === 'regions' ? 'Cities' : 'Continents'}
              </button>
            </div>
            <TravelMap cities={displayCities} />
          </div>
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
