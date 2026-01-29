'use client'

import { useMemo, useState } from 'react'
import { format, parseISO, getDaysInMonth, getMonth, getYear } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { Compass } from 'lucide-react'

interface TravelRadialChartProps {
  entries: DailyEntryWithRelations[]
  title?: string
  subtitle?: string
}

interface MonthData {
  monthKey: string // 'yyyy-MM'
  label: string // 'Jan 24'
  year: number
  month: number // 0-11
  days: { day: number; maxMiles: number }[]
  daysInMonth: number
  maxMilesInMonth: number
  color: string
}

// Color palette for months (cold → warm throughout the year)
const monthColors = [
  '#3b82f6', // Jan - blue
  '#6366f1', // Feb - indigo
  '#8b5cf6', // Mar - violet
  '#a855f7', // Apr - purple
  '#d946ef', // May - fuchsia
  '#ec4899', // Jun - pink
  '#f43f5e', // Jul - rose
  '#ef4444', // Aug - red
  '#f97316', // Sep - orange
  '#eab308', // Oct - yellow
  '#84cc16', // Nov - lime
  '#22c55e', // Dec - green
]

function getMaxMiles(entry: DailyEntryWithRelations): number {
  const wake = entry.miles_wake ?? 0
  const noon = entry.miles_noon ?? 0
  const sleep = entry.miles_sleep ?? 0
  return Math.max(wake, noon, sleep)
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function createRadialPath(
  centerX: number,
  centerY: number,
  baseRadius: number,
  days: { day: number; maxMiles: number }[],
  daysInMonth: number,
  maxMiles: number,
  scaleFactor: number
): string {
  if (days.length === 0) return ''

  // Create points for all days of the month
  const points: { x: number; y: number }[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const dayData = days.find((d) => d.day === day)
    const miles = dayData?.maxMiles ?? 0
    const normalizedMiles = maxMiles > 0 ? miles / maxMiles : 0
    const radius = baseRadius + normalizedMiles * scaleFactor

    const angle = ((day - 1) / daysInMonth) * 360
    const point = polarToCartesian(centerX, centerY, radius, angle)
    points.push(point)
  }

  // Close the loop by adding the first point at the end
  if (points.length > 0) {
    points.push(points[0])
  }

  // Create smooth path using cardinal spline or simple line segments
  if (points.length < 2) return ''

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`
  }

  return path
}

export function TravelRadialChart({
  entries,
  title = 'Travel Patterns',
  subtitle,
}: TravelRadialChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null)

  // Group entries by month and calculate max miles per day
  const monthsData = useMemo(() => {
    const monthMap = new Map<string, MonthData>()

    entries.forEach((entry) => {
      const date = parseISO(entry.entry_date)
      const monthKey = format(date, 'yyyy-MM')
      const year = getYear(date)
      const month = getMonth(date)
      const day = parseInt(format(date, 'd'), 10)
      const maxMiles = getMaxMiles(entry)

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          label: format(date, "MMM ''yy"),
          year,
          month,
          days: [],
          daysInMonth: getDaysInMonth(date),
          maxMilesInMonth: 0,
          color: monthColors[month],
        })
      }

      const monthData = monthMap.get(monthKey)!
      monthData.days.push({ day, maxMiles })
      monthData.maxMilesInMonth = Math.max(monthData.maxMilesInMonth, maxMiles)
    })

    return Array.from(monthMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    )
  }, [entries])

  // Calculate global max miles for consistent scaling
  const globalMaxMiles = useMemo(() => {
    return Math.max(...monthsData.map((m) => m.maxMilesInMonth), 1)
  }, [monthsData])

  // SVG dimensions
  const size = 200
  const centerX = size / 2
  const centerY = size / 2
  const baseRadius = 40
  const scaleFactor = 45 // Max spike height

  if (monthsData.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Compass className="h-5 w-5 text-indigo-500" />
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
          <Compass className="h-5 w-5 text-indigo-500" />
          {title}
        </h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="flex gap-4 items-center">
          {/* SVG Radial Chart */}
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full max-w-[200px] h-auto"
          >
            {/* Base circle (reference) */}
            <circle
              cx={centerX}
              cy={centerY}
              r={baseRadius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="2,2"
            />

            {/* Month layers - render from oldest to newest */}
            {monthsData.map((monthData) => {
              const path = createRadialPath(
                centerX,
                centerY,
                baseRadius,
                monthData.days,
                monthData.daysInMonth,
                globalMaxMiles,
                scaleFactor
              )

              const isHovered = hoveredMonth === monthData.monthKey
              const opacity = hoveredMonth
                ? isHovered
                  ? 0.8
                  : 0.1
                : 0.15

              return (
                <g key={monthData.monthKey}>
                  <path
                    d={path}
                    fill={monthData.color}
                    fillOpacity={opacity}
                    stroke={monthData.color}
                    strokeWidth={isHovered ? 2 : 1}
                    strokeOpacity={hoveredMonth ? (isHovered ? 1 : 0.2) : 0.4}
                    style={{ transition: 'all 0.2s ease' }}
                  />
                </g>
              )
            })}

            {/* Center label */}
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-gray-500"
            >
              {hoveredMonth
                ? monthsData.find((m) => m.monthKey === hoveredMonth)?.label
                : `${monthsData.length} mo`}
            </text>
          </svg>

          {/* Month legend */}
          <div className="flex flex-col gap-0.5 text-[10px] max-h-[180px] overflow-y-auto scrollbar-hidden">
            {monthsData.map((monthData) => (
              <button
                key={monthData.monthKey}
                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-colors text-left ${
                  hoveredMonth === monthData.monthKey
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-50'
                }`}
                onMouseEnter={() => setHoveredMonth(monthData.monthKey)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: monthData.color }}
                />
                <span className="text-gray-600">{monthData.label}</span>
                <span className="text-gray-400 ml-auto">
                  {Math.round(monthData.maxMilesInMonth)}mi
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
