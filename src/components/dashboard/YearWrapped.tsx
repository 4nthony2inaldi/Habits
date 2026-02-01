'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { format, parseISO, startOfYear, endOfYear, getYear, getDay, differenceInDays } from 'date-fns'
import { X, ChevronRight, ChevronLeft, Sparkles, Target, Wine, Plane, Heart, TrendingUp, Moon, Calendar, MapPin, Zap } from 'lucide-react'
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
    }).sort((a, b) => a.entry_date.localeCompare(b.entry_date))
  }, [entries, targetYear])

  // Calculate all stats
  const stats = useMemo(() => {
    const totalEntries = yearEntries.length
    if (totalEntries === 0) {
      return null
    }

    // Habits stats
    const habitCounts: Record<string, number> = {}
    let totalHabitsCompleted = 0
    yearEntries.forEach(entry => {
      entry.healthy_habits.forEach(h => {
        habitCounts[h.habit_type] = (habitCounts[h.habit_type] || 0) + 1
        totalHabitsCompleted++
      })
    })
    const sortedHabits = Object.entries(habitCounts).sort((a, b) => b[1] - a[1])
    const topHabits = sortedHabits.slice(0, 3)

    // Alcohol stats
    let totalDrinks = 0
    let daysWithDrinks = 0
    let soberDays = 0
    const drinkTypes = { beers: 0, wine: 0, liquor: 0, seltzers: 0, shots: 0 }
    const drinksByDayOfWeek = [0, 0, 0, 0, 0, 0, 0]
    const dayCountByDayOfWeek = [0, 0, 0, 0, 0, 0, 0]

    // For streaks
    let currentSoberStreak = 0
    let longestSoberStreak = 0
    let soberStreakStart = ''
    let soberStreakEnd = ''
    let tempSoberStart = ''

    let currentDrinkStreak = 0
    let longestDrinkStreak = 0
    let drinkStreakStart = ''
    let drinkStreakEnd = ''
    let tempDrinkStart = ''

    yearEntries.forEach(entry => {
      const dayDrinks = (entry.beers || 0) + (entry.wine || 0) + (entry.liquor || 0) +
                        (entry.seltzers || 0) + (entry.shots || 0)
      const dayOfWeek = getDay(parseISO(entry.entry_date))

      totalDrinks += dayDrinks
      drinksByDayOfWeek[dayOfWeek] += dayDrinks
      dayCountByDayOfWeek[dayOfWeek]++

      if (dayDrinks > 0) {
        daysWithDrinks++
        drinkTypes.beers += entry.beers || 0
        drinkTypes.wine += entry.wine || 0
        drinkTypes.liquor += entry.liquor || 0
        drinkTypes.seltzers += entry.seltzers || 0
        drinkTypes.shots += entry.shots || 0

        // Drinking streak
        if (currentDrinkStreak === 0) tempDrinkStart = entry.entry_date
        currentDrinkStreak++
        if (currentDrinkStreak > longestDrinkStreak) {
          longestDrinkStreak = currentDrinkStreak
          drinkStreakStart = tempDrinkStart
          drinkStreakEnd = entry.entry_date
        }

        // Reset sober streak
        currentSoberStreak = 0
      } else {
        soberDays++

        // Sober streak
        if (currentSoberStreak === 0) tempSoberStart = entry.entry_date
        currentSoberStreak++
        if (currentSoberStreak > longestSoberStreak) {
          longestSoberStreak = currentSoberStreak
          soberStreakStart = tempSoberStart
          soberStreakEnd = entry.entry_date
        }

        // Reset drink streak
        currentDrinkStreak = 0
      }
    })

    const favoriteDrink = Object.entries(drinkTypes).sort((a, b) => b[1] - a[1])[0]

    // Average drinks by day of week
    const avgDrinksByDay = drinksByDayOfWeek.map((drinks, i) =>
      dayCountByDayOfWeek[i] > 0 ? drinks / dayCountByDayOfWeek[i] : 0
    )
    const booziesDay = avgDrinksByDay.indexOf(Math.max(...avgDrinksByDay))
    const soberestDay = avgDrinksByDay.indexOf(Math.min(...avgDrinksByDay))

    // Events stats
    const eventCounts: Record<string, number> = {}
    let totalEvents = 0
    yearEntries.forEach(entry => {
      entry.life_events.forEach(e => {
        eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1
        totalEvents++
      })
    })
    const sortedEvents = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])
    const topEvents = sortedEvents.slice(0, 5)

    // Travel stats
    const flights = eventCounts['flight'] || 0
    const trains = eventCounts['train'] || 0
    let nightsAway = 0
    const cityCounts: Record<string, number> = {}

    // Track trips and home streaks
    let currentTripLength = 0
    let longestTrip = 0
    let longestTripStart = ''
    let longestTripEnd = ''
    let tempTripStart = ''

    let currentHomeStreak = 0
    let longestHomeStreak = 0
    let homeStreakStart = ''
    let homeStreakEnd = ''
    let tempHomeStart = ''

    yearEntries.forEach(entry => {
      const isAway = entry.city_sleep && entry.city_wake &&
        entry.city_sleep.toLowerCase() !== entry.city_wake.toLowerCase()

      if (isAway && entry.city_sleep) {
        nightsAway++
        const city = entry.city_sleep.split(',')[0].trim()
        cityCounts[city] = (cityCounts[city] || 0) + 1

        // Trip tracking
        if (currentTripLength === 0) tempTripStart = entry.entry_date
        currentTripLength++
        if (currentTripLength > longestTrip) {
          longestTrip = currentTripLength
          longestTripStart = tempTripStart
          longestTripEnd = entry.entry_date
        }

        // Reset home streak
        currentHomeStreak = 0
      } else {
        // Home streak
        if (currentHomeStreak === 0) tempHomeStart = entry.entry_date
        currentHomeStreak++
        if (currentHomeStreak > longestHomeStreak) {
          longestHomeStreak = currentHomeStreak
          homeStreakStart = tempHomeStart
          homeStreakEnd = entry.entry_date
        }

        // Reset trip
        currentTripLength = 0
      }
    })

    const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])
    const topCities = sortedCities.slice(0, 5)
    const citiesVisited = Object.keys(cityCounts).length

    // Mood stats
    const moodScores = yearEntries
      .filter(e => e.mood_score !== null)
      .map(e => ({ score: e.mood_score as number, entry: e }))

    const avgMood = moodScores.length > 0
      ? (moodScores.reduce((a, b) => a + b.score, 0) / moodScores.length).toFixed(1)
      : 'N/A'
    const happyDays = moodScores.filter(m => m.score >= 7).length
    const bestMoodEntry = moodScores.sort((a, b) => b.score - a.score)[0]?.entry

    // Mood correlations
    const moodWhenExercised = yearEntries
      .filter(e => e.mood_score !== null && e.healthy_habits.some(h => h.habit_type === 'exercise'))
      .map(e => e.mood_score as number)
    const avgMoodExercise = moodWhenExercised.length > 0
      ? (moodWhenExercised.reduce((a, b) => a + b, 0) / moodWhenExercised.length).toFixed(1)
      : null

    const moodWhenSober = yearEntries
      .filter(e => e.mood_score !== null &&
        ((e.beers || 0) + (e.wine || 0) + (e.liquor || 0) + (e.seltzers || 0) + (e.shots || 0)) === 0)
      .map(e => e.mood_score as number)
    const avgMoodSober = moodWhenSober.length > 0
      ? (moodWhenSober.reduce((a, b) => a + b, 0) / moodWhenSober.length).toFixed(1)
      : null

    const moodWhenDrinking = yearEntries
      .filter(e => e.mood_score !== null &&
        ((e.beers || 0) + (e.wine || 0) + (e.liquor || 0) + (e.seltzers || 0) + (e.shots || 0)) > 0)
      .map(e => e.mood_score as number)
    const avgMoodDrinking = moodWhenDrinking.length > 0
      ? (moodWhenDrinking.reduce((a, b) => a + b, 0) / moodWhenDrinking.length).toFixed(1)
      : null

    const moodWhenTraveling = yearEntries
      .filter(e => e.mood_score !== null && e.city_sleep && e.city_wake &&
        e.city_sleep.toLowerCase() !== e.city_wake.toLowerCase())
      .map(e => e.mood_score as number)
    const avgMoodTravel = moodWhenTraveling.length > 0
      ? (moodWhenTraveling.reduce((a, b) => a + b, 0) / moodWhenTraveling.length).toFixed(1)
      : null

    // Steps stats
    const stepsEntries = yearEntries.filter(e => e.steps && e.steps > 0)
    const totalSteps = stepsEntries.reduce((sum, e) => sum + (e.steps || 0), 0)
    const avgSteps = stepsEntries.length > 0 ? Math.round(totalSteps / stepsEntries.length) : 0
    const bestStepsEntry = [...yearEntries].sort((a, b) => (b.steps || 0) - (a.steps || 0))[0]

    // Personality insights
    const isHomebody = longestHomeStreak > 30
    const isExplorer = citiesVisited >= 10
    const isSocialDrinker = booziesDay === 5 || booziesDay === 6 // Fri or Sat
    const isHealthNut = totalHabitsCompleted > totalEntries * 3

    return {
      totalEntries,
      totalHabitsCompleted,
      topHabits,
      totalDrinks,
      daysWithDrinks,
      soberDays,
      favoriteDrink,
      longestSoberStreak,
      soberStreakStart,
      soberStreakEnd,
      longestDrinkStreak,
      drinkStreakStart,
      drinkStreakEnd,
      booziesDay,
      soberestDay,
      avgDrinksByDay,
      totalEvents,
      topEvents,
      flights,
      trains,
      nightsAway,
      citiesVisited,
      topCities,
      longestTrip,
      longestTripStart,
      longestTripEnd,
      longestHomeStreak,
      homeStreakStart,
      homeStreakEnd,
      avgMood,
      happyDays,
      bestMoodEntry,
      avgMoodExercise,
      avgMoodSober,
      avgMoodDrinking,
      avgMoodTravel,
      totalSteps,
      avgSteps,
      bestStepsEntry,
      isHomebody,
      isExplorer,
      isSocialDrinker,
      isHealthNut,
    }
  }, [yearEntries])

  if (!stats) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black isolate flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-2xl mb-4">No data for {targetYear}</p>
          <button onClick={onClose} className="px-4 py-2 bg-white/20 rounded-lg">Close</button>
        </div>
      </div>
    )
  }

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
          <p className="text-white/40 text-sm mt-2">Let's see what you've been up to...</p>
        </>
      ),
    },
    // Habits slide
    {
      gradient: 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600',
      content: (
        <>
          <Target className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-2">You crushed</p>
          <p className="text-7xl font-bold text-white mb-2">
            <AnimatedNumber value={stats.totalHabitsCompleted} />
          </p>
          <p className="text-2xl text-white/90 mb-6">healthy habits</p>
          {stats.topHabits.length > 0 && (
            <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur w-full max-w-xs">
              <p className="text-white/70 text-sm mb-2">Your top habits</p>
              {stats.topHabits.map(([habit, count], i) => (
                <div key={habit} className="flex justify-between items-center py-1">
                  <span className="text-white">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {habitLabels[habit as HabitType] || habit}
                  </span>
                  <span className="text-white/70 text-sm">{count}x</span>
                </div>
              ))}
            </div>
          )}
          {stats.isHealthNut && (
            <p className="text-white/70 mt-4 text-sm italic">You're basically a wellness influencer 💪</p>
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
          <p className="text-7xl font-bold text-white mb-2">
            <AnimatedNumber value={stats.totalDrinks} />
          </p>
          <p className="text-2xl text-white/90 mb-4">drinks this year</p>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-4">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold text-white">{stats.soberDays}</p>
              <p className="text-white/70 text-xs">sober days</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur text-center">
              <p className="text-2xl font-bold text-white">{stats.daysWithDrinks}</p>
              <p className="text-white/70 text-xs">drinking days</p>
            </div>
          </div>
          {stats.favoriteDrink && stats.favoriteDrink[1] > 0 && (
            <p className="text-white/70 text-sm">
              Drink of choice: <span className="text-white font-medium capitalize">{stats.favoriteDrink[0]}</span> 🍺
            </p>
          )}
        </>
      ),
    },
    // Drinking patterns slide
    {
      gradient: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600',
      content: (
        <>
          <Calendar className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-6">Your drinking patterns</p>
          <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur w-full max-w-sm mb-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES_SHORT.map((day, i) => (
                <div key={day} className="text-center">
                  <div
                    className="h-16 rounded-md mb-1 flex items-end justify-center"
                    style={{
                      backgroundColor: `rgba(255,255,255,${0.1 + (stats.avgDrinksByDay[i] / Math.max(...stats.avgDrinksByDay)) * 0.5})`
                    }}
                  >
                    <div
                      className="w-full bg-white/60 rounded-t-md"
                      style={{
                        height: `${(stats.avgDrinksByDay[i] / Math.max(...stats.avgDrinksByDay)) * 100}%`,
                        minHeight: stats.avgDrinksByDay[i] > 0 ? '4px' : '0'
                      }}
                    />
                  </div>
                  <span className="text-white/60 text-[10px]">{day}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-white text-lg">
            <span className="font-bold">{DAY_NAMES[stats.booziesDay]}</span> was your booziest day
          </p>
          <p className="text-white/70 text-sm">
            {DAY_NAMES[stats.soberestDay]} was your most sober
          </p>
          {stats.isSocialDrinker && (
            <p className="text-white/50 text-xs mt-2 italic">Classic weekend warrior 🎉</p>
          )}
        </>
      ),
    },
    // Streaks slide
    {
      gradient: 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500',
      content: (
        <>
          <Zap className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-6">Your longest streaks</p>
          <div className="space-y-4 w-full max-w-xs">
            <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur">
              <p className="text-white/70 text-sm">Longest sober streak</p>
              <p className="text-4xl font-bold text-white">{stats.longestSoberStreak} days</p>
              {stats.soberStreakStart && (
                <p className="text-white/60 text-xs mt-1">
                  {format(parseISO(stats.soberStreakStart), 'MMM d')} - {format(parseISO(stats.soberStreakEnd), 'MMM d')}
                </p>
              )}
            </div>
            {stats.longestDrinkStreak > 1 && (
              <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur">
                <p className="text-white/70 text-sm">Longest drinking streak</p>
                <p className="text-4xl font-bold text-white">{stats.longestDrinkStreak} days</p>
                {stats.drinkStreakStart && (
                  <p className="text-white/60 text-xs mt-1">
                    {format(parseISO(stats.drinkStreakStart), 'MMM d')} - {format(parseISO(stats.drinkStreakEnd), 'MMM d')}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      ),
    },
    // Travel slide
    {
      gradient: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600',
      content: (
        <>
          <Plane className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-2">You spent</p>
          <p className="text-7xl font-bold text-white mb-2">
            <AnimatedNumber value={stats.nightsAway} />
          </p>
          <p className="text-2xl text-white/90 mb-4">nights away from home</p>
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm mb-4">
            <div className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur text-center">
              <p className="text-xl font-bold text-white">{stats.flights}</p>
              <p className="text-white/70 text-[10px]">flights</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur text-center">
              <p className="text-xl font-bold text-white">{stats.trains}</p>
              <p className="text-white/70 text-[10px]">trains</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur text-center">
              <p className="text-xl font-bold text-white">{stats.citiesVisited}</p>
              <p className="text-white/70 text-[10px]">cities</p>
            </div>
          </div>
          {stats.longestTrip > 0 && (
            <p className="text-white/70 text-sm">
              Longest trip: <span className="text-white font-medium">{stats.longestTrip} nights</span>
              {stats.longestTripStart && (
                <span className="text-white/50"> ({format(parseISO(stats.longestTripStart), 'MMM d')})</span>
              )}
            </p>
          )}
          {stats.isExplorer && (
            <p className="text-white/50 text-xs mt-2 italic">You've got serious wanderlust ✈️</p>
          )}
        </>
      ),
    },
    // Cities slide
    {
      gradient: 'bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600',
      content: (
        <>
          <MapPin className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-6">Where you slept</p>
          {stats.topCities.length > 0 ? (
            <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur w-full max-w-xs mb-4">
              <p className="text-white/70 text-sm mb-2">Your favorite cities</p>
              {stats.topCities.map(([city, count], i) => (
                <div key={city} className="flex justify-between items-center py-1">
                  <span className="text-white">{city}</span>
                  <span className="text-white/70 text-sm">{count} nights</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70">No travel data this year</p>
          )}
          {stats.longestHomeStreak > 0 && (
            <div className="bg-white/20 rounded-2xl px-5 py-3 backdrop-blur">
              <p className="text-white/70 text-xs">Longest time at home</p>
              <p className="text-2xl font-bold text-white">{stats.longestHomeStreak} days</p>
            </div>
          )}
          {stats.isHomebody && (
            <p className="text-white/50 text-xs mt-3 italic">Home is where the heart is 🏠</p>
          )}
        </>
      ),
    },
    // Mood slide
    {
      gradient: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500',
      content: (
        <>
          <Heart className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-2">Your average mood</p>
          <p className="text-7xl font-bold text-white mb-2">{stats.avgMood}</p>
          <p className="text-2xl text-white/90 mb-4">out of 10</p>
          <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur text-center mb-4">
            <p className="text-3xl font-bold text-white">{stats.happyDays}</p>
            <p className="text-white/80 text-sm">days you felt great (7+)</p>
          </div>
          {stats.bestMoodEntry && stats.bestMoodEntry.mood_score && (
            <p className="text-white/70 text-sm">
              Best day: <span className="text-white">{format(parseISO(stats.bestMoodEntry.entry_date), 'MMMM d')}</span> ({stats.bestMoodEntry.mood_score}/10)
            </p>
          )}
        </>
      ),
    },
    // Mood correlations slide
    {
      gradient: 'bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600',
      content: (
        <>
          <Heart className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-6">What made you happiest?</p>
          <div className="space-y-3 w-full max-w-xs">
            {stats.avgMoodExercise && (
              <div className="bg-white/20 rounded-xl px-5 py-3 backdrop-blur flex justify-between items-center">
                <span className="text-white">When you exercised</span>
                <span className="text-white font-bold">{stats.avgMoodExercise}</span>
              </div>
            )}
            {stats.avgMoodSober && (
              <div className="bg-white/20 rounded-xl px-5 py-3 backdrop-blur flex justify-between items-center">
                <span className="text-white">When sober</span>
                <span className="text-white font-bold">{stats.avgMoodSober}</span>
              </div>
            )}
            {stats.avgMoodDrinking && (
              <div className="bg-white/20 rounded-xl px-5 py-3 backdrop-blur flex justify-between items-center">
                <span className="text-white">When drinking</span>
                <span className="text-white font-bold">{stats.avgMoodDrinking}</span>
              </div>
            )}
            {stats.avgMoodTravel && (
              <div className="bg-white/20 rounded-xl px-5 py-3 backdrop-blur flex justify-between items-center">
                <span className="text-white">When traveling</span>
                <span className="text-white font-bold">{stats.avgMoodTravel}</span>
              </div>
            )}
          </div>
          {stats.avgMoodExercise && stats.avgMoodSober &&
           parseFloat(stats.avgMoodExercise) > parseFloat(stats.avgMood) && (
            <p className="text-white/50 text-xs mt-4 italic">Exercise really does make you happier! 🏃</p>
          )}
        </>
      ),
    },
    // Events slide
    {
      gradient: 'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600',
      content: (
        <>
          <Sparkles className="h-12 w-12 text-white/80 mb-4" />
          <p className="text-white/80 text-lg mb-2">You logged</p>
          <p className="text-7xl font-bold text-white mb-2">
            <AnimatedNumber value={stats.totalEvents} />
          </p>
          <p className="text-2xl text-white/90 mb-6">life events</p>
          {stats.topEvents.length > 0 && (
            <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur w-full max-w-xs">
              <p className="text-white/70 text-sm mb-2">Your favorites</p>
              {stats.topEvents.map(([event, count]) => (
                <div key={event} className="flex justify-between items-center py-1">
                  <span className="text-white text-sm">
                    {eventLabels[event as EventType] || event}
                  </span>
                  <span className="text-white/70 text-sm">{count}x</span>
                </div>
              ))}
            </div>
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
          <p className="text-5xl font-bold text-white mb-2">
            <AnimatedNumber value={stats.totalSteps} />
          </p>
          <p className="text-2xl text-white/90 mb-4">total steps</p>
          <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur text-center mb-4">
            <p className="text-white/70 text-sm">Daily average</p>
            <p className="text-3xl font-bold text-white">
              <AnimatedNumber value={stats.avgSteps} />
            </p>
          </div>
          {stats.bestStepsEntry && stats.bestStepsEntry.steps && (
            <p className="text-white/70 text-sm">
              Best day: <span className="text-white">{format(parseISO(stats.bestStepsEntry.entry_date), 'MMMM d')}</span>
              <span className="text-white/50"> ({stats.bestStepsEntry.steps.toLocaleString()} steps)</span>
            </p>
          )}
        </>
      ),
    },
    // Outro slide
    {
      gradient: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500',
      content: (
        <>
          <h1 className="text-4xl font-bold text-white mb-6">That's your {targetYear}!</h1>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
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
          <p className="text-white/80 text-lg">Here's to an even better {targetYear + 1}! 🎉</p>
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

      {/* Keyboard hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">
        Use arrow keys or tap to navigate
      </p>
    </div>
  )
}
