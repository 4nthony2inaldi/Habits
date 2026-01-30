'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, FileText, AlertCircle, CheckCircle, Download, Loader2 } from 'lucide-react'
import type { Profile, HabitType, EventType, WorkLocation, MealLocation } from '@/types/database'

interface DataImporterProps {
  currentUser: Profile
  users: Profile[]
}

interface ParsedEntry {
  entry_date: string
  mood_score?: number | null
  work_location?: WorkLocation | null
  beers?: number
  seltzers?: number
  wine?: number
  liquor?: number
  shots?: number
  coffee?: number
  steps?: number | null
  screen_time?: number | null
  sex?: number
  // Meal locations (new form fields)
  breakfast_location?: MealLocation | null
  lunch_location?: MealLocation | null
  dinner_location?: MealLocation | null
  city_wake?: string | null
  miles_wake?: number | null
  city_noon?: string | null
  miles_noon?: number | null
  city_sleep?: string | null
  miles_sleep?: number | null
  best_part?: string | null
  notes?: string | null
  habits?: string[]
  events?: string[]
}

interface ImportResult {
  success: number
  errors: string[]
  skipped: number
}

const VALID_HABITS: HabitType[] = [
  'sleep_8hrs', 'breakfast', 'vitamin', 'water_8cups', 'cooked_dinner',
  'exercise', 'read_5pages', 'family_interaction', 'ate_fruit',
  'ate_vegetables', 'journaled'
]

const VALID_EVENTS: EventType[] = [
  'pto', 'flight', 'train', 'haircut', 'doctor', 'dentist', 'played_sport',
  'attended_sport', 'concert', 'stage_production', 'movies', 'museum',
  'guys_night', 'massage', 'facial', 'pedicure', 'manicure', 'other_selfcare',
  'diner', 'ice_cream', 'park', 'subway', 'bus'
]

const VALID_WORK_LOCATIONS: WorkLocation[] = ['home', 'office', 'field', 'off']

export function DataImporter({ currentUser, users }: DataImporterProps) {
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedEntry[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [overwriteExisting, setOverwriteExisting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = useCallback((text: string): ParsedEntry[] => {
    // First, handle multiline quoted strings by joining them
    const lines: string[] = []
    let currentLine = ''
    let inQuotes = false

    for (const char of text) {
      if (char === '"') {
        inQuotes = !inQuotes
      }
      if (char === '\n' && !inQuotes) {
        lines.push(currentLine.replace(/\r$/, ''))
        currentLine = ''
      } else if (char !== '\r') {
        currentLine += char
      }
    }
    if (currentLine) {
      lines.push(currentLine)
    }

    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    // Parse headers, removing any empty trailing headers (from trailing commas)
    let headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
    while (headers.length > 0 && headers[headers.length - 1] === '') {
      headers.pop()
    }

    const entries: ParsedEntry[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue // Skip empty lines

      let values = parseCSVLine(line)

      // Pad with empty strings if row has fewer columns than headers
      while (values.length < headers.length) {
        values.push('')
      }
      // Trim to header length if row has more columns
      values = values.slice(0, headers.length)

      const entry: ParsedEntry = { entry_date: '' }

      // Initialize habits and events arrays
      if (!entry.habits) entry.habits = []
      if (!entry.events) entry.events = []

      headers.forEach((header, idx) => {
        const value = values[idx]?.trim()
        const isYes = value?.toLowerCase() === 'yes' || value === '1' || value?.toLowerCase() === 'true'

        // Date fields - support various common header names
        if (header === 'entry_date' || header === 'date' || header === 'timestamp' || header.includes('timestamp')) {
          entry.entry_date = normalizeDate(value)
        }
        // Mood
        else if (header === 'mood_score' || header === 'mood' || header === 'how_was_your_day?') {
          entry.mood_score = value ? parseInt(value, 10) || null : null
        }
        // Work location
        else if (header === 'work_location' || header === 'work' || header === 'i_worked:') {
          entry.work_location = mapWorkLocation(value)
        }
        // Drinks - numeric
        else if (header === 'beers' || header === 'beer') {
          entry.beers = parseInt(value, 10) || 0
        }
        else if (header === 'seltzers' || header === 'seltzer') {
          entry.seltzers = parseInt(value, 10) || 0
        }
        else if (header === 'wine' || header === 'glasses_of_wine') {
          entry.wine = parseInt(value, 10) || 0
        }
        else if (header === 'liquor' || header === 'liquor_based_drinks' || header.includes('liquor')) {
          entry.liquor = parseInt(value, 10) || 0
        }
        else if (header === 'shots') {
          entry.shots = parseInt(value, 10) || 0
        }
        else if (header === 'coffee' || header === 'cups_of_coffee') {
          entry.coffee = parseInt(value, 10) || 0
        }
        // Other numeric fields
        else if (header === 'steps' || header.includes('steps')) {
          entry.steps = value ? parseInt(value.replace(/,/g, ''), 10) || null : null
        }
        else if (header === 'screen_time' || header.includes('screen_time')) {
          entry.screen_time = value ? parseInt(value.replace(/,/g, ''), 10) || null : null
        }
        else if (header === 'sex') {
          entry.sex = parseInt(value, 10) || 0
        }
        // Location fields
        else if (header === 'city_wake' || header.includes('city_you_woke_up')) {
          entry.city_wake = value || null
        }
        else if (header === 'miles_wake' || header.includes('miles_from_home_at_wake')) {
          entry.miles_wake = value ? parseFloat(value) || null : null
        }
        else if (header === 'city_noon' || header.includes('city_at_noon')) {
          entry.city_noon = value || null
        }
        else if (header === 'miles_noon' || header.includes('miles_from_home_at_noon')) {
          entry.miles_noon = value ? parseFloat(value) || null : null
        }
        else if (header === 'city_sleep' || header.includes('city_you_went_to_sleep')) {
          entry.city_sleep = value || null
        }
        else if (header === 'miles_sleep' || header.includes('miles_from_home_during_sleep')) {
          entry.miles_sleep = value ? parseFloat(value) || null : null
        }
        // Text fields
        else if (header === 'best_part' || header.includes('best_part_of_your_day')) {
          entry.best_part = value || null
        }
        else if (header === 'notes' || header.includes('anything_you_would_like_to_note')) {
          entry.notes = value || null
        }
        // Habits (Yes/No columns)
        else if ((header.includes('exercise') || header.includes('went_out_of_your_way_to_exercise')) && isYes) {
          entry.habits!.push('exercise')
        }
        else if ((header === '8+_hours_of_sleep' || header.includes('hours_of_sleep')) && isYes) {
          entry.habits!.push('sleep_8hrs')
        }
        else if ((header === '8+_cups_of_water' || header.includes('cups_of_water')) && isYes) {
          entry.habits!.push('water_8cups')
        }
        else if ((header.includes('breakfast') || header.includes('had_something_for_breakfast')) && isYes) {
          entry.habits!.push('breakfast')
          // Also set new meal location field (assume home since old format didn't track location)
          entry.breakfast_location = 'home'
        }
        else if ((header.includes('vitamin') || header.includes('took_a_vitamin')) && isYes) {
          entry.habits!.push('vitamin')
        }
        else if ((header.includes('read_5') || header.includes('pages_of_literature')) && isYes) {
          entry.habits!.push('read_5pages')
        }
        else if ((header === 'ate_vegetables' || header.includes('ate_vegetables')) && isYes) {
          entry.habits!.push('ate_vegetables')
        }
        else if ((header === 'ate_fruits' || header.includes('ate_fruit')) && isYes) {
          entry.habits!.push('ate_fruit')
        }
        else if ((header.includes('family') || header.includes('interact_with_a_family')) && isYes) {
          entry.habits!.push('family_interaction')
        }
        else if (header.includes('cooked_dinner') && isYes) {
          entry.habits!.push('cooked_dinner')
          // Also set new meal location field (cooked dinner = dinner at home)
          entry.dinner_location = 'home'
        }
        else if ((header.includes('journaled') || header === 'journaled_offline') && isYes) {
          entry.habits!.push('journaled')
        }
        // Events (Yes/No columns)
        else if ((header === 'took_pto' || header.includes('took_pto')) && isYes) {
          entry.events!.push('pto')
        }
        else if ((header.includes('flight') || header.includes('took_a_flight')) && isYes) {
          entry.events!.push('flight')
        }
        else if ((header.includes('train') || header.includes('took_a_train')) && isYes) {
          entry.events!.push('train')
        }
        else if ((header === 'haircut' || header.includes('haircut')) && isYes) {
          entry.events!.push('haircut')
        }
        else if ((header === 'doctor' || header.includes('doctor')) && isYes) {
          entry.events!.push('doctor')
        }
        else if ((header === 'dentist' || header.includes('dentist')) && isYes) {
          entry.events!.push('dentist')
        }
        else if ((header.includes('played_a_sport') || header === 'played_sport') && isYes) {
          entry.events!.push('played_sport')
        }
        else if ((header.includes('went_to_a_sport') || header === 'attended_sport') && isYes) {
          entry.events!.push('attended_sport')
        }
        else if ((header.includes('concert') || header.includes('went_to_a_concert')) && isYes) {
          entry.events!.push('concert')
        }
        else if ((header.includes('stage_production') || header.includes('musical')) && isYes) {
          entry.events!.push('stage_production')
        }
        else if ((header.includes('movies') || header.includes('went_to_the_movies')) && isYes) {
          entry.events!.push('movies')
        }
        else if ((header.includes('museum') || header.includes('went_to_a_museum')) && isYes) {
          entry.events!.push('museum')
        }
        else if ((header.includes('guys_night') || header.includes('guys_night')) && isYes) {
          entry.events!.push('guys_night')
        }
        else if ((header.includes('self_care') || header.includes('massage') || header.includes('facial')) && isYes) {
          entry.events!.push('other_selfcare')
        }
        // Semicolon-separated habits/events (for template format)
        else if (header === 'habits' || header === 'healthy_habits') {
          if (value) {
            const habits = value.split(/[;|]/).map(h => h.trim().toLowerCase()).filter(h =>
              VALID_HABITS.includes(h as HabitType)
            )
            entry.habits!.push(...habits)
          }
        }
        else if (header === 'events' || header === 'life_events') {
          if (value) {
            const events = value.split(/[;|]/).map(e => e.trim().toLowerCase()).filter(e =>
              VALID_EVENTS.includes(e as EventType)
            )
            entry.events!.push(...events)
          }
        }
      })

      if (!entry.entry_date) {
        throw new Error(`Row ${i + 1} is missing a valid date`)
      }

      entries.push(entry)
    }

    return entries
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)
    setParseError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const entries = parseCSV(text)
        setParsedData(entries)
      } catch (error) {
        setParseError(error instanceof Error ? error.message : 'Failed to parse CSV')
        setParsedData([])
      }
    }
    reader.readAsText(selectedFile)
  }, [parseCSV])

  const handleImport = async () => {
    if (parsedData.length === 0) return

    setImporting(true)
    setResult(null)

    const supabase = createClient()
    const importResult: ImportResult = { success: 0, errors: [], skipped: 0 }

    for (const entry of parsedData) {
      try {
        // Check if entry already exists for this date
        const { data: existing } = await supabase
          .from('daily_entries')
          .select('id')
          .eq('user_id', selectedUserId)
          .eq('entry_date', entry.entry_date)
          .single()

        if (existing && !overwriteExisting) {
          importResult.skipped++
          continue
        }

        // Prepare entry data (exclude habits and events)
        const { habits, events, ...entryData } = entry
        const insertData = {
          ...entryData,
          user_id: selectedUserId,
        }

        let entryId: string

        if (existing && overwriteExisting) {
          // Update existing entry
          const { error: updateError } = await supabase
            .from('daily_entries')
            .update(insertData)
            .eq('id', existing.id)

          if (updateError) throw updateError
          entryId = existing.id

          // Delete existing habits and events
          await supabase.from('healthy_habits').delete().eq('entry_id', entryId)
          await supabase.from('life_events').delete().eq('entry_id', entryId)
        } else {
          // Insert new entry
          const { data: newEntry, error: insertError } = await supabase
            .from('daily_entries')
            .insert(insertData)
            .select('id')
            .single()

          if (insertError) throw insertError
          entryId = newEntry.id
        }

        // Insert habits
        if (habits && habits.length > 0) {
          const habitInserts = habits.map(habit => ({
            entry_id: entryId,
            habit_type: habit as HabitType,
          }))
          await supabase.from('healthy_habits').insert(habitInserts)
        }

        // Insert events
        if (events && events.length > 0) {
          const eventInserts = events.map(event => ({
            entry_id: entryId,
            event_type: event as EventType,
          }))
          await supabase.from('life_events').insert(eventInserts)
        }

        importResult.success++
      } catch (error) {
        importResult.errors.push(
          `${entry.entry_date}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    setResult(importResult)
    setImporting(false)
  }

  const downloadTemplate = () => {
    const headers = [
      'entry_date', 'mood_score', 'work_location', 'beers', 'seltzers', 'wine',
      'liquor', 'shots', 'coffee', 'steps', 'screen_time', 'sex',
      'city_wake', 'miles_wake', 'city_noon', 'miles_noon', 'city_sleep', 'miles_sleep',
      'best_part', 'notes', 'habits', 'events'
    ]
    const exampleRow = [
      '2024-01-15', '7', 'office', '2', '0', '1',
      '0', '0', '2', '8500', '180', '0',
      'New York', '0', 'New York', '0', 'New York', '0',
      'Great meeting with team', 'Productive day',
      'breakfast;exercise;water_8cups', 'haircut'
    ]

    const csv = [headers.join(','), exampleRow.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'habits_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Import Historical Data</h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload a CSV file to import historical entries. Supports multiple date formats.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* User Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Import for User
        </label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.display_name} {user.id === currentUser.id ? '(you)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* File Upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {parsedData.length} entries found
              </p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-500 mt-1">
              CSV files only
            </p>
          </>
        )}
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Error parsing CSV</p>
            <p className="text-sm text-red-700 mt-1">{parseError}</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {parsedData.length > 0 && !parseError && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Preview (first 5 entries)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Date</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Mood</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Work</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Drinks</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Habits</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Events</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 5).map((entry, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2 px-3">{entry.entry_date}</td>
                    <td className="py-2 px-3">{entry.mood_score ?? '-'}</td>
                    <td className="py-2 px-3">{entry.work_location ?? '-'}</td>
                    <td className="py-2 px-3">
                      {(entry.beers || 0) + (entry.seltzers || 0) + (entry.wine || 0) +
                       (entry.liquor || 0) + (entry.shots || 0)} total
                    </td>
                    <td className="py-2 px-3">{entry.habits?.length || 0}</td>
                    <td className="py-2 px-3">{entry.events?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedData.length > 5 && (
            <p className="text-sm text-gray-500">
              ...and {parsedData.length - 5} more entries
            </p>
          )}
        </div>
      )}

      {/* Options */}
      {parsedData.length > 0 && !parseError && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="overwrite"
            checked={overwriteExisting}
            onChange={(e) => setOverwriteExisting(e.target.checked)}
            className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
          />
          <label htmlFor="overwrite" className="text-sm text-gray-700">
            Overwrite existing entries for same dates
          </label>
        </div>
      )}

      {/* Import Button */}
      {parsedData.length > 0 && !parseError && (
        <Button
          onClick={handleImport}
          disabled={importing}
          className="w-full sm:w-auto"
        >
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import {parsedData.length} Entries
            </>
          )}
        </Button>
      )}

      {/* Result */}
      {result && (
        <div className={`p-4 rounded-lg border ${
          result.errors.length > 0
            ? 'bg-yellow-50 border-yellow-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start gap-3">
            <CheckCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
              result.errors.length > 0 ? 'text-yellow-600' : 'text-green-600'
            }`} />
            <div>
              <p className="font-medium text-gray-900">Import Complete</p>
              <ul className="text-sm mt-1 space-y-1">
                <li className="text-green-700">{result.success} entries imported successfully</li>
                {result.skipped > 0 && (
                  <li className="text-gray-600">{result.skipped} entries skipped (already exist)</li>
                )}
                {result.errors.length > 0 && (
                  <li className="text-red-700">{result.errors.length} errors</li>
                )}
              </ul>
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-sm text-red-700 cursor-pointer">View errors</summary>
                  <ul className="mt-1 text-sm text-red-600 space-y-1">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm">
        <h4 className="font-medium text-gray-900 mb-2">CSV Format Guide</h4>
        <ul className="space-y-1 text-gray-600">
          <li><strong>Date</strong>: Required. Formats: DD/MM/YYYY, MM/DD/YYYY, or YYYY-MM-DD</li>
          <li><strong>Mood</strong>: &quot;How was your day?&quot; or &quot;mood_score&quot; (1-10)</li>
          <li><strong>Work</strong>: &quot;i worked:&quot; - accepts &quot;From home&quot;, &quot;In office&quot;, &quot;In the field&quot;, &quot;Didn&apos;t work&quot;</li>
          <li><strong>Drinks</strong>: Beers, Glasses of Wine, Liquor Based Drinks, Seltzers, Shots, Cups of Coffee</li>
          <li><strong>Habits</strong>: Yes/No columns for Exercise, Sleep, Water, Breakfast, Vitamin, Read, Vegetables, Fruits, Family</li>
          <li><strong>Events</strong>: Yes/No columns for PTO, Flight, Train, Haircut, Doctor, Concert, Movies, Museum, etc.</li>
        </ul>
      </div>
    </div>
  )
}

// Helper functions
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function normalizeDate(value: string): string {
  if (!value) return ''

  // Strip time portion if present (e.g., "1/15/2024 12:30:45" -> "1/15/2024")
  const dateOnly = value.split(' ')[0]

  // Try DD/MM/YYYY or MM/DD/YYYY format first
  const parts = dateOnly.split(/[\/\-]/)
  if (parts.length === 3) {
    const [a, b, c] = parts

    // If first part is 4 digits, assume YYYY-MM-DD
    if (a.length === 4) {
      return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`
    }

    // If last part is 4 digits (year), determine DD/MM vs MM/DD
    if (c.length === 4) {
      const day = parseInt(a, 10)
      const month = parseInt(b, 10)

      // If first number > 12, it must be a day (DD/MM/YYYY format)
      if (day > 12) {
        return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
      }
      // If second number > 12, it must be a day (MM/DD/YYYY format)
      if (month > 12) {
        return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
      }
      // Ambiguous case - assume DD/MM/YYYY (European format, common for this type of data)
      return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
    }
  }

  // Try to parse as a date string
  const date = new Date(dateOnly)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return dateOnly
}

function mapWorkLocation(value: string): WorkLocation | null {
  if (!value) return null

  const lower = value.toLowerCase().trim()

  // Map various work location strings to our enum values
  if (lower === 'home' || lower === 'from home' || lower === 'wfh' || lower === 'remote') {
    return 'home'
  }
  if (lower === 'office' || lower === 'in office' || lower === 'at office') {
    return 'office'
  }
  if (lower === 'field' || lower === 'in the field' || lower === 'on site' || lower === 'onsite') {
    return 'field'
  }
  if (lower === 'off' || lower === "didn't work" || lower === 'didnt work' || lower === 'no work' || lower === 'day off') {
    return 'off'
  }

  return null
}
