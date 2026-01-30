'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { parseISO, getYear } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { Wine, RotateCcw } from 'lucide-react'

interface AlcoholByTypeProps {
  entries: DailyEntryWithRelations[]
  title?: string
  subtitle?: string
}

const TYPE_COLORS = {
  wine: { bg: 'bg-red-500', hex: '#ef4444' },
  beers: { bg: 'bg-blue-500', hex: '#3b82f6' },
  seltzers: { bg: 'bg-cyan-400', hex: '#22d3ee' },
  liquor: { bg: 'bg-orange-500', hex: '#f97316' },
  shots: { bg: 'bg-green-500', hex: '#22c55e' },
}

const TYPE_LABELS = {
  wine: 'Wine',
  beers: 'Beer',
  seltzers: 'Seltzer',
  liquor: 'Liquor',
  shots: 'Shots',
}

const TYPE_ORDER = ['wine', 'beers', 'seltzers', 'liquor', 'shots'] as const

interface BreakdownData {
  label: string
  total: number
  byType: Record<string, { count: number; percent: number }>
}

export function AlcoholByType({ entries, title = 'What Drinking', subtitle }: AlcoholByTypeProps) {
  const [viewMode, setViewMode] = useState<'total' | 'byYear'>('total')

  const data = useMemo(() => {
    // Calculate total breakdown for entire period
    const totalBreakdown = {
      beers: 0,
      seltzers: 0,
      wine: 0,
      liquor: 0,
      shots: 0,
    }

    // Group entries by year for by-year view
    const byYear = new Map<number, typeof totalBreakdown>()

    entries.forEach((entry) => {
      const year = getYear(parseISO(entry.entry_date))

      // Add to total
      totalBreakdown.beers += entry.beers || 0
      totalBreakdown.seltzers += entry.seltzers || 0
      totalBreakdown.wine += entry.wine || 0
      totalBreakdown.liquor += entry.liquor || 0
      totalBreakdown.shots += entry.shots || 0

      // Add to year breakdown
      const yearTotals = byYear.get(year) || { beers: 0, seltzers: 0, wine: 0, liquor: 0, shots: 0 }
      yearTotals.beers += entry.beers || 0
      yearTotals.seltzers += entry.seltzers || 0
      yearTotals.wine += entry.wine || 0
      yearTotals.liquor += entry.liquor || 0
      yearTotals.shots += entry.shots || 0
      byYear.set(year, yearTotals)
    })

    // Helper to convert totals to breakdown data
    const toBreakdownData = (label: string, totals: typeof totalBreakdown): BreakdownData | null => {
      const total = totals.beers + totals.seltzers + totals.wine + totals.liquor + totals.shots
      if (total === 0) return null

      const byType: Record<string, { count: number; percent: number }> = {}
      Object.entries(totals).forEach(([type, count]) => {
        byType[type] = {
          count,
          percent: Math.round((count / total) * 100),
        }
      })

      return { label, total, byType }
    }

    // Total view data
    const totalData = toBreakdownData('Total', totalBreakdown)

    // By year view data
    const yearBreakdowns: BreakdownData[] = []
    byYear.forEach((yearTotals, year) => {
      const breakdown = toBreakdownData(String(year), yearTotals)
      if (breakdown) yearBreakdowns.push(breakdown)
    })
    yearBreakdowns.sort((a, b) => Number(b.label) - Number(a.label))

    return {
      total: totalData ? [totalData] : [],
      byYear: yearBreakdowns,
      hasMultipleYears: yearBreakdowns.length > 1,
    }
  }, [entries])

  const displayData = viewMode === 'total' ? data.total : data.byYear

  if (entries.length === 0 || displayData.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wine className="h-5 w-5 text-red-500" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No data available for this period
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wine className="h-5 w-5 text-red-500" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        {data.hasMultipleYears && (
          <button
            onClick={() => setViewMode(viewMode === 'total' ? 'byYear' : 'total')}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title={viewMode === 'total' ? 'Show by year' : 'Show total'}
          >
            <RotateCcw className="h-3 w-3" />
            {viewMode === 'total' ? 'By Year' : 'Total'}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col scrollbar-hidden">
        {/* Stacked bars - fills available space */}
        <div className="flex-1 flex flex-col justify-evenly gap-4">
          {displayData.map((itemData) => (
            <div key={itemData.label} className={cn(
              'flex flex-col gap-2',
              displayData.length === 1 && 'flex-1'
            )}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{itemData.label}</span>
                <span className="text-gray-500 text-xs">{itemData.total} drinks</span>
              </div>

              {/* Stacked bar - responsive height when single bar */}
              <div className={cn(
                'rounded-lg overflow-hidden flex w-full',
                displayData.length === 1 ? 'flex-1 min-h-12' : 'h-8'
              )}>
                {/* Sort types by percentage (highest first) */}
                {TYPE_ORDER
                  .filter((type) => itemData.byType[type]?.percent > 0)
                  .sort((a, b) => (itemData.byType[b]?.percent || 0) - (itemData.byType[a]?.percent || 0))
                  .map((type) => {
                    const typeData = itemData.byType[type]

                    return (
                      <div
                        key={type}
                        className={cn(
                          'h-full flex items-center justify-center text-white font-medium',
                          displayData.length === 1 ? 'text-base' : 'text-[10px]',
                          TYPE_COLORS[type].bg
                        )}
                        style={{ width: `${typeData.percent}%` }}
                        title={`${TYPE_LABELS[type]}: ${typeData.count} (${typeData.percent}%)`}
                      >
                        {typeData.percent >= 10 && (
                          <span className="truncate px-1">{typeData.percent}%</span>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend - compact */}
        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t flex-shrink-0">
          {TYPE_ORDER.map((type) => (
            <div key={type} className="flex items-center gap-1">
              <div className={cn('w-2.5 h-2.5 rounded', TYPE_COLORS[type].bg)} />
              <span className="text-[10px] text-gray-600">{TYPE_LABELS[type]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
