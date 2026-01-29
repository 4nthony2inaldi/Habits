'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { Smile, Heart, Zap, TrendingUp, TrendingDown } from 'lucide-react'

interface SummaryCardsProps {
  moodAverage: number
  moodTrend: number
  healthScore: number
  busyScore: number
  totalDays: number
  showHappy?: boolean
  showHealthy?: boolean
  showBusy?: boolean
}

export function SummaryCards({
  moodAverage,
  moodTrend,
  healthScore,
  busyScore,
  totalDays,
  showHappy = true,
  showHealthy = true,
  showBusy = true,
}: SummaryCardsProps) {
  const allCards = [
    {
      key: 'happy',
      visible: showHappy,
      title: 'How Happy',
      value: moodAverage.toFixed(1),
      subtitle: `avg mood score`,
      trend: moodTrend,
      icon: Smile,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
    },
    {
      key: 'healthy',
      visible: showHealthy,
      title: 'How Healthy',
      value: `${healthScore}%`,
      subtitle: 'habit completion',
      icon: Heart,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      key: 'busy',
      visible: showBusy,
      title: 'How Busy',
      value: `${busyScore}%`,
      subtitle: 'activity level',
      icon: Zap,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ]

  const cards = allCards.filter((card) => card.visible)

  if (cards.length === 0) {
    return null
  }

  const gridCols = cards.length === 1 ? 'sm:grid-cols-1' : cards.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'

  return (
    <div className={cn('grid grid-cols-1 gap-4', gridCols)}>
      {cards.map((card) => (
        <Card key={card.key} className={cn('overflow-hidden')}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  {card.trend !== undefined && card.trend !== 0 && (
                    <span
                      className={cn(
                        'flex items-center text-sm font-medium',
                        card.trend > 0 ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {card.trend > 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {Math.abs(card.trend).toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
              </div>
              <div className={cn('p-3 rounded-lg', card.bgColor)}>
                <card.icon className={cn('h-6 w-6', card.iconColor)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
