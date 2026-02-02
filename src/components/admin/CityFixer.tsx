'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CityAutocomplete } from '@/components/ui/city-autocomplete'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { calculateDistanceMiles } from '@/lib/utils/calculations'
import { fetchWeather, fetchWeatherBatch } from '@/lib/utils/weather'
import type { Profile, DailyEntry, HomeCityHistory } from '@/types/database'
import { MapPin, RefreshCw, Check, AlertCircle, Loader2, Cloud } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CityFixerProps {
  currentUser: Profile
  users: Profile[]
}

interface CityEntry {
  id: string
  entry_date: string
  user_id: string
  city_field: 'city_wake' | 'city_noon' | 'city_sleep'
  city_name: string
  has_coords: boolean
  current_lat: number | null
  current_lng: number | null
}

interface DistinctCity {
  city_name: string
  city_name_lower: string
  entries: CityEntry[]
  count: number
}

interface BackfillProgress {
  total: number
  processed: number
  status: 'idle' | 'running' | 'complete' | 'error'
  message: string
}

export function CityFixer({ currentUser, users }: CityFixerProps) {
  const supabase = createClient()
  const [selectedUser, setSelectedUser] = useState<string>(currentUser.id)
  const [cityEntries, setCityEntries] = useState<CityEntry[]>([])
  const [distinctCities, setDistinctCities] = useState<DistinctCity[]>([])
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState<string | null>(null)
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress>({
    total: 0,
    processed: 0,
    status: 'idle',
    message: '',
  })

  // Load entries with cities that need fixing
  const loadCityEntries = useCallback(async () => {
    setLoading(true)
    try {
      const { data: entries, error } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('user_id', selectedUser)
        .order('entry_date', { ascending: false })

      if (error) throw error

      // Find entries where city is set but coordinates are missing
      const needsFix: CityEntry[] = []

      entries?.forEach((entry: DailyEntry) => {
        if (entry.city_wake && (!entry.city_wake_lat || !entry.city_wake_lng)) {
          needsFix.push({
            id: entry.id,
            entry_date: entry.entry_date,
            user_id: entry.user_id,
            city_field: 'city_wake',
            city_name: entry.city_wake,
            has_coords: false,
            current_lat: entry.city_wake_lat,
            current_lng: entry.city_wake_lng,
          })
        }
        if (entry.city_noon && (!entry.city_noon_lat || !entry.city_noon_lng)) {
          needsFix.push({
            id: entry.id,
            entry_date: entry.entry_date,
            user_id: entry.user_id,
            city_field: 'city_noon',
            city_name: entry.city_noon,
            has_coords: false,
            current_lat: entry.city_noon_lat,
            current_lng: entry.city_noon_lng,
          })
        }
        if (entry.city_sleep && (!entry.city_sleep_lat || !entry.city_sleep_lng)) {
          needsFix.push({
            id: entry.id,
            entry_date: entry.entry_date,
            user_id: entry.user_id,
            city_field: 'city_sleep',
            city_name: entry.city_sleep,
            has_coords: false,
            current_lat: entry.city_sleep_lat,
            current_lng: entry.city_sleep_lng,
          })
        }
      })

      setCityEntries(needsFix)

      // Group by distinct city name (case-insensitive)
      const cityMap = new Map<string, DistinctCity>()
      needsFix.forEach((entry) => {
        const lowerName = entry.city_name.toLowerCase().trim()
        const existing = cityMap.get(lowerName)
        if (existing) {
          existing.entries.push(entry)
          existing.count++
        } else {
          cityMap.set(lowerName, {
            city_name: entry.city_name,
            city_name_lower: lowerName,
            entries: [entry],
            count: 1,
          })
        }
      })

      // Convert to array and sort by count (most common first)
      const distinctList = Array.from(cityMap.values()).sort((a, b) => b.count - a.count)
      setDistinctCities(distinctList)
    } catch (error) {
      console.error('Failed to load city entries:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedUser, supabase])

  useEffect(() => {
    loadCityEntries()
  }, [loadCityEntries])

  // Fix all entries with the same city name
  const fixDistinctCity = async (distinctCity: DistinctCity, newCity: string, lat: number, lng: number) => {
    setFixing(distinctCity.city_name_lower)

    try {
      const user = users.find(u => u.id === selectedUser)
      let successCount = 0
      let failCount = 0
      let firstError: string | null = null

      // Update all entries that have this city name
      for (const entry of distinctCity.entries) {
        const updateData: Record<string, unknown> = {
          [entry.city_field]: newCity,
          [`${entry.city_field}_lat`]: lat,
          [`${entry.city_field}_lng`]: lng,
        }

        // Also update miles from home
        if (user?.home_lat && user?.home_lng) {
          const miles = calculateDistanceMiles(user.home_lat, user.home_lng, lat, lng)
          const milesField = entry.city_field.replace('city_', 'miles_')
          updateData[milesField] = miles
        }

        const { data, error } = await supabase
          .from('daily_entries')
          .update(updateData)
          .eq('id', entry.id)
          .select('id')
          .single()

        if (error || !data) {
          console.error('Failed to fix entry:', entry.id, error)
          failCount++
          // Store the first error for display
          if (!firstError && error) {
            firstError = error.message || error.code || 'Unknown error'
          }
        } else {
          successCount++
        }
      }

      if (failCount > 0) {
        console.warn(`City fix completed: ${successCount} succeeded, ${failCount} failed`)
        const errorDetail = firstError
          ? `\n\nError: ${firstError}`
          : '\n\nThis may require running the admin_update_policies migration.'
        alert(`Warning: ${failCount} entries failed to update.${errorDetail}`)
      }

      // Remove this distinct city from the list if all succeeded
      if (failCount === 0) {
        setDistinctCities(prev => prev.filter(dc => dc.city_name_lower !== distinctCity.city_name_lower))
        setCityEntries(prev => prev.filter(e =>
          e.city_name.toLowerCase().trim() !== distinctCity.city_name_lower
        ))
      } else {
        // Reload to see what actually changed
        loadCityEntries()
      }
    } catch (error) {
      console.error('Failed to fix city:', error)
      alert('Failed to fix city: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setFixing(null)
    }
  }

  // Helper function to get home coordinates for a specific date
  const getHomeForDate = (
    entryDate: string,
    homeHistory: HomeCityHistory[],
    user: Profile
  ): { lat: number; lng: number; city: string } => {
    // Sort history by effective_date descending to find the most recent one before or on the entry date
    const sortedHistory = [...homeHistory].sort(
      (a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
    )

    // Find the first history entry that is on or before the entry date
    for (const history of sortedHistory) {
      if (history.effective_date <= entryDate) {
        return { lat: history.lat, lng: history.lng, city: history.city }
      }
    }

    // If no history matches (entry is before all history records), use current home
    if (user.home_lat && user.home_lng && user.home_city) {
      return { lat: user.home_lat, lng: user.home_lng, city: user.home_city }
    }

    // Fallback to a default (should not happen in practice)
    return { lat: 0, lng: 0, city: 'Unknown' }
  }

  // Backfill weather and miles for all entries
  const backfillWeatherAndMiles = async () => {
    const user = users.find(u => u.id === selectedUser)
    if (!user) return

    setBackfillProgress({
      total: 0,
      processed: 0,
      status: 'running',
      message: 'Loading entries and home city history...',
    })

    try {
      // Get user's home city history
      const { data: homeHistory, error: historyError } = await supabase
        .from('home_city_history')
        .select('*')
        .eq('user_id', selectedUser)
        .order('effective_date', { ascending: false })

      if (historyError) {
        console.error('Failed to load home city history:', historyError)
      }

      // Get all entries for this user
      const { data: entries, error } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('user_id', selectedUser)
        .order('entry_date', { ascending: true })

      if (error) throw error
      if (!entries || entries.length === 0) {
        setBackfillProgress({
          total: 0,
          processed: 0,
          status: 'complete',
          message: 'No entries to process',
        })
        return
      }

      setBackfillProgress({
        total: entries.length,
        processed: 0,
        status: 'running',
        message: 'Processing entries...',
      })

      // Process in batches
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const updateData: Record<string, unknown> = {}

        // Determine home coordinates for this date using history
        const home = getHomeForDate(entry.entry_date, homeHistory || [], user)
        const homeLat = home.lat
        const homeLng = home.lng

        // Recalculate miles if we have city coordinates
        if (entry.city_wake_lat && entry.city_wake_lng) {
          updateData.miles_wake = calculateDistanceMiles(homeLat, homeLng, entry.city_wake_lat, entry.city_wake_lng)
        }
        if (entry.city_noon_lat && entry.city_noon_lng) {
          updateData.miles_noon = calculateDistanceMiles(homeLat, homeLng, entry.city_noon_lat, entry.city_noon_lng)
        }
        if (entry.city_sleep_lat && entry.city_sleep_lng) {
          updateData.miles_sleep = calculateDistanceMiles(homeLat, homeLng, entry.city_sleep_lat, entry.city_sleep_lng)
        }

        // Fetch weather if we don't have it yet
        if (!entry.weather_temperature_high) {
          // Determine weather location - use noon city coords, or home city
          const weatherLat = entry.city_noon_lat || homeLat
          const weatherLng = entry.city_noon_lng || homeLng
          const weatherLocation = entry.city_noon || home.city

          const weather = await fetchWeather(weatherLat, weatherLng, entry.entry_date)
          if (weather) {
            updateData.weather_temperature_high = weather.temperatureHigh
            updateData.weather_temperature_low = weather.temperatureLow
            updateData.weather_conditions = weather.conditions
            updateData.weather_humidity = weather.humidity
            updateData.weather_precipitation = weather.precipitation
            updateData.weather_location = weatherLocation
          }
        }

        // Update the entry if we have changes
        if (Object.keys(updateData).length > 0) {
          const { data: updateResult, error: updateError } = await supabase
            .from('daily_entries')
            .update(updateData)
            .eq('id', entry.id)
            .select('id')
            .single()

          if (updateError || !updateResult) {
            console.error('Failed to update entry:', entry.id, updateError)
          }
        }

        setBackfillProgress(prev => ({
          ...prev,
          processed: i + 1,
          message: `Processing ${entry.entry_date}...`,
        }))

        // Small delay to avoid rate limiting weather API
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      setBackfillProgress({
        total: entries.length,
        processed: entries.length,
        status: 'complete',
        message: `Successfully processed ${entries.length} entries!`,
      })

      // Reload the city entries list
      loadCityEntries()
    } catch (error) {
      console.error('Backfill error:', error)
      setBackfillProgress(prev => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to backfill data',
      }))
    }
  }

  const selectedUserProfile = users.find(u => u.id === selectedUser)

  const isEditingOtherUser = selectedUser !== currentUser.id
  const hasAdminPermission = currentUser.is_admin

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fix Historical Cities</h2>
          <p className="text-sm text-gray-500">
            Update cities without coordinates to enable distance calculation and weather data
          </p>
        </div>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="border rounded-lg px-3 py-2"
        >
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.display_name}
            </option>
          ))}
        </select>
      </div>

      {isEditingOtherUser && !hasAdminPermission && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">Admin permissions required</p>
            <p className="text-yellow-700 mt-1">
              You need admin privileges to edit other users' entries. Contact an administrator or ensure the admin_update_policies migration has been applied.
            </p>
          </div>
        </div>
      )}

      {/* Backfill Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Backfill Weather & Miles
          </CardTitle>
          <CardDescription>
            Recalculate miles from home and fetch weather data for all entries.
            {selectedUserProfile?.home_city && (
              <span className="block mt-1">
                Current home: <strong>{selectedUserProfile.home_city}</strong>
                {selectedUserProfile.home_lat && selectedUserProfile.home_lng && (
                  <span className="text-green-600"> (coordinates set)</span>
                )}
              </span>
            )}
            <span className="block mt-1 text-gray-500">
              Uses home city history for accurate distance calculations.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backfillProgress.status === 'running' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                {backfillProgress.message}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(backfillProgress.processed / Math.max(backfillProgress.total, 1)) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {backfillProgress.processed} / {backfillProgress.total} entries
              </p>
            </div>
          ) : backfillProgress.status === 'complete' ? (
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <Check className="h-5 w-5" />
              {backfillProgress.message}
            </div>
          ) : backfillProgress.status === 'error' ? (
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="h-5 w-5" />
              {backfillProgress.message}
            </div>
          ) : null}

          <Button
            onClick={backfillWeatherAndMiles}
            disabled={backfillProgress.status === 'running'}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", backfillProgress.status === 'running' && "animate-spin")} />
            Backfill Weather & Miles
          </Button>
        </CardContent>
      </Card>

      {/* Cities Needing Fix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Cities Without Coordinates ({distinctCities.length} unique, {cityEntries.length} total)
          </CardTitle>
          <CardDescription>
            Select the correct city from the dropdown to update all matching entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading entries...
            </div>
          ) : distinctCities.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
              All cities have coordinates!
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {distinctCities.map((distinctCity) => (
                <div
                  key={distinctCity.city_name_lower}
                  className="flex items-center gap-4 p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex-shrink-0 text-sm font-medium text-gray-700 bg-purple-100 px-2 py-1 rounded">
                    {distinctCity.count}x
                  </div>
                  <div className="flex-1 min-w-0">
                    <CityAutocomplete
                      value={distinctCity.city_name}
                      onChange={(value, lat, lng) => {
                        if (lat && lng) {
                          fixDistinctCity(distinctCity, value, lat, lng)
                        }
                      }}
                      placeholder="Select correct city..."
                      disabled={fixing === distinctCity.city_name_lower}
                    />
                  </div>
                  {fixing === distinctCity.city_name_lower && (
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
