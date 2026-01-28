'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Work Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            No work location data available
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Work Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
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
                }}
                formatter={(value, name) => [
                  `${value} days (${Math.round((Number(value) / entries.length) * 100)}%)`,
                  name,
                ]}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-sm text-gray-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item) => {
            const Icon = ICONS[item.name.toLowerCase() as keyof typeof ICONS] || Home
            return (
              <div
                key={item.name}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
              >
                <div
                  className="p-1.5 rounded"
                  style={{ backgroundColor: item.color + '20' }}
                >
                  <Icon className="h-4 w-4" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.value} days ({item.percent}%)
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
