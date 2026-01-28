'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Heart } from 'lucide-react'

interface HealthScoreWidgetProps {
  healthScore: number
}

export function HealthScoreWidget({ healthScore }: HealthScoreWidgetProps) {
  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="p-4 h-full flex items-center">
        <div className="flex items-start justify-between w-full">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500">How Healthy</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">{healthScore}%</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">habit completion</p>
          </div>
          <div className="p-3 rounded-lg bg-green-50 shrink-0">
            <Heart className="h-6 w-6 text-green-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
