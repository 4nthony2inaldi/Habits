'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { DailyEntryWithRelations } from '@/types/database'
import { Home, Building, MapPin, Coffee } from 'lucide-react'

interface WorkLocationChartProps {
  entries: DailyEntryWithRelations[]
}

const COLORS = {
  home: '#3b82f6',
  office: '#8b5cf6',
  field: '#f59e0b',
  off: '#6b7280',
}

const LABELS = {
  home: 'Home',
  office: 'Office',
  field: 'Field',
  off: 'Off',
}

const ICONS = {
  home: Home,
  office: Building,
  field: MapPin,
  off: Coffee,
}

export function WorkLocationChart({ entries }: WorkLocationChartProps) {
  const data = useMemo(() => {
    const counts = { home: 0, office: 0, field: 0, off: 0 }

    entries.forEach((entry) => {
      if (entry.work_location && entry.work_location in counts) {
        counts[entry.work_location as keyof typeof counts]++
      }
    })

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({
        name: LABELS[key as keyof typeof LABELS],
        value: count,
        color: COLORS[key as keyof typeof COLORS],
        percent: Math.round((count / entries.length) * 100),
      }))
  }, [entries])

  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Work Location</h3>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No work location data available
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Work Location</h3>
      <div className="flex-1 min-h-0 flex items-center gap-4">
        {/* Pie Chart */}
        <div className="w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value, name) => [
                  `${value} days (${Math.round((Number(value) / entries.length) * 100)}%)`,
                  name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {data.map((item) => {
            const Icon = ICONS[item.name.toLowerCase() as keyof typeof ICONS] || Home
            return (
              <div
                key={item.name}
                className="flex items-center gap-1.5 p-1.5 rounded-lg bg-gray-50"
              >
                <div
                  className="p-1 rounded"
                  style={{ backgroundColor: item.color + '20' }}
                >
                  <Icon className="h-3 w-3" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">{item.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {item.value}d ({item.percent}%)
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
