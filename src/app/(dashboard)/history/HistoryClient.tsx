'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useEntries, useDeleteEntry } from '@/lib/hooks/useEntries'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatDateForInput, getYesterdayString } from '@/lib/utils/dates'
import { calculateTotalDrinks } from '@/lib/utils/calculations'
import { subDays, subMonths, subYears, startOfYear, format, parseISO } from 'date-fns'
import type { Profile, DailyEntryWithRelations, HabitType, EventType } from '@/types/database'
import { habitLabels, eventLabels } from '@/types/forms'
import {
  Calendar,
  Smile,
  Beer,
  Check,
  Edit2,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Search,
  ArrowLeft,
} from 'lucide-react'

interface HistoryClientProps {
  profile: Profile
}

type DatePreset = 'last30' | 'last90' | 'thisYear' | 'lastYear' | 'allTime' | 'custom'

function EntryCard({ entry, onDelete }: { entry: DailyEntryWithRelations; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const totalDrinks = calculateTotalDrinks(entry)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
              <span className="text-xs text-purple-600 font-medium">
                {format(new Date(entry.entry_date), 'MMM')}
              </span>
              <span className="text-lg font-bold text-purple-700">
                {format(new Date(entry.entry_date), 'd')}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {formatDate(entry.entry_date, 'EEEE')}
              </p>
              <p className="text-sm text-gray-500">
                {formatDate(entry.entry_date, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm">
              {entry.mood_score !== null && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <Smile className="h-4 w-4" />
                  <span>{entry.mood_score}/10</span>
                </div>
              )}
              {totalDrinks > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <Beer className="h-4 w-4" />
                  <span>{totalDrinks}</span>
                </div>
              )}
              {entry.healthy_habits.length > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="h-4 w-4" />
                  <span>{entry.healthy_habits.length}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Link href={`/entry?date=${entry.entry_date}`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-500">Mood</p>
                <p className="font-medium">{entry.mood_score ?? '-'}/10</p>
              </div>
              <div>
                <p className="text-gray-500">Work</p>
                <p className="font-medium capitalize">{entry.work_location || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Drinks</p>
                <p className="font-medium">{totalDrinks}</p>
              </div>
              <div>
                <p className="text-gray-500">Steps</p>
                <p className="font-medium">
                  {entry.steps?.toLocaleString() || '-'}
                </p>
              </div>
            </div>

            {entry.healthy_habits.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">Healthy Habits</p>
                <div className="flex flex-wrap gap-1">
                  {entry.healthy_habits.map((h) => (
                    <span
                      key={h.id}
                      className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                    >
                      {habitLabels[h.habit_type] || h.habit_type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entry.life_events.length > 0 && (
              <div>
                <p className="text-gray-500 mb-1">Life Events</p>
                <div className="flex flex-wrap gap-1">
                  {entry.life_events.map((e) => (
                    <span
                      key={e.id}
                      className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"
                    >
                      {eventLabels[e.event_type] || e.event_type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entry.best_part && (
              <div>
                <p className="text-gray-500">Best Part</p>
                <p className="text-gray-700">{entry.best_part}</p>
              </div>
            )}

            {entry.notes && (
              <div>
                <p className="text-gray-500">Notes</p>
                <p className="text-gray-700">{entry.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function HistoryClient({ profile }: HistoryClientProps) {
  const [limit, setLimit] = useState(30)
  const [showFilters, setShowFilters] = useState(false)
  const deleteEntry = useDeleteEntry()

  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>('allTime')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Content filters
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [selectedHabits, setSelectedHabits] = useState<string[]>([])
  const [workLocation, setWorkLocation] = useState<string>('')
  const [drinkFilter, setDrinkFilter] = useState<string>('')
  const [moodMin, setMoodMin] = useState<string>('')
  const [moodMax, setMoodMax] = useState<string>('')
  const [searchText, setSearchText] = useState('')

  // Calculate date range based on preset
  const { startDate, endDate } = useMemo(() => {
    const today = new Date()
    const yesterday = getYesterdayString()

    switch (datePreset) {
      case 'last30':
        return {
          startDate: formatDateForInput(subDays(today, 30)),
          endDate: yesterday,
        }
      case 'last90':
        return {
          startDate: formatDateForInput(subDays(today, 90)),
          endDate: yesterday,
        }
      case 'thisYear':
        return {
          startDate: formatDateForInput(startOfYear(today)),
          endDate: yesterday,
        }
      case 'lastYear':
        return {
          startDate: formatDateForInput(startOfYear(subYears(today, 1))),
          endDate: formatDateForInput(subDays(startOfYear(today), 1)),
        }
      case 'custom':
        return {
          startDate: customStartDate || formatDateForInput(subYears(today, 10)),
          endDate: customEndDate || yesterday,
        }
      case 'allTime':
      default:
        return {
          startDate: formatDateForInput(subYears(today, 10)),
          endDate: yesterday,
        }
    }
  }, [datePreset, customStartDate, customEndDate])

  const { data: entries, isLoading, refetch } = useEntries({
    userId: profile.id,
    startDate,
    endDate,
  })

  // Apply filters to entries
  const filteredEntries = useMemo(() => {
    if (!entries) return []

    return entries.filter((entry) => {
      // Event filter
      if (selectedEvents.length > 0) {
        const entryEvents = entry.life_events.map((e) => e.event_type)
        if (!selectedEvents.some((ev) => entryEvents.includes(ev as EventType))) {
          return false
        }
      }

      // Habit filter
      if (selectedHabits.length > 0) {
        const entryHabits = entry.healthy_habits.map((h) => h.habit_type)
        if (!selectedHabits.some((h) => entryHabits.includes(h as HabitType))) {
          return false
        }
      }

      // Work location filter
      if (workLocation && entry.work_location !== workLocation) {
        return false
      }

      // Drink filter
      const totalDrinks = calculateTotalDrinks(entry)
      if (drinkFilter === 'sober' && totalDrinks > 0) return false
      if (drinkFilter === 'drinking' && totalDrinks === 0) return false
      if (drinkFilter === '6plus' && totalDrinks < 6) return false

      // Mood filter
      if (moodMin && entry.mood_score !== null && entry.mood_score < parseInt(moodMin)) {
        return false
      }
      if (moodMax && entry.mood_score !== null && entry.mood_score > parseInt(moodMax)) {
        return false
      }

      // Text search (best_part and notes)
      if (searchText) {
        const search = searchText.toLowerCase()
        const inBestPart = entry.best_part?.toLowerCase().includes(search)
        const inNotes = entry.notes?.toLowerCase().includes(search)
        if (!inBestPart && !inNotes) return false
      }

      return true
    })
  }, [entries, selectedEvents, selectedHabits, workLocation, drinkFilter, moodMin, moodMax, searchText])

  const displayedEntries = filteredEntries.slice(0, limit)
  const hasMore = filteredEntries.length > limit

  const activeFilterCount = [
    selectedEvents.length > 0,
    selectedHabits.length > 0,
    workLocation,
    drinkFilter,
    moodMin || moodMax,
    searchText,
  ].filter(Boolean).length

  const clearFilters = () => {
    setSelectedEvents([])
    setSelectedHabits([])
    setWorkLocation('')
    setDrinkFilter('')
    setMoodMin('')
    setMoodMax('')
    setSearchText('')
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  const toggleHabit = (habit: string) => {
    setSelectedHabits((prev) =>
      prev.includes(habit) ? prev.filter((h) => h !== habit) : [...prev, habit]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/entry">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Entry History</h1>
            <p className="text-gray-600">
              {filteredEntries.length} entries
              {filteredEntries.length !== entries?.length && ` (${entries?.length} total)`}
            </p>
          </div>
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Date Range */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Date Range</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  { value: 'last30', label: 'Last 30 days' },
                  { value: 'last90', label: 'Last 90 days' },
                  { value: 'thisYear', label: 'This year' },
                  { value: 'lastYear', label: 'Last year' },
                  { value: 'allTime', label: 'All time' },
                  { value: 'custom', label: 'Custom' },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    variant={datePreset === preset.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDatePreset(preset.value as DatePreset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              {datePreset === 'custom' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="startDate" className="text-xs">From</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="endDate" className="text-xs">To</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Search Notes</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search best part or notes..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Life Events */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Life Events</Label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(eventLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => toggleEvent(key)}
                    className={cn(
                      'px-2 py-1 rounded text-xs border transition-colors',
                      selectedEvents.includes(key)
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Habits */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Habits</Label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(habitLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => toggleHabit(key)}
                    className={cn(
                      'px-2 py-1 rounded text-xs border transition-colors',
                      selectedHabits.includes(key)
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Other Filters Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Work Location */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Work</Label>
                <select
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm"
                >
                  <option value="">Any</option>
                  <option value="home">Home</option>
                  <option value="office">Office</option>
                  <option value="field">Field</option>
                  <option value="off">Off</option>
                </select>
              </div>

              {/* Drinks */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Drinks</Label>
                <select
                  value={drinkFilter}
                  onChange={(e) => setDrinkFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm"
                >
                  <option value="">Any</option>
                  <option value="sober">Sober days</option>
                  <option value="drinking">Drinking days</option>
                  <option value="6plus">6+ drinks</option>
                </select>
              </div>

              {/* Mood Min */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Mood Min</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="0"
                  value={moodMin}
                  onChange={(e) => setMoodMin(e.target.value)}
                />
              </div>

              {/* Mood Max */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Mood Max</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="10"
                  value={moodMax}
                  onChange={(e) => setMoodMax(e.target.value)}
                />
              </div>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : displayedEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">
              {activeFilterCount > 0
                ? 'No entries match your filters'
                : 'No entries yet'}
            </p>
            {activeFilterCount > 0 ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Link href="/entry">
                <Button>Create your first entry</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {displayedEntries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onDelete={async () => {
                  await deleteEntry.mutateAsync(entry.id)
                  refetch()
                }}
              />
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setLimit((l) => l + 30)}
              >
                Load more ({filteredEntries.length - limit} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
