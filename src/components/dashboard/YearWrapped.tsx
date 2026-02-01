'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { format, parseISO, startOfYear, endOfYear, getYear, getDay, differenceInDays } from 'date-fns'
import { X, ChevronRight, ChevronLeft, Sparkles, Target, Wine, Plane, Heart, TrendingUp, Moon, Calendar, MapPin, Zap, Footprints } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { DailyEntryWithRelations, HabitType, EventType, Profile } from '@/types/database'
import { habitLabels, eventLabels } from '@/types/forms'

interface YearWrappedProps {
  entries: DailyEntryWithRelations[]
  profile: Profile
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

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Fun comparisons
function getDrinkComparison(totalDrinks: number): string {
  const ozPerDrink = 12 // Average oz per drink
  const totalOz = totalDrinks * ozPerDrink
  const gallons = totalOz / 128

  if (gallons >= 50) return `That's enough to fill a bathtub! 🛁`
  if (gallons >= 20) return `That's ${Math.round(gallons / 5)} 5-gallon jugs! 🫗`
  if (totalDrinks >= 365) return `That's more than one drink per day! 🍻`
  if (totalDrinks >= 200) return `About ${Math.round(totalDrinks / 6)} six-packs worth 📦`
  if (totalDrinks >= 100) return `Enough to toast ${totalDrinks} different occasions 🥂`
  if (totalDrinks >= 52) return `About one drink per week on average 🍷`
  return `A pretty moderate year! 👍`
}

function getStepsComparison(totalSteps: number): string {
  const miles = totalSteps / 2000 // Average 2000 steps per mile
  const marathons = miles / 26.2
  const centralParkLoops = miles / 6 // Central Park loop is ~6 miles
  const earthCircumference = 24901
  const moonDistance = 238900

  if (miles >= 3000) return `You walked ${Math.round(miles / 100) * 100}+ miles - that's like walking from NYC to LA! 🗽→🌴`
  if (miles >= 1500) return `That's ${Math.round(marathons)} marathons! You could've run across a small country 🏃`
  if (miles >= 1000) return `You walked ${Math.round(miles)} miles - enough to walk the entire Appalachian Trail would take 2x more! 🥾`
  if (miles >= 500) return `That's like walking around Central Park ${Math.round(centralParkLoops)} times! 🌳`
  if (miles >= 200) return `You walked roughly the length of 7,000 football fields! 🏈`
  if (miles >= 100) return `That's about ${Math.round(miles)} miles - keep stepping! 👟`
  return `Every step counts! 🚶`
}

function getNightsAwayComparison(nightsAway: number, totalDays: number): string {
  const percentAway = Math.round((nightsAway / totalDays) * 100)
  const months = nightsAway / 30

  if (nightsAway >= 180) return `You spent more time away than home - you're basically a nomad! 🧳`
  if (nightsAway >= 90) return `That's ${Math.round(months)} months away from home! Professional traveler status 🌍`
  if (nightsAway >= 60) return `You spent ${percentAway}% of the year on adventures! 🗺️`
  if (nightsAway >= 30) return `A full month's worth of travels! 🛫`
  if (nightsAway >= 14) return `Two weeks of adventure - not bad! ✈️`
  if (nightsAway >= 7) return `A week away from the comfort of home 🏠`
  return `Home sweet home was your vibe this year 🏡`
}

// Helper to format year-over-year change
function formatYoYChange(current: number, previous: number | undefined, unit: string = ''): string | null {
  if (previous === undefined || previous === 0) return null
  const diff = current - previous
  const percentChange = Math.round((diff / previous) * 100)
  if (Math.abs(percentChange) < 5) return null // Ignore tiny changes
  const direction = diff > 0 ? '↑' : '↓'
  const absPercent = Math.abs(percentChange)
  return `${direction} ${absPercent}% vs last year`
}

export function YearWrapped({ entries, profile, year, onClose }: YearWrappedProps) {
  const targetYear = year || getYear(new Date()) - 1
  const [currentSlide, setCurrentSlide] = useState(0)

  // Filter entries for the target year and previous year
  const { yearEntries, prevYearEntries } = useMemo(() => {
    const yearStart = startOfYear(new Date(targetYear, 0, 1))
    const yearEnd = endOfYear(new Date(targetYear, 0, 1))
    const prevYearStart = startOfYear(new Date(targetYear - 1, 0, 1))
    const prevYearEnd = endOfYear(new Date(targetYear - 1, 0, 1))

    return {
      yearEntries: entries.filter(entry => {
        const date = parseISO(entry.entry_date)
        return date >= yearStart && date <= yearEnd
      }).sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
      prevYearEntries: entries.filter(entry => {
        const date = parseISO(entry.entry_date)
        return date >= prevYearStart && date <= prevYearEnd
      }).sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    }
  }, [entries, targetYear])

  // Calculate stats for a given set of entries
  const calculateStats = useCallback((yearEntries: DailyEntryWithRelations[]) => {
    const totalEntries = yearEntries.length
    if (totalEntries === 0) {
      return null
    }

    const homeCity = profile.home_city?.toLowerCase() || ''
    const homeLat = profile.home_lat
    const homeLng = profile.home_lng

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
    const habitConsistency = totalEntries > 0 ? Math.round((totalHabitsCompleted / totalEntries) * 10) / 10 : 0

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

    // Helper to get context for a date
    const getDateContext = (entry: DailyEntryWithRelations): string | null => {
      const sleepCity = entry.city_sleep?.split(',')[0].trim() || ''
      const sleepCityLower = sleepCity.toLowerCase()
      const wasAway = sleepCityLower && sleepCityLower !== 'home' && sleepCityLower !== 'unknown' && sleepCityLower !== homeCity
      return wasAway ? sleepCity : null
    }

    // Track biggest drinking day
    let biggestDrinkingDay = { date: '', drinks: 0, city: null as string | null }

    // Track binge drinking days (5+ drinks)
    let bingeDrinkingDays = 0
    const bingeDaysList: { date: string; drinks: number }[] = []

    // Track weekly drinks for heavy drinking week analysis
    const weeklyDrinks: Record<string, { drinks: number; startDate: string; endDate: string }> = {}
    let heavyDrinkingWeeks = 0
    let biggestDrinkingWeek = { weekKey: '', drinks: 0, startDate: '', endDate: '' }

    yearEntries.forEach(entry => {
      const dayDrinks = (entry.beers || 0) + (entry.wine || 0) + (entry.liquor || 0) +
                        (entry.seltzers || 0) + (entry.shots || 0)
      const dayOfWeek = getDay(parseISO(entry.entry_date))

      totalDrinks += dayDrinks
      drinksByDayOfWeek[dayOfWeek] += dayDrinks
      dayCountByDayOfWeek[dayOfWeek]++

      if (dayDrinks > biggestDrinkingDay.drinks) {
        biggestDrinkingDay = { date: entry.entry_date, drinks: dayDrinks, city: getDateContext(entry) }
      }

      // Track binge drinking days (5+ drinks)
      if (dayDrinks >= 5) {
        bingeDrinkingDays++
        bingeDaysList.push({ date: entry.entry_date, drinks: dayDrinks })
      }

      // Track weekly drinks (using ISO week format)
      const entryDate = parseISO(entry.entry_date)
      const weekStart = new Date(entryDate)
      weekStart.setDate(entryDate.getDate() - entryDate.getDay()) // Start of week (Sunday)
      const weekKey = format(weekStart, 'yyyy-MM-dd')

      if (!weeklyDrinks[weekKey]) {
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weeklyDrinks[weekKey] = { drinks: 0, startDate: weekKey, endDate: format(weekEnd, 'yyyy-MM-dd') }
      }
      weeklyDrinks[weekKey].drinks += dayDrinks

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
    const avgDrinksPerDrinkingDay = daysWithDrinks > 0 ? Math.round((totalDrinks / daysWithDrinks) * 10) / 10 : 0

    // Average drinks by day of week
    const avgDrinksByDay = drinksByDayOfWeek.map((drinks, i) =>
      dayCountByDayOfWeek[i] > 0 ? drinks / dayCountByDayOfWeek[i] : 0
    )
    const booziesDay = avgDrinksByDay.indexOf(Math.max(...avgDrinksByDay))
    const soberestDay = avgDrinksByDay.indexOf(Math.min(...avgDrinksByDay))

    // Calculate heavy drinking weeks (14+ drinks/week) and find biggest week
    Object.entries(weeklyDrinks).forEach(([weekKey, weekData]) => {
      if (weekData.drinks >= 14) {
        heavyDrinkingWeeks++
      }
      if (weekData.drinks > biggestDrinkingWeek.drinks) {
        biggestDrinkingWeek = {
          weekKey,
          drinks: weekData.drinks,
          startDate: weekData.startDate,
          endDate: weekData.endDate
        }
      }
    })

    // Calculate average drinks per week
    const totalWeeks = Object.keys(weeklyDrinks).length
    const avgDrinksPerWeek = totalWeeks > 0 ? Math.round((totalDrinks / totalWeeks) * 10) / 10 : 0

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

    // Travel stats - FIXED: nights away = any night with city_sleep filled in (not blank)
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

    // Track full itinerary for longest trip
    type TripStop = { city: string; date: string; lat: number | null; lng: number | null; nights: number }
    let currentTripItinerary: TripStop[] = []
    let longestTripItinerary: TripStop[] = []
    let lastCity = ''

    let currentHomeStreak = 0
    let longestHomeStreak = 0
    let homeStreakStart = ''
    let homeStreakEnd = ''
    let tempHomeStart = ''

    // Track furthest from home
    let furthestCity = { name: '', distance: 0, lat: 0, lng: 0 }

    yearEntries.forEach(entry => {
      const sleepCity = entry.city_sleep || ''
      const sleepCityLower = sleepCity.toLowerCase()

      // Night away = city_sleep is filled AND not "home" or "unknown" and not same as home city
      const isAway = sleepCityLower &&
                     sleepCityLower !== 'home' &&
                     sleepCityLower !== 'unknown' &&
                     sleepCityLower !== homeCity

      if (isAway && sleepCity) {
        nightsAway++
        const city = sleepCity.split(',')[0].trim()
        cityCounts[city] = (cityCounts[city] || 0) + 1

        // Calculate distance from home if we have coordinates
        if (homeLat && homeLng && entry.city_sleep_lat && entry.city_sleep_lng) {
          const distance = calculateDistance(homeLat, homeLng, entry.city_sleep_lat, entry.city_sleep_lng)
          if (distance > furthestCity.distance) {
            furthestCity = {
              name: city,
              distance: Math.round(distance),
              lat: entry.city_sleep_lat,
              lng: entry.city_sleep_lng
            }
          }
        }

        // Trip tracking with full itinerary
        if (currentTripLength === 0) {
          tempTripStart = entry.entry_date
          currentTripItinerary = []
          lastCity = ''
        }
        currentTripLength++

        // Add to itinerary - combine consecutive nights in same city
        if (city === lastCity && currentTripItinerary.length > 0) {
          currentTripItinerary[currentTripItinerary.length - 1].nights++
        } else {
          currentTripItinerary.push({
            city,
            date: entry.entry_date,
            lat: entry.city_sleep_lat,
            lng: entry.city_sleep_lng,
            nights: 1
          })
          lastCity = city
        }

        if (currentTripLength > longestTrip) {
          longestTrip = currentTripLength
          longestTripStart = tempTripStart
          longestTripEnd = entry.entry_date
          longestTripItinerary = [...currentTripItinerary]
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
        currentTripItinerary = []
        lastCity = ''
      }
    })

    // Filter out home cities (Philadelphia, New York) from top destinations - they're not interesting
    const homeCityVariants = ['philadelphia', 'new york', 'nyc', 'philly', 'brooklyn', 'manhattan']
    const sortedCities = Object.entries(cityCounts)
      .filter(([city]) => !homeCityVariants.some(h => city.toLowerCase().includes(h)))
      .sort((a, b) => b[1] - a[1])
    const topCities = sortedCities.slice(0, 5)
    const citiesVisited = Object.keys(cityCounts).length

    // Mood stats
    const moodScores = yearEntries
      .filter(e => e.mood_score !== null)
      .map(e => ({ score: e.mood_score as number, entry: e }))

    const avgMood = moodScores.length > 0
      ? (moodScores.reduce((a, b) => a + b.score, 0) / moodScores.length).toFixed(1)
      : 'N/A'
    const happyDays = moodScores.filter(m => m.score >= 8).length
    const sadDays = moodScores.filter(m => m.score <= 3).length
    const bestMoodEntry = moodScores.sort((a, b) => b.score - a.score)[0]?.entry
    const worstMoodEntry = moodScores.sort((a, b) => a.score - b.score)[0]?.entry

    // Track all perfect 10/10 days with context
    const perfectDays = yearEntries
      .filter(e => e.mood_score === 10)
      .map(e => {
        const sleepCity = e.city_sleep?.split(',')[0].trim() || ''
        const sleepCityLower = sleepCity.toLowerCase()
        const wasAway = sleepCityLower && sleepCityLower !== 'home' && sleepCityLower !== 'unknown' && sleepCityLower !== homeCity
        return {
          date: e.entry_date,
          city: wasAway ? sleepCity : null,
          notes: e.notes?.slice(0, 100) || null,
          events: e.life_events.map(ev => eventLabels[ev.event_type as EventType] || ev.event_type)
        }
      })

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
      .filter(e => {
        const sleepCity = e.city_sleep?.toLowerCase() || ''
        return e.mood_score !== null && sleepCity && sleepCity !== 'home' && sleepCity !== 'unknown' && sleepCity !== homeCity
      })
      .map(e => e.mood_score as number)
    const avgMoodTravel = moodWhenTraveling.length > 0
      ? (moodWhenTraveling.reduce((a, b) => a + b, 0) / moodWhenTraveling.length).toFixed(1)
      : null

    // Steps stats
    const stepsEntries = yearEntries.filter(e => e.steps && e.steps > 0)
    const totalSteps = stepsEntries.reduce((sum, e) => sum + (e.steps || 0), 0)
    const avgSteps = stepsEntries.length > 0 ? Math.round(totalSteps / stepsEntries.length) : 0
    const bestStepsEntry = [...yearEntries].sort((a, b) => (b.steps || 0) - (a.steps || 0))[0]
    const totalMiles = Math.round(totalSteps / 2000)

    // Best month for habits
    const monthlyHabits: Record<string, number> = {}
    yearEntries.forEach(entry => {
      const month = format(parseISO(entry.entry_date), 'MMMM')
      monthlyHabits[month] = (monthlyHabits[month] || 0) + entry.healthy_habits.length
    })
    const bestHabitMonth = Object.entries(monthlyHabits).sort((a, b) => b[1] - a[1])[0]

    // Personality insights
    const isHomebody = longestHomeStreak > 30
    const isExplorer = citiesVisited >= 10 || nightsAway >= 60
    const isSocialDrinker = booziesDay === 5 || booziesDay === 6 // Fri or Sat
    const isHealthNut = totalHabitsCompleted > totalEntries * 3
    const isConsistent = stepsEntries.length > totalEntries * 0.8
    const isMoodTracker = moodScores.length > totalEntries * 0.8
    const percentSober = Math.round((soberDays / totalEntries) * 100)

    return {
      totalEntries,
      totalHabitsCompleted,
      topHabits,
      habitConsistency,
      bestHabitMonth,
      totalDrinks,
      daysWithDrinks,
      soberDays,
      percentSober,
      favoriteDrink,
      avgDrinksPerDrinkingDay,
      biggestDrinkingDay,
      bingeDrinkingDays,
      bingeDaysList,
      heavyDrinkingWeeks,
      biggestDrinkingWeek,
      avgDrinksPerWeek,
      totalWeeks,
      drinkTypes,
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
      longestTripItinerary,
      longestHomeStreak,
      homeStreakStart,
      homeStreakEnd,
      furthestCity,
      avgMood,
      happyDays,
      sadDays,
      perfectDays,
      bestMoodEntry,
      worstMoodEntry,
      avgMoodExercise,
      avgMoodSober,
      avgMoodDrinking,
      avgMoodTravel,
      totalSteps,
      avgSteps,
      totalMiles,
      bestStepsEntry,
      isHomebody,
      isExplorer,
      isSocialDrinker,
      isHealthNut,
      isConsistent,
      isMoodTracker,
    }
  }, [profile])

  // Calculate stats for current and previous year
  const stats = useMemo(() => calculateStats(yearEntries), [yearEntries, calculateStats])
  const prevStats = useMemo(() => calculateStats(prevYearEntries), [prevYearEntries, calculateStats])

  // Year-over-year comparisons
  const yoy = useMemo(() => {
    if (!stats || !prevStats) return null
    return {
      steps: formatYoYChange(stats.totalSteps, prevStats.totalSteps),
      habits: formatYoYChange(stats.totalHabitsCompleted, prevStats.totalHabitsCompleted),
      drinks: formatYoYChange(stats.totalDrinks, prevStats.totalDrinks),
      soberDays: formatYoYChange(stats.soberDays, prevStats.soberDays),
      nightsAway: formatYoYChange(stats.nightsAway, prevStats.nightsAway),
      avgMood: stats.avgMood !== 'N/A' && prevStats.avgMood !== 'N/A'
        ? formatYoYChange(parseFloat(stats.avgMood), parseFloat(prevStats.avgMood))
        : null,
      stepsRaw: prevStats.totalSteps > 0 ? stats.totalSteps - prevStats.totalSteps : null,
      habitsRaw: prevStats.totalHabitsCompleted > 0 ? stats.totalHabitsCompleted - prevStats.totalHabitsCompleted : null,
      drinksRaw: prevStats.totalDrinks > 0 ? stats.totalDrinks - prevStats.totalDrinks : null,
      nightsAwayRaw: prevStats.nightsAway > 0 ? stats.nightsAway - prevStats.nightsAway : null,
    }
  }, [stats, prevStats])

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
        <div className="text-center">
          <Sparkles className="h-16 w-16 text-white mb-6 animate-pulse mx-auto" />
          <h1 className="text-5xl font-bold text-white mb-4">Your {targetYear}</h1>
          <p className="text-xl text-white/80">Wrapped</p>
          <div className="mt-8 bg-white/20 rounded-2xl px-6 py-4 backdrop-blur mx-auto">
            <p className="text-4xl font-bold text-white">{stats.totalEntries}</p>
            <p className="text-white/70">days of your life, tracked</p>
          </div>
          <p className="text-white/50 text-sm mt-6">Tap to explore your year...</p>
        </div>
      ),
    },
    // Steps slide with fun comparisons
    {
      gradient: 'bg-gradient-to-br from-lime-500 via-green-500 to-emerald-600',
      content: (
        <div className="text-center">
          <Footprints className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          <p className="text-white/80 text-lg mb-2">You took</p>
          <p className="text-5xl font-bold text-white mb-1">
            <AnimatedNumber value={stats.totalSteps} />
          </p>
          <p className="text-xl text-white/90 mb-2">steps</p>
          <p className="text-3xl font-bold text-white/80 mb-2">
            ({stats.totalMiles.toLocaleString()} miles)
          </p>
          {yoy?.steps && (
            <p className={cn('text-sm mb-4', yoy.stepsRaw && yoy.stepsRaw > 0 ? 'text-green-200' : 'text-red-200')}>
              {yoy.steps}
            </p>
          )}
          <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur mb-4 max-w-sm mx-auto">
            <p className="text-white/90 text-lg">{getStepsComparison(stats.totalSteps)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs mx-auto">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur">
              <p className="text-2xl font-bold text-white">{stats.avgSteps.toLocaleString()}</p>
              <p className="text-white/70 text-xs">daily average</p>
            </div>
            {stats.bestStepsEntry && stats.bestStepsEntry.steps && (
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur">
                <p className="text-2xl font-bold text-white">{stats.bestStepsEntry.steps.toLocaleString()}</p>
                <p className="text-white/70 text-xs">best day</p>
              </div>
            )}
          </div>
          {stats.bestStepsEntry && stats.bestStepsEntry.steps && stats.bestStepsEntry.steps > 20000 && (() => {
            const sleepCity = stats.bestStepsEntry.city_sleep?.split(',')[0].trim() || ''
            const sleepCityLower = sleepCity.toLowerCase()
            const wasAway = sleepCityLower && sleepCityLower !== 'home' && sleepCityLower !== 'unknown'
            return (
              <p className="text-white/50 text-xs mt-3 italic">
                {format(parseISO(stats.bestStepsEntry.entry_date), 'MMMM d')}{wasAway ? ` in ${sleepCity}` : ''} - what were you training for?! 🏃
              </p>
            )
          })()}
        </div>
      ),
    },
    // Habits slide
    {
      gradient: 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600',
      content: (
        <div className="text-center">
          <Target className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          <p className="text-white/80 text-lg mb-2">You crushed</p>
          <p className="text-7xl font-bold text-white mb-2">
            <AnimatedNumber value={stats.totalHabitsCompleted} />
          </p>
          <p className="text-2xl text-white/90 mb-2">healthy habits</p>
          {yoy?.habits && (
            <p className={cn('text-sm mb-4', yoy.habitsRaw && yoy.habitsRaw > 0 ? 'text-green-200' : 'text-red-200')}>
              {yoy.habits}
            </p>
          )}
          <p className="text-white/60 mb-4">
            That's {stats.habitConsistency} habits per day on average
          </p>
          {stats.topHabits.length > 0 && (
            <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur w-full max-w-xs mx-auto mb-4">
              <p className="text-white/70 text-sm mb-2">Your go-to habits</p>
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
          {stats.bestHabitMonth && (
            <p className="text-white/70 text-sm">
              <span className="text-white font-medium">{stats.bestHabitMonth[0]}</span> was your most disciplined month 💪
            </p>
          )}
        </div>
      ),
    },
    // Alcohol slide with fun comparisons
    {
      gradient: 'bg-gradient-to-br from-purple-700 via-violet-600 to-indigo-700',
      content: (
        <div className="text-center">
          <Wine className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          <p className="text-white/80 text-lg mb-2">You enjoyed</p>
          <p className="text-7xl font-bold text-white mb-2">
            <AnimatedNumber value={stats.totalDrinks} />
          </p>
          <p className="text-2xl text-white/90 mb-2">drinks</p>
          {yoy?.drinks && (
            <p className={cn('text-sm mb-2', yoy.drinksRaw && yoy.drinksRaw < 0 ? 'text-green-200' : 'text-yellow-200')}>
              {yoy.drinks}
            </p>
          )}
          <p className="text-white/60 text-lg mb-4">{getDrinkComparison(stats.totalDrinks)}</p>
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm mx-auto mb-4">
            <div className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur">
              <p className="text-xl font-bold text-white">{stats.percentSober}%</p>
              <p className="text-white/70 text-[10px]">sober days</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur">
              <p className="text-xl font-bold text-white">{stats.daysWithDrinks}</p>
              <p className="text-white/70 text-[10px]">drinking days</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur">
              <p className="text-xl font-bold text-white">{stats.avgDrinksPerDrinkingDay}</p>
              <p className="text-white/70 text-[10px]">per session</p>
            </div>
          </div>
          {stats.favoriteDrink && stats.favoriteDrink[1] > 0 && (
            <p className="text-white/70 text-sm">
              Drink of choice: <span className="text-white font-medium capitalize">{stats.favoriteDrink[0]}</span>
              {stats.favoriteDrink[0] === 'wine' ? ' 🍷' : stats.favoriteDrink[0] === 'beers' ? ' 🍺' : ' 🥃'}
            </p>
          )}
          {stats.biggestDrinkingDay.drinks >= 6 && (
            <p className="text-white/50 text-xs mt-2 italic">
              {format(parseISO(stats.biggestDrinkingDay.date), 'MMMM d')}{stats.biggestDrinkingDay.city ? ` in ${stats.biggestDrinkingDay.city}` : ''}: {stats.biggestDrinkingDay.drinks} drinks. What happened? 🎉
            </p>
          )}
        </div>
      ),
    },
    // Detailed drink breakdown slide
    {
      gradient: 'bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-700',
      content: (
        <div className="text-center">
          <Wine className="h-10 w-10 text-white/80 mb-3 mx-auto" />
          <p className="text-white/80 text-lg mb-4">The breakdown</p>

          {/* Drink type breakdown */}
          <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur w-full max-w-sm mx-auto mb-4">
            <div className="grid grid-cols-5 gap-1 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{stats.drinkTypes.beers}</p>
                <p className="text-white/60 text-[9px]">beers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.drinkTypes.wine}</p>
                <p className="text-white/60 text-[9px]">wine</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.drinkTypes.liquor}</p>
                <p className="text-white/60 text-[9px]">cocktails</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.drinkTypes.seltzers}</p>
                <p className="text-white/60 text-[9px]">seltzers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.drinkTypes.shots}</p>
                <p className="text-white/60 text-[9px]">shots</p>
              </div>
            </div>
          </div>

          {/* Binge and heavy drinking stats */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto mb-4">
            <div className="bg-white/20 rounded-xl px-3 py-3 backdrop-blur">
              <p className="text-3xl font-bold text-white">{stats.bingeDrinkingDays}</p>
              <p className="text-white/70 text-xs">binge days (5+)</p>
              <p className="text-white/50 text-[10px]">
                {stats.totalEntries > 0 ? Math.round((stats.bingeDrinkingDays / stats.totalEntries) * 100) : 0}% of days
              </p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-3 backdrop-blur">
              <p className="text-3xl font-bold text-white">{stats.heavyDrinkingWeeks}</p>
              <p className="text-white/70 text-xs">heavy weeks (14+)</p>
              <p className="text-white/50 text-[10px]">
                {stats.totalWeeks > 0 ? Math.round((stats.heavyDrinkingWeeks / stats.totalWeeks) * 100) : 0}% of weeks
              </p>
            </div>
          </div>

          {/* Peak consumption */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto mb-3">
            <div className="bg-white/15 rounded-xl px-3 py-2 backdrop-blur">
              <p className="text-white/60 text-[10px] mb-1">Most in a day</p>
              <p className="text-2xl font-bold text-white">{stats.biggestDrinkingDay.drinks}</p>
              {stats.biggestDrinkingDay.date && (
                <p className="text-white/50 text-[9px]">
                  {format(parseISO(stats.biggestDrinkingDay.date), 'MMM d')}
                  {stats.biggestDrinkingDay.city && ` · ${stats.biggestDrinkingDay.city}`}
                </p>
              )}
            </div>
            <div className="bg-white/15 rounded-xl px-3 py-2 backdrop-blur">
              <p className="text-white/60 text-[10px] mb-1">Most in a week</p>
              <p className="text-2xl font-bold text-white">{stats.biggestDrinkingWeek.drinks}</p>
              {stats.biggestDrinkingWeek.startDate && (
                <p className="text-white/50 text-[9px]">
                  {format(parseISO(stats.biggestDrinkingWeek.startDate), 'MMM d')} - {format(parseISO(stats.biggestDrinkingWeek.endDate), 'MMM d')}
                </p>
              )}
            </div>
          </div>

          {/* Weekly average with threshold indicator */}
          <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur w-full max-w-sm mx-auto">
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-xs">Avg drinks/week</span>
              <span className={`font-bold ${stats.avgDrinksPerWeek >= 14 ? 'text-red-300' : stats.avgDrinksPerWeek >= 7 ? 'text-yellow-300' : 'text-green-300'}`}>
                {stats.avgDrinksPerWeek}
              </span>
            </div>
            {stats.avgDrinksPerWeek >= 14 && (
              <p className="text-red-300/70 text-[10px] mt-1">Above "heavy drinking" threshold (14/wk)</p>
            )}
          </div>

          {stats.bingeDrinkingDays > 10 && (
            <p className="text-white/50 text-xs mt-3 italic">
              {stats.bingeDrinkingDays > 30 ? "That's a lot of big nights! 🥳" : "Some memorable nights in there! 🌙"}
            </p>
          )}
        </div>
      ),
    },
    // Drinking patterns slide
    {
      gradient: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600',
      content: (
        <div className="text-center">
          <Calendar className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          <p className="text-white/80 text-lg mb-6">Your drinking rhythm</p>
          <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur w-full max-w-sm mx-auto mb-4">
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
            <span className="font-bold">{DAY_NAMES[stats.booziesDay]}</span> was your party day 🎉
          </p>
          <p className="text-white/70 text-sm mb-2">
            {DAY_NAMES[stats.soberestDay]}? That's when you behaved.
          </p>
          {stats.isSocialDrinker && (
            <p className="text-white/50 text-xs mt-2 italic">Classic weekend warrior vibes 🥂</p>
          )}
        </div>
      ),
    },
    // Streaks slide
    {
      gradient: 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-500',
      content: (
        <div className="text-center">
          <Zap className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          <p className="text-white/80 text-lg mb-6">Your longest streaks</p>
          <div className="space-y-4 w-full max-w-xs mx-auto">
            <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur">
              <p className="text-white/70 text-sm">Longest sober streak</p>
              <p className="text-4xl font-bold text-white">{stats.longestSoberStreak} days</p>
              {stats.soberStreakStart && (
                <p className="text-white/60 text-xs mt-1">
                  {format(parseISO(stats.soberStreakStart), 'MMM d')} - {format(parseISO(stats.soberStreakEnd), 'MMM d')}
                </p>
              )}
              {stats.longestSoberStreak >= 30 && (
                <p className="text-white/50 text-xs mt-1 italic">A whole month clean! 🌟</p>
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
                {stats.longestDrinkStreak >= 7 && (
                  <p className="text-white/50 text-xs mt-1 italic">Vacation vibes? 🏖️</p>
                )}
              </div>
            )}
          </div>
        </div>
      ),
    },
    // Travel slide with comparisons
    {
      gradient: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600',
      content: (
        <div className="text-center">
          <Plane className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          <p className="text-white/80 text-lg mb-2">You spent</p>
          <p className="text-7xl font-bold text-white mb-2">
            <AnimatedNumber value={stats.nightsAway} />
          </p>
          <p className="text-2xl text-white/90 mb-2">nights away from home</p>
          {yoy?.nightsAway && (
            <p className={cn('text-sm mb-2', yoy.nightsAwayRaw && yoy.nightsAwayRaw > 0 ? 'text-cyan-200' : 'text-white/60')}>
              {yoy.nightsAway}
            </p>
          )}
          <p className="text-white/60 text-lg mb-4">{getNightsAwayComparison(stats.nightsAway, stats.totalEntries)}</p>
          <div className="grid grid-cols-3 gap-2 w-full max-w-sm mx-auto mb-4">
            <div className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur">
              <p className="text-xl font-bold text-white">{stats.flights}</p>
              <p className="text-white/70 text-[10px]">flights</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur">
              <p className="text-xl font-bold text-white">{stats.trains}</p>
              <p className="text-white/70 text-[10px]">trains</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-2 backdrop-blur">
              <p className="text-xl font-bold text-white">{stats.citiesVisited}</p>
              <p className="text-white/70 text-[10px]">cities</p>
            </div>
          </div>
          {stats.longestTrip > 0 && (
            <p className="text-white/70 text-sm">
              Longest adventure: <span className="text-white font-medium">{stats.longestTrip} nights</span>
              <span className="text-white/50"> across {stats.longestTripItinerary.length} cities →</span>
            </p>
          )}
        </div>
      ),
    },
    // Longest Trip Journey slide
    ...(stats.longestTrip > 3 && stats.longestTripItinerary.length > 1 ? [{
      gradient: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600',
      content: (
        <div className="text-center">
          <MapPin className="h-10 w-10 text-white/80 mb-3 mx-auto" />
          <p className="text-white/80 text-lg mb-1">Your epic {stats.longestTrip}-night journey</p>
          <p className="text-white/50 text-sm mb-4">
            {format(parseISO(stats.longestTripStart), 'MMM d')} - {format(parseISO(stats.longestTripEnd), 'MMM d')}
          </p>
          <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur w-full max-w-sm mx-auto max-h-[50vh] overflow-y-auto">
            <div className="relative">
              {stats.longestTripItinerary.map((stop, i) => (
                <div key={i} className="flex items-start gap-3 relative">
                  {/* Connecting line */}
                  {i < stats.longestTripItinerary.length - 1 && (
                    <div className="absolute left-[11px] top-6 w-0.5 h-[calc(100%-8px)] bg-white/30" />
                  )}
                  {/* Dot */}
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    i === 0 ? 'bg-green-400' : i === stats.longestTripItinerary.length - 1 ? 'bg-red-400' : 'bg-white/40'
                  )}>
                    {i === 0 ? (
                      <span className="text-[10px]">🛫</span>
                    ) : i === stats.longestTripItinerary.length - 1 ? (
                      <span className="text-[10px]">🛬</span>
                    ) : (
                      <span className="text-[8px] text-white font-bold">{i + 1}</span>
                    )}
                  </div>
                  {/* City info */}
                  <div className="flex-1 pb-4">
                    <p className="text-white font-medium text-sm">{stop.city}</p>
                    <p className="text-white/50 text-xs">
                      {stop.nights} night{stop.nights > 1 ? 's' : ''} · {format(parseISO(stop.date), 'MMM d')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/50 text-xs mt-3 italic">
            {stats.longestTripItinerary.length} cities in {stats.longestTrip} nights - what an adventure! ✨
          </p>
        </div>
      ),
    }] : []),
    // Furthest from home slide
    {
      gradient: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700',
      content: (
        <div className="text-center">
          <MapPin className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          {stats.furthestCity.distance > 0 ? (
            <>
              <p className="text-white/80 text-lg mb-2">Your furthest adventure</p>
              <p className="text-5xl font-bold text-white mb-2">{stats.furthestCity.name}</p>
              <p className="text-3xl text-white/80 mb-4">
                {stats.furthestCity.distance.toLocaleString()} miles from home
              </p>
              <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur max-w-sm mx-auto">
                {stats.furthestCity.distance >= 5000 && (
                  <p className="text-white/90">That's like flying coast to coast... twice! ✈️</p>
                )}
                {stats.furthestCity.distance >= 3000 && stats.furthestCity.distance < 5000 && (
                  <p className="text-white/90">You crossed some serious time zones! 🌍</p>
                )}
                {stats.furthestCity.distance >= 1000 && stats.furthestCity.distance < 3000 && (
                  <p className="text-white/90">A proper road trip distance! 🚗</p>
                )}
                {stats.furthestCity.distance < 1000 && (
                  <p className="text-white/90">Adventures don't have to be far to be great! 🗺️</p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-white/80 text-lg mb-6">Where you slept</p>
              {stats.topCities.length > 0 ? (
                <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur w-full max-w-xs mx-auto mb-4">
                  <p className="text-white/70 text-sm mb-2">Your favorite cities</p>
                  {stats.topCities.map(([city, count]) => (
                    <div key={city} className="flex justify-between items-center py-1">
                      <span className="text-white">{city}</span>
                      <span className="text-white/70 text-sm">{count} nights</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/70">No travel data this year</p>
              )}
            </>
          )}
        </div>
      ),
    },
    // Cities & home streak slide
    {
      gradient: 'bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600',
      content: (
        <div className="text-center">
          <Moon className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          <p className="text-white/80 text-lg mb-6">Home vs Away</p>
          <div className="space-y-4 w-full max-w-xs mx-auto">
            {stats.longestHomeStreak > 0 && (
              <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur">
                <p className="text-white/70 text-sm">Longest homebody streak</p>
                <p className="text-4xl font-bold text-white">{stats.longestHomeStreak} days</p>
                {stats.homeStreakStart && (
                  <p className="text-white/60 text-xs mt-1">
                    {format(parseISO(stats.homeStreakStart), 'MMM d')} - {format(parseISO(stats.homeStreakEnd), 'MMM d')}
                  </p>
                )}
                {stats.longestHomeStreak >= 60 && (
                  <p className="text-white/50 text-xs mt-1 italic">Cozy hibernation mode! 🏠</p>
                )}
              </div>
            )}
            {stats.topCities.length > 0 && (
              <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur">
                <p className="text-white/70 text-sm mb-2">Top destinations</p>
                {stats.topCities.slice(0, 3).map(([city, count], i) => (
                  <div key={city} className="flex justify-between items-center py-0.5">
                    <span className="text-white text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {city}</span>
                    <span className="text-white/70 text-xs">{count} nights</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {stats.isHomebody && (
            <p className="text-white/50 text-xs mt-4 italic">Home is where your wifi connects automatically 📶</p>
          )}
          {stats.isExplorer && (
            <p className="text-white/50 text-xs mt-4 italic">You've got wanderlust in your DNA 🧬</p>
          )}
        </div>
      ),
    },
    // Mood slide
    {
      gradient: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500',
      content: (
        <div className="text-center">
          <Heart className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          <p className="text-white/80 text-lg mb-2">Your average mood</p>
          <p className="text-7xl font-bold text-white mb-2">{stats.avgMood}</p>
          <p className="text-xl text-white/90 mb-2">out of 10</p>
          {yoy?.avgMood && (
            <p className={cn('text-sm mb-4', yoy.avgMood.includes('↑') ? 'text-green-200' : 'text-red-200')}>
              {yoy.avgMood}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs mx-auto mb-4">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur">
              <p className="text-2xl font-bold text-white">{stats.happyDays}</p>
              <p className="text-white/70 text-xs">great days (8+)</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur">
              <p className="text-2xl font-bold text-white">{stats.sadDays}</p>
              <p className="text-white/70 text-xs">tough days (3-)</p>
            </div>
          </div>
          {stats.perfectDays.length > 0 && (
            <p className="text-white/70 text-sm">
              You had <span className="text-white font-bold">{stats.perfectDays.length}</span> perfect 10/10 days →
            </p>
          )}
          {parseFloat(stats.avgMood) >= 7 && (
            <p className="text-white/50 text-xs mt-2 italic">Living your best life! ✨</p>
          )}
        </div>
      ),
    },
    // Perfect 10/10 days slide
    ...(stats.perfectDays.length > 0 ? [{
      gradient: 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500',
      content: (
        <div className="text-center">
          <Sparkles className="h-10 w-10 text-white/80 mb-3 mx-auto" />
          <p className="text-white/80 text-lg mb-1">Your perfect 10/10 days</p>
          <p className="text-5xl font-bold text-white mb-4">{stats.perfectDays.length}</p>
          <div className="bg-white/10 rounded-2xl px-4 py-3 backdrop-blur w-full max-w-sm mx-auto max-h-[45vh] overflow-y-auto">
            <div className="space-y-3">
              {stats.perfectDays.map((day, i) => (
                <div key={i} className="bg-white/10 rounded-xl px-4 py-3 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-medium">{format(parseISO(day.date), 'MMMM d')}</p>
                    {day.city && (
                      <span className="text-white/60 text-xs flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {day.city}
                      </span>
                    )}
                  </div>
                  {day.notes && (
                    <p className="text-white/70 text-xs italic">"{day.notes}{day.notes.length >= 100 ? '...' : ''}"</p>
                  )}
                  {!day.notes && day.events.length > 0 && (
                    <p className="text-white/60 text-xs">{day.events.slice(0, 3).join(' · ')}</p>
                  )}
                  {!day.notes && day.events.length === 0 && !day.city && (
                    <p className="text-white/50 text-xs">A mysteriously perfect day ✨</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/50 text-xs mt-3 italic">
            {stats.perfectDays.length >= 10 ? "You really know how to live! 🌟" : "Cherish these memories! 💫"}
          </p>
        </div>
      ),
    }] : []),
    // Mood correlations slide
    {
      gradient: 'bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600',
      content: (
        <div className="text-center">
          <Heart className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          <p className="text-white/80 text-lg mb-6">What made you happiest?</p>
          <div className="space-y-3 w-full max-w-xs mx-auto">
            {stats.avgMoodExercise && (
              <div className="bg-white/20 rounded-xl px-5 py-3 backdrop-blur flex justify-between items-center">
                <span className="text-white">When you exercised</span>
                <span className="text-white font-bold">{stats.avgMoodExercise}</span>
              </div>
            )}
            {stats.avgMoodSober && (
              <div className="bg-white/20 rounded-xl px-5 py-3 backdrop-blur flex justify-between items-center">
                <span className="text-white">On sober days</span>
                <span className="text-white font-bold">{stats.avgMoodSober}</span>
              </div>
            )}
            {stats.avgMoodDrinking && (
              <div className="bg-white/20 rounded-xl px-5 py-3 backdrop-blur flex justify-between items-center">
                <span className="text-white">On drinking days</span>
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
          {stats.avgMoodExercise && parseFloat(stats.avgMoodExercise) > parseFloat(stats.avgMood) && (
            <p className="text-white/50 text-xs mt-4 italic">The data doesn't lie - exercise = happiness! 🏃</p>
          )}
          {stats.avgMoodTravel && parseFloat(stats.avgMoodTravel) > parseFloat(stats.avgMood) && (
            <p className="text-white/50 text-xs mt-4 italic">Travel is your happy place! ✈️</p>
          )}
        </div>
      ),
    },
    // Events slide
    {
      gradient: 'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600',
      content: (
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-white/80 mb-4 mx-auto" />
          <p className="text-white/80 text-lg mb-2">You logged</p>
          <p className="text-7xl font-bold text-white mb-2">
            <AnimatedNumber value={stats.totalEvents} />
          </p>
          <p className="text-2xl text-white/90 mb-6">life events</p>
          {stats.topEvents.length > 0 && (
            <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur w-full max-w-xs mx-auto">
              <p className="text-white/70 text-sm mb-2">What kept you busy</p>
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
          {stats.totalEvents > 100 && (
            <p className="text-white/50 text-xs mt-4 italic">You were one busy bee! 🐝</p>
          )}
        </div>
      ),
    },
    // Outro slide
    {
      gradient: 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500',
      content: (
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-6">That's a wrap on {targetYear}!</h1>
          <div className="grid grid-cols-2 gap-3 w-full max-w-xs mx-auto mb-6">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur">
              <p className="text-2xl font-bold text-white">{stats.totalEntries}</p>
              <p className="text-white/70 text-xs">days tracked</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur">
              <p className="text-2xl font-bold text-white">{stats.totalMiles.toLocaleString()}</p>
              <p className="text-white/70 text-xs">miles walked</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur">
              <p className="text-2xl font-bold text-white">{stats.nightsAway}</p>
              <p className="text-white/70 text-xs">nights away</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur">
              <p className="text-2xl font-bold text-white">{stats.totalHabitsCompleted}</p>
              <p className="text-white/70 text-xs">habits done</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-2xl px-6 py-4 backdrop-blur mb-4 max-w-sm mx-auto">
            <p className="text-white/90">
              {stats.isHealthNut && stats.isExplorer && "You balanced wellness and wanderlust perfectly! 🌟"}
              {stats.isHealthNut && !stats.isExplorer && "Your dedication to health was inspiring! 💪"}
              {!stats.isHealthNut && stats.isExplorer && "What an adventurous year you had! 🗺️"}
              {!stats.isHealthNut && !stats.isExplorer && "Here's to an even better " + (targetYear + 1) + "! 🚀"}
            </p>
          </div>
          <p className="text-white/80 text-lg">See you in {targetYear + 1}! 🎉</p>
        </div>
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
