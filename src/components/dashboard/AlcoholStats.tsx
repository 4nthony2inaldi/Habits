'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { parseISO, subDays, getYear, getDayOfYear } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { calculateTotalDrinks } from '@/lib/utils/calculations'
import type { AlcoholMetricType } from './DashboardCustomizer'
import { BarChart3 } from 'lucide-react'

interface AlcoholStatsProps {
  entries: DailyEntryWithRelations[]
  selectedMetrics?: AlcoholMetricType[]
  title?: string
  subtitle?: string
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

export function AlcoholStats({ entries, selectedMetrics = defaultMetrics, title = 'How Much Drinking', subtitle }: AlcoholStatsProps) {
  const stats = useMemo(() => {
    const today = new Date()
    const currentYear = getYear(today)
    const lastYear = currentYear - 1
    const twoYearsAgo = currentYear - 2
    const currentDayOfYear = getDayOfYear(today)

    // Filter entries by time period
    const last30 = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return date >= subDays(today, 30)
    })

    // Current year: all entries up to today
    const thisYear = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return getYear(date) === currentYear
    })

    // Prior years: only include entries up to current day of year (YTD comparison)
    const prevYear = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return getYear(date) === lastYear && getDayOfYear(date) <= currentDayOfYear
    })

    const twoYearsAgoEntries = entries.filter((e) => {
      const date = parseISO(e.entry_date)
      return getYear(date) === twoYearsAgo && getDayOfYear(date) <= currentDayOfYear
    })

    return {
      last30: calculatePeriodStats(last30),
      currentYear: calculatePeriodStats(thisYear),
      lastYear: calculatePeriodStats(prevYear),
      twoYearsAgo: calculatePeriodStats(twoYearsAgoEntries),
      currentYearLabel: `'${currentYear.toString().slice(-2)}`,
      lastYearLabel: `'${lastYear.toString().slice(-2)}`,
      twoYearsAgoLabel: `'${twoYearsAgo.toString().slice(-2)}`,
    }
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
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

  const allRows: Array<{
    key: AlcoholMetricType
    label: string
    last30: number | string
    twoYearsAgo: number | string
    lastYear: number | string
    currentYear: number | string
  }> = [
    {
      key: 'totalDrinks',
      label: 'YTD',
      last30: stats.last30.totalDrinks,
      twoYearsAgo: stats.twoYearsAgo.totalDrinks,
      lastYear: stats.lastYear.totalDrinks,
      currentYear: stats.currentYear.totalDrinks,
    },
    {
      key: 'avgWeekly',
      label: 'Wkly',
      last30: stats.last30.avgWeekly,
      twoYearsAgo: stats.twoYearsAgo.avgWeekly,
      lastYear: stats.lastYear.avgWeekly,
      currentYear: stats.currentYear.avgWeekly,
    },
    {
      key: 'daysWithDrink',
      label: '1+',
      last30: `${stats.last30.daysWithDrinkPercent}%`,
      twoYearsAgo: `${stats.twoYearsAgo.daysWithDrinkPercent}%`,
      lastYear: `${stats.lastYear.daysWithDrinkPercent}%`,
      currentYear: `${stats.currentYear.daysWithDrinkPercent}%`,
    },
    {
      key: 'daysWith2Plus',
      label: '2+',
      last30: `${stats.last30.daysWith2PlusPercent}%`,
      twoYearsAgo: `${stats.twoYearsAgo.daysWith2PlusPercent}%`,
      lastYear: `${stats.lastYear.daysWith2PlusPercent}%`,
      currentYear: `${stats.currentYear.daysWith2PlusPercent}%`,
    },
    {
      key: 'daysWith6Plus',
      label: '6+',
      last30: `${stats.last30.daysWith6PlusPercent}%`,
      twoYearsAgo: `${stats.twoYearsAgo.daysWith6PlusPercent}%`,
      lastYear: `${stats.lastYear.daysWith6PlusPercent}%`,
      currentYear: `${stats.currentYear.daysWith6PlusPercent}%`,
    },
    {
      key: 'beers',
      label: 'Beers',
      last30: stats.last30.beers,
      twoYearsAgo: stats.twoYearsAgo.beers,
      lastYear: stats.lastYear.beers,
      currentYear: stats.currentYear.beers,
    },
    {
      key: 'seltzers',
      label: 'Seltzers',
      last30: stats.last30.seltzers,
      twoYearsAgo: stats.twoYearsAgo.seltzers,
      lastYear: stats.lastYear.seltzers,
      currentYear: stats.currentYear.seltzers,
    },
    {
      key: 'wine',
      label: 'Wine',
      last30: stats.last30.wine,
      twoYearsAgo: stats.twoYearsAgo.wine,
      lastYear: stats.lastYear.wine,
      currentYear: stats.currentYear.wine,
    },
    {
      key: 'liquor',
      label: 'Liquor',
      last30: stats.last30.liquor,
      twoYearsAgo: stats.twoYearsAgo.liquor,
      lastYear: stats.lastYear.liquor,
      currentYear: stats.currentYear.liquor,
    },
    {
      key: 'shots',
      label: 'Shots',
      last30: stats.last30.shots,
      twoYearsAgo: stats.twoYearsAgo.shots,
      lastYear: stats.lastYear.shots,
      currentYear: stats.currentYear.shots,
    },
  ]

  // Filter rows based on selected metrics
  const rows = allRows.filter(row => selectedMetrics.includes(row.key))

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          {title}
        </h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-0 flex flex-col scrollbar-hidden">
        <table className="w-full text-sm h-full table-fixed">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1.5 font-medium text-gray-500 w-14"></th>
              <th className="text-center py-1.5 font-medium text-gray-400 text-[10px] px-2">
                L30
              </th>
              <th className="text-center py-1.5 font-medium text-gray-400 text-[10px] px-2">
                {stats.twoYearsAgoLabel}
              </th>
              <th className="text-center py-1.5 font-medium text-gray-400 text-[10px] px-2">
                {stats.lastYearLabel}
              </th>
              <th className="text-center py-1.5 font-medium text-gray-400 text-[10px] px-2">
                {stats.currentYearLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.key}
                className={cn(
                  idx % 2 === 0 ? 'bg-gray-50' : '',
                  'hover:bg-gray-100'
                )}
                style={{ height: `${100 / rows.length}%` }}
              >
                <td className="text-gray-700 font-medium text-xs align-middle truncate">
                  {row.label}
                </td>
                <td className="text-center text-gray-900 text-xs align-middle px-2">
                  {row.last30 || '-'}
                </td>
                <td className="text-center text-gray-900 text-xs align-middle px-2">
                  {row.twoYearsAgo || '-'}
                </td>
                <td className="text-center text-gray-900 text-xs align-middle px-2">
                  {row.lastYear || '-'}
                </td>
                <td className="text-center text-gray-900 text-xs align-middle px-2">
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
