'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { format, parseISO, startOfYear, endOfYear, differenceInDays, getYear } from 'date-fns'
import { X, ChevronRight, ChevronLeft, Sparkles, Target, Wine, Plane, Heart, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { DailyEntryWithRelations, HabitType, EventType } from '@/types/database'
import { habitLabels, eventLabels } from '@/types/forms'

interface YearWrappedProps {
  entries: DailyEntryWithRelations[]
  year?: number
  onClose: () => void
}

interface SlideProps {
  children: React.ReactNode
  gradient: string
  active: boolean
}

function Slide({ children, gradient, active }: SlideProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-500',
        gradient,
        active ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      )}
    >
      {children}
    </div>
  )
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  return (
    <span className="tabular-nums">
      {value.toLocaleString()}{suffix}
    </span>
  )
}

export function YearWrapped({ entries, year, onClose }: YearWrappedProps) {
  const targetYear = year || getYear(new Date()) - 1
  const [currentSlide, setCurrentSlide] = useState(0)

  // Filter entries for the target year
  const yearEntries = useMemo(() => {
    const yearStart = startOfYear(new Date(targetYear, 0, 1))
    const yearEnd = endOfYear(new Date(targetYear, 0, 1))
    return entries.filter(entry => {
      const date = parseISO(entry.entry_date)
      return date >= yearStart && date <= yearEnd
    })
  }, [entries, targetYear])

  // Calculate all stats
  const stats = useMemo(() => {
    const totalEntries = yearEntries.length

    // Habits stats
    const habitCounts: Record<string, number> = {}
    let totalHabitsCompleted = 0
    yearEntries.forEach(entry => {
      entry.healthy_habits.forEach(h => {
        habitCounts[h.habit_type] = (habitCounts[h.habit_type] || 0) + 1
        totalHabitsCompleted++
      })
    })
    const topHabit = Object.entries(habitCounts).sort((a, b) => b[1] - a[1])[0]
    const habitConsistency = totalEntries > 0
      ? Math.round((totalHabitsCompleted / (totalEntries * Object.keys(habitLabels).length)) * 100)
      : 0

    // Alcohol stats
    let totalDrinks = 0
    let daysWithDrinks = 0
    let soberDays = 0
    const drinkTypes = { beers: 0, wine: 0, liquor: 0, seltzers: 0, shots: 0 }
    yearEntries.forEach(entry => {
      const dayDrinks = (entry.beers || 0) + (entry.wine || 0) + (entry.liquor || 0) +
                        (entry.seltzers || 0) + (entry.shots || 0)
      totalDrinks += dayDrinks
      if (dayDrinks > 0) daysWithDrinks++
      else soberDays++
      drinkTypes.beers += entry.beers || 0
      drinkTypes.wine += entry.wine || 0
      drinkTypes.liquor += entry.liquor || 0
      drinkTypes.seltzers += entry.seltzers || 0
      drinkTypes.shots += entry.shots || 0
    })
    const favoriteDrink = Object.entries(drinkTypes).sort((a, b) => b[1] - a[1])[0]

    // Events stats
    const eventCounts: Record<string, number> = {}
    let totalEvents = 0
    yearEntries.forEach(entry => {
      entry.life_events.forEach(e => {
        eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1
        totalEvents++
      })
    })
    const topEvent = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])[0]

    // Travel stats
    const flights = eventCounts['flight'] || 0
    const trains = eventCounts['train'] || 0
    let nightsAway = 0
    const citiesVisited = new Set<string>()
    yearEntries.forEach(entry => {
      if (entry.city_sleep && entry.city_sleep !== entry.city_wake) {
        nightsAway++
        citiesVisited.add(entry.city_sleep.split(',')[0].trim())
      }
    })

    // Mood stats
    const moodScores = yearEntries
      .filter(e => e.mood_score !== null)
      .map(e => e.mood_score as number)
    const avgMood = moodScores.length > 0
      ? (moodScores.reduce((a, b) => a + b, 0) / moodScores.length).toFixed(1)
      : 'N/A'
    const happyDays = moodScores.filter(m => m >= 7).length
    const bestMoodDay = yearEntries
      .filter(e => e.mood_score !== null)
      .sort((a, b) => (b.mood_score || 0) - (a.mood_score || 0))[0]

    // Steps stats
    const stepsEntries = yearEntries.filter(e => e.steps && e.steps > 0)
    const totalSteps = stepsEntries.reduce((sum, e) => sum + (e.steps || 0), 0)
    const avgSteps = stepsEntries.length > 0 ? Math.round(totalSteps / stepsEntries.length) : 0
    const bestStepsDay = yearEntries.sort((a, b) => (b.steps || 0) - (a.steps || 0))[0]

    return {
      totalEntries,
      totalHabitsCompleted,
      topHabit,
      habitConsistency,
      totalDrinks,
      daysWithDrinks,
      soberDays,
      favoriteDrink,
      totalEvents,
      topEvent,
      flights,
      trains,
      nightsAway,
      citiesVisited: citiesVisited.size,
      avgMood,
      happyDays,
      bestMoodDay,
      totalSteps,
      avgSteps,
      bestStepsDay,
    }
  }, [yearEntries])

  const slides = [
    // Intro slide
    {
      gradient: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
      content: (
        <>
          <Sparkles className="h-16 w-16 text-white mb-6 animate-pulse" />
          <h1 className="text-5xl font-bold text-white mb-4">Your {targetYear}</h1>
          <p className="text-xl text-white/80">Wrapped</p>
          <p className="text-white/60 mt-8">{stats.totalEntries} days tracked</p>
        </>
      ),
    },
    // Habits slide
    {
      gradient: 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600',
      content: (
        <>
          <Target className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-2">You completed</p>
          <p className="text-7xl font-bold text-white mb-4">
            <AnimatedNumber value={stats.totalHabitsCompleted} />
          </p>
          <p className="text-2xl text-white/90 mb-8">healthy habits</p>
          {stats.topHabit && (
            <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur">
              <p className="text-white/70 text-sm">Your most consistent habit</p>
              <p className="text-white text-xl font-semibold">
                {habitLabels[stats.topHabit[0] as HabitType] || stats.topHabit[0]}
              </p>
              <p className="text-white/80">{stats.topHabit[1]} times</p>
            </div>
          )}
        </>
      ),
    },
    // Alcohol slide
    {
      gradient: 'bg-gradient-to-br from-purple-700 via-violet-600 to-indigo-700',
      content: (
        <>
          <Wine className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-2">You had</p>
          <p className="text-7xl font-bold text-white mb-4">
            <AnimatedNumber value={stats.totalDrinks} />
          </p>
          <p className="text-2xl text-white/90 mb-6">drinks this year</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white">{stats.soberDays}</p>
              <p className="text-white/70 text-sm">sober days</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur text-center">
              <p className="text-3xl font-bold text-white">{stats.daysWithDrinks}</p>
              <p className="text-white/70 text-sm">drinking days</p>
            </div>
          </div>
          {stats.favoriteDrink && stats.favoriteDrink[1] > 0 && (
            <p className="text-white/70 mt-6">
              Favorite: <span className="text-white font-medium capitalize">{stats.favoriteDrink[0]}</span>
            </p>
          )}
        </>
      ),
    },
    // Travel slide
    {
      gradient: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600',
      content: (
        <>
          <Plane className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-2">You traveled</p>
          <p className="text-7xl font-bold text-white mb-4">
            <AnimatedNumber value={stats.nightsAway} />
          </p>
          <p className="text-2xl text-white/90 mb-6">nights away from home</p>
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
            <div className="bg-white/20 rounded-xl px-3 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold text-white">{stats.flights}</p>
              <p className="text-white/70 text-xs">flights</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold text-white">{stats.trains}</p>
              <p className="text-white/70 text-xs">trains</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold text-white">{stats.citiesVisited}</p>
              <p className="text-white/70 text-xs">cities</p>
            </div>
          </div>
        </>
      ),
    },
    // Mood slide
    {
      gradient: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500',
      content: (
        <>
          <Heart className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-2">Your average mood was</p>
          <p className="text-7xl font-bold text-white mb-4">{stats.avgMood}</p>
          <p className="text-2xl text-white/90 mb-6">out of 10</p>
          <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur text-center">
            <p className="text-4xl font-bold text-white">{stats.happyDays}</p>
            <p className="text-white/80">days you felt great (7+)</p>
          </div>
          {stats.bestMoodDay && stats.bestMoodDay.mood_score && (
            <p className="text-white/70 mt-4 text-sm">
              Best day: {format(parseISO(stats.bestMoodDay.entry_date), 'MMMM d')} ({stats.bestMoodDay.mood_score}/10)
            </p>
          )}
        </>
      ),
    },
    // Steps slide
    {
      gradient: 'bg-gradient-to-br from-lime-500 via-green-500 to-emerald-600',
      content: (
        <>
          <TrendingUp className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-2">You walked</p>
          <p className="text-6xl font-bold text-white mb-4">
            <AnimatedNumber value={stats.totalSteps} />
          </p>
          <p className="text-2xl text-white/90 mb-6">total steps</p>
          <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur text-center">
            <p className="text-white/70 text-sm">Daily average</p>
            <p className="text-3xl font-bold text-white">
              <AnimatedNumber value={stats.avgSteps} />
            </p>
          </div>
          {stats.bestStepsDay && stats.bestStepsDay.steps && (
            <p className="text-white/70 mt-4 text-sm">
              Best day: {format(parseISO(stats.bestStepsDay.entry_date), 'MMMM d')} ({stats.bestStepsDay.steps.toLocaleString()} steps)
            </p>
          )}
        </>
      ),
    },
    // Events slide
    {
      gradient: 'bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-600',
      content: (
        <>
          <Sparkles className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-2">You logged</p>
          <p className="text-7xl font-bold text-white mb-4">
            <AnimatedNumber value={stats.totalEvents} />
          </p>
          <p className="text-2xl text-white/90 mb-6">life events</p>
          {stats.topEvent && (
            <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur">
              <p className="text-white/70 text-sm">Most frequent</p>
              <p className="text-white text-xl font-semibold">
                {eventLabels[stats.topEvent[0] as EventType] || stats.topEvent[0]}
              </p>
              <p className="text-white/80">{stats.topEvent[1]} times</p>
            </div>
          )}
        </>
      ),
    },
    // Outro slide
    {
      gradient: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500',
      content: (
        <>
          <h1 className="text-4xl font-bold text-white mb-6">That was your {targetYear}!</h1>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-8">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold text-white">{stats.totalEntries}</p>
              <p className="text-white/70 text-xs">days tracked</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold text-white">{stats.totalHabitsCompleted}</p>
              <p className="text-white/70 text-xs">habits done</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold text-white">{stats.totalEvents}</p>
              <p className="text-white/70 text-xs">events</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold text-white">{stats.nightsAway}</p>
              <p className="text-white/70 text-xs">nights away</p>
            </div>
          </div>
          <p className="text-white/80">Here's to an even better {targetYear + 1}!</p>
        </>
      ),
    },
  ]

  const nextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }, [currentSlide, slides.length])

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }, [currentSlide])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextSlide()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevSlide()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide, onClose])

  return (
    <div className="fixed inset-0 z-[9999] bg-black isolate">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Progress dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              idx === currentSlide ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
            )}
          />
        ))}
      </div>

      {/* Slides */}
      <div className="relative h-full w-full overflow-hidden">
        {slides.map((slide, idx) => (
          <Slide key={idx} gradient={slide.gradient} active={idx === currentSlide}>
            {slide.content}
          </Slide>
        ))}
      </div>

      {/* Navigation */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-10">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className={cn(
            'p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors',
            currentSlide === 0 && 'opacity-30 cursor-not-allowed'
          )}
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className={cn(
            'p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors',
            currentSlide === slides.length - 1 && 'opacity-30 cursor-not-allowed'
          )}
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Keyboard navigation hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">
        Tap or use arrow keys to navigate
      </p>
    </div>
  )
}
