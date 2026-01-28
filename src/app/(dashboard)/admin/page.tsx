'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ParsedEntry {
  entry_date: string
  mood_score: number | null
  beers: number
  wine: number
  liquor: number
  seltzers: number
  shots: number
  coffee: number
  steps: number | null
  screen_time: number | null
  sex: number
  work_location: string | null
  best_part: string | null
  notes: string | null
  city_wake: string | null
  miles_wake: number | null
  city_noon: string | null
  miles_noon: number | null
  city_sleep: string | null
  miles_sleep: number | null
  healthy_habits: string[]
  life_events: string[]
}

// Map CSV work location to database values
function mapWorkLocation(value: string | undefined): string | null {
  if (!value) return null
  const lower = value.toLowerCase().trim()
  if (lower.includes('home')) return 'home'
  if (lower.includes('office')) return 'office'
  if (lower.includes('field')) return 'field'
  if (lower.includes("didn't work") || lower.includes('didnt work') || lower === 'off') return 'off'
  return null
}

// Parse date from DD/MM/YYYY to YYYY-MM-DD
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

// Check if a value is truthy (Yes, TRUE, x, X, etc.)
function isTruthy(value: string | undefined): boolean {
  if (!value) return false
  const lower = value.toLowerCase().trim()
  return lower === 'yes' || lower === 'true' || lower === 'x'
}

// Parse number or return default
function parseNumber(value: string | undefined, defaultValue: number = 0): number {
  if (!value || value.trim() === '') return defaultValue
  const num = parseInt(value, 10)
  return isNaN(num) ? defaultValue : num
}

function parseDecimal(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null
  const num = parseFloat(value)
  return isNaN(num) ? null : num
}

// Parse the "Any of the Following?" column for life events
function parseAnyOfFollowing(value: string | undefined): string[] {
  if (!value) return []
  const events: string[] = []

  // Split by comma and check each value
  const parts = value.split(',').map(p => p.trim())

  const eventMapping: Record<number, string> = {
    0: 'took_pto',
    1: 'took_flight',
    2: 'took_train',
    3: 'self_care',
    4: 'haircut',
    5: 'doctor',
    6: 'dentist',
    7: 'played_sport',
    8: 'watched_sport',
    9: 'concert',
    10: 'stage_production',
    11: 'movies',
    12: 'museum',
    13: 'guys_night',
  }

  parts.forEach((part, index) => {
    if (part.toLowerCase() === 'true' && eventMapping[index]) {
      events.push(eventMapping[index])
    }
    // Also check for named events in newer format
    if (part.includes('Went to a museum')) events.push('museum')
    if (part.includes('Went to a concert')) events.push('concert')
    if (part.includes('Took PTO')) events.push('took_pto')
    if (part.includes('Took a Flight')) events.push('took_flight')
  })

  return [...new Set(events)] // Remove duplicates
}

function parseCSVRow(headers: string[], values: string[]): ParsedEntry | null {
  const get = (name: string): string | undefined => {
    const index = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()))
    return index >= 0 ? values[index] : undefined
  }

  const dateStr = get('Date')
  const entryDate = parseDate(dateStr || '')
  if (!entryDate) return null

  const healthyHabits: string[] = []

  // Check healthy habits
  if (isTruthy(get('Exercise'))) healthyHabits.push('exercise')
  if (isTruthy(get('8+ Hours of Sleep'))) healthyHabits.push('sleep_8hrs')
  if (isTruthy(get('8+ Cups of Water'))) healthyHabits.push('water_8cups')
  if (isTruthy(get('breakfast'))) healthyHabits.push('breakfast')
  if (isTruthy(get('vitamin'))) healthyHabits.push('vitamin')
  if (isTruthy(get('Read 5+'))) healthyHabits.push('reading')
  if (isTruthy(get('outside of work you enjoyed'))) healthyHabits.push('enjoyment')
  if (isTruthy(get('Ate vegetables')) || isTruthy(get('fruit/vegetables'))) healthyHabits.push('vegetables')
  if (isTruthy(get('Ate fruits'))) healthyHabits.push('fruits')
  if (isTruthy(get('family member'))) healthyHabits.push('family_interaction')

  // Parse life events from individual columns and "Any of the Following?"
  const lifeEvents: string[] = parseAnyOfFollowing(get('Any of the Following'))

  if (isTruthy(get('Took PTO'))) lifeEvents.push('took_pto')
  if (isTruthy(get('Took a Flight'))) lifeEvents.push('took_flight')
  if (isTruthy(get('Took a Train'))) lifeEvents.push('took_train')
  if (isTruthy(get('Self Care'))) lifeEvents.push('self_care')
  if (isTruthy(get('Haircut'))) lifeEvents.push('haircut')
  if (isTruthy(get('Doctor'))) lifeEvents.push('doctor')
  if (isTruthy(get('Dentist'))) lifeEvents.push('dentist')
  if (isTruthy(get('Played a sport'))) lifeEvents.push('played_sport')
  if (isTruthy(get('Went to a sport'))) lifeEvents.push('watched_sport')
  if (isTruthy(get('concert'))) lifeEvents.push('concert')
  if (isTruthy(get('stage production'))) lifeEvents.push('stage_production')
  if (isTruthy(get('movies'))) lifeEvents.push('movies')
  if (isTruthy(get('museum'))) lifeEvents.push('museum')
  if (isTruthy(get('Guys night'))) lifeEvents.push('guys_night')

  return {
    entry_date: entryDate,
    mood_score: parseNumber(get('How was your day'), 0) || null,
    beers: parseNumber(get('Beers')),
    wine: parseNumber(get('Wine')),
    liquor: parseNumber(get('Liquor')),
    seltzers: parseNumber(get('Seltzers')),
    shots: parseNumber(get('Shots')),
    coffee: parseNumber(get('Coffee')),
    steps: parseNumber(get('Steps'), 0) || null,
    screen_time: parseNumber(get('Screen Time'), 0) || null,
    sex: parseNumber(get('Sex')),
    work_location: mapWorkLocation(get('worked')),
    best_part: get('best part of your day') || null,
    notes: get('note to remember') || null,
    city_wake: get('City you woke up') || null,
    miles_wake: parseDecimal(get('Miles from Home at wake')),
    city_noon: get('City at noon') || null,
    miles_noon: parseDecimal(get('Miles from Home at noon')),
    city_sleep: get('City you went to sleep') || null,
    miles_sleep: parseDecimal(get('Miles from Home during sleep')),
    healthy_habits: [...new Set(healthyHabits)],
    life_events: [...new Set(lifeEvents)],
  }
}

function parseCSV(text: string): { headers: string[], rows: string[][] } {
  const lines = text.split('\n').filter(line => line.trim())
  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map(line => parseCSVLine(line))
  return { headers, rows }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())

  return result
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedEntry[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClient()

  // Check admin status on mount
  useState(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsAdmin(false)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      setIsAdmin(profile?.is_admin ?? false)
    }
    checkAdmin()
  })

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setSuccess(null)

    const text = await selectedFile.text()
    const { headers, rows } = parseCSV(text)

    const entries = rows
      .map(row => parseCSVRow(headers, row))
      .filter((entry): entry is ParsedEntry => entry !== null)

    setParsedData(entries)
  }, [])

  const handleImport = async () => {
    if (!parsedData.length) return

    setImporting(true)
    setError(null)
    setSuccess(null)
    setProgress({ current: 0, total: parsedData.length })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let imported = 0
      let skipped = 0

      for (const entry of parsedData) {
        // Insert or update daily entry
        const { data: existingEntry } = await supabase
          .from('daily_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('entry_date', entry.entry_date)
          .single()

        let entryId: string

        if (existingEntry) {
          // Update existing entry
          const { error: updateError } = await supabase
            .from('daily_entries')
            .update({
              mood_score: entry.mood_score,
              beers: entry.beers,
              wine: entry.wine,
              liquor: entry.liquor,
              seltzers: entry.seltzers,
              shots: entry.shots,
              coffee: entry.coffee,
              steps: entry.steps,
              screen_time: entry.screen_time,
              sex: entry.sex,
              work_location: entry.work_location,
              best_part: entry.best_part,
              notes: entry.notes,
              city_wake: entry.city_wake,
              miles_wake: entry.miles_wake,
              city_noon: entry.city_noon,
              miles_noon: entry.miles_noon,
              city_sleep: entry.city_sleep,
              miles_sleep: entry.miles_sleep,
            })
            .eq('id', existingEntry.id)

          if (updateError) {
            console.error('Update error:', updateError)
            skipped++
            continue
          }
          entryId = existingEntry.id
        } else {
          // Insert new entry
          const { data: newEntry, error: insertError } = await supabase
            .from('daily_entries')
            .insert({
              user_id: user.id,
              entry_date: entry.entry_date,
              mood_score: entry.mood_score,
              beers: entry.beers,
              wine: entry.wine,
              liquor: entry.liquor,
              seltzers: entry.seltzers,
              shots: entry.shots,
              coffee: entry.coffee,
              steps: entry.steps,
              screen_time: entry.screen_time,
              sex: entry.sex,
              work_location: entry.work_location,
              best_part: entry.best_part,
              notes: entry.notes,
              city_wake: entry.city_wake,
              miles_wake: entry.miles_wake,
              city_noon: entry.city_noon,
              miles_noon: entry.miles_noon,
              city_sleep: entry.city_sleep,
              miles_sleep: entry.miles_sleep,
            })
            .select('id')
            .single()

          if (insertError || !newEntry) {
            console.error('Insert error:', insertError)
            skipped++
            continue
          }
          entryId = newEntry.id
        }

        // Delete existing habits and life events for this entry
        await supabase.from('healthy_habits').delete().eq('entry_id', entryId)
        await supabase.from('life_events').delete().eq('entry_id', entryId)

        // Insert healthy habits
        if (entry.healthy_habits.length > 0) {
          await supabase.from('healthy_habits').insert(
            entry.healthy_habits.map(habit => ({
              entry_id: entryId,
              habit_type: habit,
            }))
          )
        }

        // Insert life events
        if (entry.life_events.length > 0) {
          await supabase.from('life_events').insert(
            entry.life_events.map(event => ({
              entry_id: entryId,
              event_type: event,
            }))
          )
        }

        imported++
        setProgress({ current: imported + skipped, total: parsedData.length })
      }

      setSuccess(`Successfully imported ${imported} entries. ${skipped > 0 ? `Skipped ${skipped} due to errors.` : ''}`)
      setParsedData([])
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-red-500">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Console</h1>

      <Card>
        <CardHeader>
          <CardTitle>Import Historical Data</CardTitle>
          <CardDescription>
            Upload a CSV file to import historical habit tracking data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
          </div>

          {parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="font-medium">Preview</p>
                <p className="text-sm text-gray-600">
                  Found {parsedData.length} entries to import
                </p>
                <p className="text-sm text-gray-600">
                  Date range: {parsedData[0]?.entry_date} to {parsedData[parsedData.length - 1]?.entry_date}
                </p>
              </div>

              <div className="max-h-64 overflow-auto border rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Mood</th>
                      <th className="px-3 py-2 text-left">Drinks</th>
                      <th className="px-3 py-2 text-left">Habits</th>
                      <th className="px-3 py-2 text-left">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((entry, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">{entry.entry_date}</td>
                        <td className="px-3 py-2">{entry.mood_score ?? '-'}</td>
                        <td className="px-3 py-2">
                          {entry.beers + entry.wine + entry.liquor + entry.seltzers + entry.shots}
                        </td>
                        <td className="px-3 py-2">{entry.healthy_habits.length}</td>
                        <td className="px-3 py-2">{entry.life_events.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 10 && (
                  <p className="text-center text-sm text-gray-500 py-2">
                    ... and {parsedData.length - 10} more entries
                  </p>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={importing}
                className="w-full"
              >
                {importing
                  ? `Importing... (${progress.current}/${progress.total})`
                  : `Import ${parsedData.length} Entries`
                }
              </Button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">
              {success}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
