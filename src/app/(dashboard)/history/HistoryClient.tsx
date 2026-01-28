'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useEntries, useDeleteEntry } from '@/lib/hooks/useEntries'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatDateForInput, getYesterdayString } from '@/lib/utils/dates'
import { calculateTotalDrinks } from '@/lib/utils/calculations'
import { subDays, format } from 'date-fns'
import type { Profile, DailyEntryWithRelations } from '@/types/database'
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
} from 'lucide-react'

interface HistoryClientProps {
  profile: Profile
}

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
                  <span>{entry.healthy_habits.length} habits</span>
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
                      {habitLabels[h.habit_type]}
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
                      {eventLabels[e.event_type]}
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
  const deleteEntry = useDeleteEntry()

  const startDate = formatDateForInput(subDays(new Date(), 365))
  const endDate = getYesterdayString()

  const { data: entries, isLoading, refetch } = useEntries({
    userId: profile.id,
    startDate,
    endDate,
  })

  const displayedEntries = entries?.slice(0, limit) || []
  const hasMore = entries && entries.length > limit

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entry History</h1>
          <p className="text-gray-600">
            {entries?.length || 0} entries in the last year
          </p>
        </div>
        <Link href="/entry">
          <Button>New Entry</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : displayedEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No entries yet</p>
            <Link href="/entry">
              <Button>Create your first entry</Button>
            </Link>
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
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
