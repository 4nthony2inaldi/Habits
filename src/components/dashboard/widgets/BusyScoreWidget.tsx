'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Zap } from 'lucide-react'

interface BusyScoreWidgetProps {
  busyScore: number
}

export function BusyScoreWidget({ busyScore }: BusyScoreWidgetProps) {
  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="p-4 h-full flex items-center">
        <div className="flex items-start justify-between w-full">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500">How Busy</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">{busyScore}%</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">activity level</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 shrink-0">
            <Zap className="h-6 w-6 text-purple-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
