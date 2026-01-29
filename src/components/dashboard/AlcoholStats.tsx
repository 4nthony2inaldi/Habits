'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { parseISO, subDays, getYear } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { calculateTotalDrinks } from '@/lib/utils/calculations'
import type { AlcoholMetricType } from './DashboardCustomizer'

interface AlcoholStatsProps {
  entries: DailyEntryWithRelations[]
  selectedMetrics?: AlcoholMetricType[]
}

interface PeriodStats {
  avgWeekly: number
  totalDrinks: number
  beers: number
  seltzers: number
  wine: number
  liquor: number
  shots: number
  daysWithDrink: number
  daysWithDrinkPercent: number
  daysWith2Plus: number
  daysWith2PlusPercent: number
  daysWith6Plus: number
  daysWith6PlusPercent: number
  totalDays: number
}

function calculatePeriodStats(entries: DailyEntryWithRelations[]): PeriodStats {
  if (entries.length === 0) {
    return {
      avgWeekly: 0,
      totalDrinks: 0,
      beers: 0,
      seltzers: 0,
      wine: 0,
      liquor: 0,
      shots: 0,
      daysWithDrink: 0,
      daysWithDrinkPercent: 0,
      daysWith2Plus: 0,
      daysWith2PlusPercent: 0,
      daysWith6Plus: 0,
      daysWith6PlusPercent: 0,
      totalDays: 0,
    }
  }

  let totalDrinks = 0
  let daysWithDrink = 0
  let daysWith2Plus = 0
  let daysWith6Plus = 0
  let beers = 0
  let seltzers = 0
  let wine = 0
  let liquor = 0
  let shots = 0

  entries.forEach((entry) => {
    const dayDrinks = calculateTotalDrinks(entry)
    totalDrinks += dayDrinks

    if (dayDrinks > 0) daysWithDrink++
    if (dayDrinks >= 2) daysWith2Plus++
    if (dayDrinks >= 6) daysWith6Plus++

    beers += entry.beers || 0
    seltzers += entry.seltzers || 0
    wine += entry.wine || 0
    liquor += entry.liquor || 0
    shots += entry.shots || 0
  })

  const weeks = Math.max(entries.length / 7, 1)

  return {
    avgWeekly: Math.round((totalDrinks / weeks) * 10) / 10,
    totalDrinks: Math.round(totalDrinks),
    beers: Math.round(beers),
    seltzers: Math.round(seltzers),
    wine: Math.round(wine),
    liquor: Math.round(liquor),
    shots: Math.round(shots),
    daysWithDrink,
    daysWithDrinkPercent: Math.round((daysWithDrink / entries.length) * 100),
    daysWith2Plus,
    daysWith2PlusPercent: Math.round((daysWith2Plus / entries.length) * 100),
    daysWith6Plus,
    daysWith6PlusPercent: Math.round((daysWith6Plus / entries.length) * 100),
    totalDays: entries.length,
  }
}

const defaultMetrics: AlcoholMetricType[] = [
  'avgWeekly', 'totalDrinks', 'beers', 'seltzers', 'wine', 'liquor', 'shots',
  'daysWithDrink', 'daysWith2Plus', 'daysWith6Plus'
]

export function AlcoholStats({ entries, selectedMetrics = defaultMetrics }: AlcoholStatsProps) {
  const stats = useMemo(() => {
    const today = new Date()
    const currentYear = getYear(today)
    const lastYear = currentYear - 1

    // Filter entries by time period
    const last7 = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return date >= subDays(today, 7)
    })

    const last30 = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return date >= subDays(today, 30)
    })

    const thisYear = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return getYear(date) === currentYear
    })

    const prevYear = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return getYear(date) === lastYear
    })

    return {
      last7: calculatePeriodStats(last7),
      last30: calculatePeriodStats(last30),
      currentYear: calculatePeriodStats(thisYear),
      lastYear: calculatePeriodStats(prevYear),
      currentYearLabel: currentYear.toString(),
      lastYearLabel: lastYear.toString(),
    }
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How Much Drinking</h3>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No data available for this period
        </div>
      </div>
    )
  }

  const allRows: Array<{
    key: AlcoholMetricType
    label: string
    last7: number | string
    last30: number | string
    currentYear: number | string
    lastYear: number | string
  }> = [
    {
      key: 'avgWeekly',
      label: 'Avg. Weekly',
      last7: stats.last7.avgWeekly,
      last30: stats.last30.avgWeekly,
      currentYear: stats.currentYear.avgWeekly,
      lastYear: stats.lastYear.avgWeekly,
    },
    {
      key: 'totalDrinks',
      label: 'Total Drinks',
      last7: stats.last7.totalDrinks,
      last30: stats.last30.totalDrinks,
      currentYear: stats.currentYear.totalDrinks,
      lastYear: stats.lastYear.totalDrinks,
    },
    {
      key: 'beers',
      label: 'Beers',
      last7: stats.last7.beers,
      last30: stats.last30.beers,
      currentYear: stats.currentYear.beers,
      lastYear: stats.lastYear.beers,
    },
    {
      key: 'seltzers',
      label: 'Seltzers',
      last7: stats.last7.seltzers,
      last30: stats.last30.seltzers,
      currentYear: stats.currentYear.seltzers,
      lastYear: stats.lastYear.seltzers,
    },
    {
      key: 'wine',
      label: 'Wine',
      last7: stats.last7.wine,
      last30: stats.last30.wine,
      currentYear: stats.currentYear.wine,
      lastYear: stats.lastYear.wine,
    },
    {
      key: 'liquor',
      label: 'Liquor',
      last7: stats.last7.liquor,
      last30: stats.last30.liquor,
      currentYear: stats.currentYear.liquor,
      lastYear: stats.lastYear.liquor,
    },
    {
      key: 'shots',
      label: 'Shots',
      last7: stats.last7.shots,
      last30: stats.last30.shots,
      currentYear: stats.currentYear.shots,
      lastYear: stats.lastYear.shots,
    },
    {
      key: 'daysWithDrink',
      label: 'Days w/ Drink',
      last7: stats.last7.daysWithDrink,
      last30: `${stats.last30.daysWithDrinkPercent}%`,
      currentYear: `${stats.currentYear.daysWithDrinkPercent}%`,
      lastYear: `${stats.lastYear.daysWithDrinkPercent}%`,
    },
    {
      key: 'daysWith2Plus',
      label: 'Days 2+',
      last7: stats.last7.daysWith2Plus,
      last30: `${stats.last30.daysWith2PlusPercent}%`,
      currentYear: `${stats.currentYear.daysWith2PlusPercent}%`,
      lastYear: `${stats.lastYear.daysWith2PlusPercent}%`,
    },
    {
      key: 'daysWith6Plus',
      label: 'Days w/ 6+',
      last7: stats.last7.daysWith6Plus,
      last30: `${stats.last30.daysWith6PlusPercent}%`,
      currentYear: `${stats.currentYear.daysWith6PlusPercent}%`,
      lastYear: `${stats.lastYear.daysWith6PlusPercent}%`,
    },
  ]

  // Filter rows based on selected metrics
  const rows = allRows.filter(row => selectedMetrics.includes(row.key))

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">How Much Drinking</h3>
      <div className="flex-1 min-h-0 flex flex-col scrollbar-hidden">
        <table className="w-full text-sm h-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1.5 pr-4 font-medium text-gray-500"></th>
              <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs">
                Last 7
              </th>
              <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs">
                Last 30
              </th>
              <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs">
                {stats.lastYearLabel}
              </th>
              <th className="text-center py-1.5 px-2 font-medium text-gray-500 text-xs">
                {stats.currentYearLabel}
              </th>
            </tr>
          </thead>
          <tbody className="[&>tr]:h-[1fr]">
            {rows.map((row, idx) => (
              <tr
                key={row.key}
                className={cn(
                  idx % 2 === 0 ? 'bg-gray-50' : '',
                  'hover:bg-gray-100'
                )}
                style={{ height: `${100 / rows.length}%` }}
              >
                <td className="pr-4 text-gray-700 font-medium whitespace-nowrap text-xs align-middle">
                  {row.label}
                </td>
                <td className="px-2 text-center text-gray-900 text-xs align-middle">
                  {row.last7 || '-'}
                </td>
                <td className="px-2 text-center text-gray-900 text-xs align-middle">
                  {row.last30 || '-'}
                </td>
                <td className="px-2 text-center text-gray-900 text-xs align-middle">
                  {row.lastYear || '-'}
                </td>
                <td className="px-2 text-center text-gray-900 text-xs align-middle">
                  {row.currentYear || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
