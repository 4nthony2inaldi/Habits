'use client'

import { useEffect, useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { CityAutocomplete } from '@/components/ui/city-autocomplete'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormSection } from './FormSection'
import { useCreateEntry, useEntryByDate } from '@/lib/hooks/useEntries'
import { type DailyEntryFormData, workLocationLabels, mealLocationLabels, habitLabels, eventLabels } from '@/types/forms'
import type { MealLocation } from '@/types/database'
import { getYesterdayString, formatDateForInput, isBeforeToday } from '@/lib/utils/dates'
import { calculateDistanceMiles } from '@/lib/utils/calculations'
import { fetchWeather, formatTemperature, type WeatherData } from '@/lib/utils/weather'
import type { Profile, HabitType, EventType } from '@/types/database'
import { cn } from '@/lib/utils/cn'
import {
  Smile,
  Sun,
  Utensils,
  Briefcase,
  Wine,
  Footprints,
  Sparkles,
  Theater,
  Plane,
  FileText,
  Users,
  Heart,
  Cloud,
  Loader2,
} from 'lucide-react'

interface DailyEntryFormProps {
  profile: Profile
}

// Pill button component for habits and events
function PillButton({
  label,
  checked,
  onChange,
  color = 'green',
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  color?: 'green' | 'purple'
}) {
  const colorClasses = color === 'green'
    ? checked
      ? 'bg-green-100 text-green-700 border-green-300'
      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
    : checked
      ? 'bg-purple-100 text-purple-700 border-purple-300'
      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm border transition-colors text-center',
        colorClasses
      )}
    >
      {label}
    </button>
  )
}

export function DailyEntryForm({ profile }: DailyEntryFormProps) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(getYesterdayString())
  const [openSection, setOpenSection] = useState<string | null>('mood')
  const [saveError, setSaveError] = useState<string | null>(null)

  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherLocation, setWeatherLocation] = useState<string | null>(null)

  // City coordinates state (for tracking lat/lng when cities are selected)
  const [cityWakeCoords, setCityWakeCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [cityNoonCoords, setCityNoonCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [citySleepCoords, setCitySleepCoords] = useState<{ lat: number; lng: number } | null>(null)

  const { data: existingEntry, isLoading: loadingEntry } = useEntryByDate(
    profile.id,
    selectedDate
  )
  const createEntry = useCreateEntry()

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DailyEntryFormData>({
    defaultValues: {
      entry_date: selectedDate,
      mood_score: 5,
      work_location: null,
      beers: 0,
      seltzers: 0,
      wine: 0,
      liquor: 0,
      shots: 0,
      // Detailed wine breakdown
      wine_red: 0,
      wine_white: 0,
      wine_sparkling: 0,
      // Detailed liquor breakdown
      liquor_vodka: 0,
      liquor_gin: 0,
      liquor_tequila: 0,
      liquor_whiskey: 0,
      liquor_rum: 0,
      liquor_other: 0,
      // Other metrics
      coffee: 0,
      steps: null,
      screen_time: null,
      sex: 0,
      // Meal tracking
      breakfast_location: null,
      lunch_location: null,
      dinner_location: null,
      city_wake: null,
      miles_wake: null,
      city_noon: null,
      miles_noon: null,
      city_sleep: null,
      miles_sleep: null,
      best_part: null,
      notes: null,
      healthy_habits: [],
      life_events: [],
    },
  })

  // Watch values for summaries
  const watchedValues = watch()

  // Load existing entry data when date changes
  useEffect(() => {
    if (existingEntry) {
      reset({
        entry_date: existingEntry.entry_date,
        mood_score: existingEntry.mood_score,
        work_location: existingEntry.work_location,
        beers: existingEntry.beers,
        seltzers: existingEntry.seltzers,
        wine: existingEntry.wine,
        liquor: existingEntry.liquor,
        shots: existingEntry.shots,
        // Detailed wine breakdown
        wine_red: existingEntry.wine_red || 0,
        wine_white: existingEntry.wine_white || 0,
        wine_sparkling: existingEntry.wine_sparkling || 0,
        // Detailed liquor breakdown
        liquor_vodka: existingEntry.liquor_vodka || 0,
        liquor_gin: existingEntry.liquor_gin || 0,
        liquor_tequila: existingEntry.liquor_tequila || 0,
        liquor_whiskey: existingEntry.liquor_whiskey || 0,
        liquor_rum: existingEntry.liquor_rum || 0,
        liquor_other: existingEntry.liquor_other || 0,
        // Other metrics
        coffee: existingEntry.coffee,
        steps: existingEntry.steps,
        screen_time: existingEntry.screen_time,
        sex: existingEntry.sex,
        // Meal tracking
        breakfast_location: existingEntry.breakfast_location,
        lunch_location: existingEntry.lunch_location,
        dinner_location: existingEntry.dinner_location,
        city_wake: existingEntry.city_wake,
        miles_wake: existingEntry.miles_wake,
        city_noon: existingEntry.city_noon,
        miles_noon: existingEntry.miles_noon,
        city_sleep: existingEntry.city_sleep,
        miles_sleep: existingEntry.miles_sleep,
        best_part: existingEntry.best_part,
        notes: existingEntry.notes,
        healthy_habits: existingEntry.healthy_habits.map((h) => h.habit_type) as HabitType[],
        life_events: existingEntry.life_events.map((e) => e.event_type) as EventType[],
      })
    } else if (!loadingEntry) {
      reset({
        entry_date: selectedDate,
        mood_score: 5,
        work_location: null,
        beers: 0,
        seltzers: 0,
        wine: 0,
        liquor: 0,
        shots: 0,
        // Detailed wine breakdown
        wine_red: 0,
        wine_white: 0,
        wine_sparkling: 0,
        // Detailed liquor breakdown
        liquor_vodka: 0,
        liquor_gin: 0,
        liquor_tequila: 0,
        liquor_whiskey: 0,
        liquor_rum: 0,
        liquor_other: 0,
        // Other metrics
        coffee: 0,
        steps: null,
        screen_time: null,
        sex: 0,
        // Meal tracking
        breakfast_location: null,
        lunch_location: null,
        dinner_location: null,
        city_wake: null,
        miles_wake: null,
        city_noon: null,
        miles_noon: null,
        city_sleep: null,
        miles_sleep: null,
        best_part: null,
        notes: null,
        healthy_habits: [],
        life_events: [],
      })
    }
  }, [existingEntry, loadingEntry, selectedDate, reset])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    if (isBeforeToday(newDate)) {
      setSelectedDate(newDate)
      setValue('entry_date', newDate)
    }
  }

  // Fetch weather when date changes or coordinates are available
  // Uses city_noon coordinates, or home city if city_noon is blank
  useEffect(() => {
    const fetchWeatherData = async () => {
      // Determine which location to use for weather
      let lat: number | null = null
      let lng: number | null = null
      let locationName: string | null = null

      // Priority: city_noon coordinates > home city coordinates
      if (cityNoonCoords) {
        lat = cityNoonCoords.lat
        lng = cityNoonCoords.lng
        locationName = watchedValues.city_noon || 'Noon location'
      } else if (profile.home_lat && profile.home_lng) {
        // No city_noon means user was home - use home city for weather
        lat = profile.home_lat
        lng = profile.home_lng
        locationName = profile.home_city || 'Home'
      }

      if (!lat || !lng || !selectedDate) {
        setWeather(null)
        setWeatherLocation(null)
        return
      }

      setWeatherLoading(true)
      try {
        const weatherData = await fetchWeather(lat, lng, selectedDate)
        setWeather(weatherData)
        setWeatherLocation(locationName)
      } catch (error) {
        console.error('Failed to fetch weather:', error)
        setWeather(null)
      } finally {
        setWeatherLoading(false)
      }
    }

    fetchWeatherData()
  }, [selectedDate, cityNoonCoords, profile.home_lat, profile.home_lng, profile.home_city, watchedValues.city_noon])

  const onSubmit = async (data: DailyEntryFormData) => {
    setSaveError(null)
    try {
      // Add coordinates to data
      const enrichedData: DailyEntryFormData = {
        ...data,
        // City coordinates
        city_wake_lat: cityWakeCoords?.lat ?? null,
        city_wake_lng: cityWakeCoords?.lng ?? null,
        city_noon_lat: cityNoonCoords?.lat ?? null,
        city_noon_lng: cityNoonCoords?.lng ?? null,
        city_sleep_lat: citySleepCoords?.lat ?? null,
        city_sleep_lng: citySleepCoords?.lng ?? null,
        // Weather data
        weather_temperature_high: weather?.temperatureHigh ?? null,
        weather_temperature_low: weather?.temperatureLow ?? null,
        weather_conditions: weather?.conditions ?? null,
        weather_humidity: weather?.humidity ?? null,
        weather_precipitation: weather?.precipitation ?? null,
        weather_location: weatherLocation,
      }
      await createEntry.mutateAsync({
        userId: profile.id,
        data: enrichedData,
      })
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to save entry:', error)
      const message = error instanceof Error ? error.message : 'Failed to save entry. Please try again.'
      setSaveError(message)
    }
  }

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  const hiddenFields = profile.hidden_fields || []
  const showLocationTracking = !hiddenFields.includes('location_tracking')

  // Calculate max date (yesterday)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const maxDate = formatDateForInput(yesterday)

  // Generate section summaries
  const summaries = useMemo(() => {
    const habits = watchedValues.healthy_habits || []
    const events = watchedValues.life_events || []

    // Calculate total drinks including detailed breakdowns
    const wineTotal = (watchedValues.wine_red || 0) + (watchedValues.wine_white || 0) + (watchedValues.wine_sparkling || 0)
    const liquorTotal = (watchedValues.liquor_vodka || 0) + (watchedValues.liquor_gin || 0) +
      (watchedValues.liquor_tequila || 0) + (watchedValues.liquor_whiskey || 0) +
      (watchedValues.liquor_rum || 0) + (watchedValues.liquor_other || 0)
    const totalDrinks = (watchedValues.beers || 0) + (watchedValues.seltzers || 0) +
      (wineTotal > 0 ? wineTotal : (watchedValues.wine || 0)) +
      (liquorTotal > 0 ? liquorTotal : (watchedValues.liquor || 0)) +
      (watchedValues.shots || 0)

    // Morning habits
    const morningHabits = ['sleep_8hrs', 'vitamin'].filter(h => habits.includes(h as HabitType))
    const morningCoffee = watchedValues.coffee || 0

    // Meals - include meal locations and healthy eating
    const mealParts: string[] = []
    if (watchedValues.breakfast_location) mealParts.push(`Breakfast ${watchedValues.breakfast_location === 'home' ? 'home' : 'out'}`)
    if (watchedValues.lunch_location) mealParts.push(`Lunch ${watchedValues.lunch_location === 'home' ? 'home' : 'out'}`)
    if (watchedValues.dinner_location) mealParts.push(`Dinner ${watchedValues.dinner_location === 'home' ? 'home' : 'out'}`)
    if (habits.includes('ate_fruit')) mealParts.push('Fruit')
    if (habits.includes('ate_vegetables')) mealParts.push('Veggies')

    // Movement
    const steps = watchedValues.steps
    const hasExercise = habits.includes('exercise')
    const playedSport = events.includes('played_sport')

    // Self care events
    const selfCareEvents = ['haircut', 'massage', 'facial', 'pedicure', 'manicure', 'other_selfcare', 'doctor', 'dentist']
      .filter(e => events.includes(e as EventType))

    // Entertainment events
    const entertainmentEvents = ['concert', 'stage_production', 'movies', 'museum', 'attended_sport', 'diner', 'ice_cream', 'park', 'guys_night']
      .filter(e => events.includes(e as EventType))

    // Travel
    const hasFlight = events.includes('flight')
    const hasTrain = events.includes('train')
    const hasTravel = hasFlight || hasTrain || watchedValues.city_wake || watchedValues.city_noon || watchedValues.city_sleep

    return {
      mood: watchedValues.mood_score !== null && watchedValues.mood_score !== undefined
        ? `Mood: ${watchedValues.mood_score}/10`
        : undefined,
      morning: morningHabits.length > 0 || morningCoffee > 0
        ? `${morningHabits.length} habits${morningCoffee > 0 ? `, ${morningCoffee} coffee` : ''}`
        : undefined,
      meals: mealParts.length > 0 ? mealParts.join(', ') : undefined,
      work: watchedValues.work_location
        ? workLocationLabels[watchedValues.work_location]
        : undefined,
      drinks: totalDrinks > 0 ? `${totalDrinks} drinks` : undefined,
      movement: steps || hasExercise || playedSport
        ? [steps && `${steps.toLocaleString()} steps`, hasExercise && 'Exercise', playedSport && 'Sport'].filter(Boolean).join(', ')
        : undefined,
      selfCare: selfCareEvents.length > 0 ? `${selfCareEvents.length} activities` : undefined,
      events: entertainmentEvents.length > 0 ? `${entertainmentEvents.length} events` : undefined,
      travel: hasTravel ? (hasFlight ? 'Flight' : hasTrain ? 'Train' : 'Away') : undefined,
      notes: watchedValues.notes ? 'Has notes' : undefined,
    }
  }, [watchedValues])

  // Helper to toggle habit
  const toggleHabit = (habit: HabitType, currentHabits: HabitType[]) => {
    if (currentHabits.includes(habit)) {
      return currentHabits.filter(h => h !== habit)
    }
    return [...currentHabits, habit]
  }

  // Helper to toggle event
  const toggleEvent = (event: EventType, currentEvents: EventType[]) => {
    if (currentEvents.includes(event)) {
      return currentEvents.filter(e => e !== event)
    }
    return [...currentEvents, event]
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 max-w-2xl mx-auto">
      {/* Date Selection - always visible */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="py-3">
          <div className="flex items-center gap-4">
            <Label htmlFor="entry_date" className="whitespace-nowrap font-medium">
              Entry for:
            </Label>
            <Input
              id="entry_date"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              max={maxDate}
              className="max-w-[180px] bg-white"
            />
            {existingEntry && (
              <span className="text-sm text-amber-600 font-medium">
                Updating existing
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes Section - at top */}
      <FormSection
        title="Notes"
        subtitle="Remember the day"
        icon={<FileText className="h-5 w-5" />}
        isOpen={openSection === 'notes'}
        onToggle={() => toggleSection('notes')}
        summary={summaries.notes}
      >
        <Textarea
          placeholder="Notes to remember the day..."
          {...register('notes')}
          className="min-h-[80px]"
        />
      </FormSection>

      {/* Mood Section */}
      <FormSection
        title="Mood"
        icon={<Smile className="h-5 w-5 text-yellow-500" />}
        isOpen={openSection === 'mood'}
        onToggle={() => toggleSection('mood')}
        summary={summaries.mood}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>How was your day? (0-10)</Label>
            <Controller
              name="mood_score"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-4">
                  <Slider
                    min={0}
                    max={10}
                    value={field.value ?? 5}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-purple-600 w-8 text-center">
                    {field.value ?? 5}
                  </span>
                </div>
              )}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Controller
              name="healthy_habits"
              control={control}
              render={({ field }) => (
                <PillButton
                  label="Family (phone)"
                  checked={field.value.includes('family_phone')}
                  onChange={() => field.onChange(toggleHabit('family_phone', field.value as HabitType[]))}
                />
              )}
            />
            <Controller
              name="healthy_habits"
              control={control}
              render={({ field }) => (
                <PillButton
                  label="Family (in-person)"
                  checked={field.value.includes('family_in_person')}
                  onChange={() => field.onChange(toggleHabit('family_in_person', field.value as HabitType[]))}
                />
              )}
            />
            <Controller
              name="sex"
              control={control}
              render={({ field }) => (
                <PillButton
                  label="Had Sex"
                  checked={(field.value || 0) > 0}
                  onChange={(checked) => field.onChange(checked ? 1 : 0)}
                  color="purple"
                />
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* Morning Section */}
      <FormSection
        title="Morning"
        subtitle="Blank if none"
        icon={<Sun className="h-5 w-5 text-orange-400" />}
        isOpen={openSection === 'morning'}
        onToggle={() => toggleSection('morning')}
        summary={summaries.morning}
      >
        <div className="space-y-4">
          <Controller
            name="healthy_habits"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2 items-center">
                <PillButton
                  label="8+ hrs Sleep"
                  checked={field.value.includes('sleep_8hrs')}
                  onChange={() => field.onChange(toggleHabit('sleep_8hrs', field.value as HabitType[]))}
                />
                <PillButton
                  label="Vitamin"
                  checked={field.value.includes('vitamin')}
                  onChange={() => field.onChange(toggleHabit('vitamin', field.value as HabitType[]))}
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="coffee" className="text-sm whitespace-nowrap">Coffee:</Label>
                  <Input
                    id="coffee"
                    type="number"
                    min={0}
                    max={10}
                    {...register('coffee', { valueAsNumber: true })}
                    className="w-16"
                  />
                </div>
              </div>
            )}
          />
        </div>
      </FormSection>

      {/* Meals Section */}
      <FormSection
        title="Meals"
        subtitle="Blank if none"
        icon={<Utensils className="h-5 w-5 text-green-500" />}
        isOpen={openSection === 'meals'}
        onToggle={() => toggleSection('meals')}
        summary={summaries.meals}
      >
        <div className="space-y-4">
          {/* Meal locations */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Breakfast</Label>
              <Controller
                name="breakfast_location"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  >
                    <option value="">Skip...</option>
                    {Object.entries(mealLocationLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Lunch</Label>
              <Controller
                name="lunch_location"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  >
                    <option value="">Skip...</option>
                    {Object.entries(mealLocationLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Dinner</Label>
              <Controller
                name="dinner_location"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  >
                    <option value="">Skip...</option>
                    {Object.entries(mealLocationLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Healthy eating pills */}
          <Controller
            name="healthy_habits"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <PillButton
                  label="Ate Fruit"
                  checked={field.value.includes('ate_fruit')}
                  onChange={() => field.onChange(toggleHabit('ate_fruit', field.value as HabitType[]))}
                />
                <PillButton
                  label="Ate Vegetables"
                  checked={field.value.includes('ate_vegetables')}
                  onChange={() => field.onChange(toggleHabit('ate_vegetables', field.value as HabitType[]))}
                />
                <PillButton
                  label="8+ Cups Water"
                  checked={field.value.includes('water_8cups')}
                  onChange={() => field.onChange(toggleHabit('water_8cups', field.value as HabitType[]))}
                />
              </div>
            )}
          />
        </div>
      </FormSection>

      {/* Work Section */}
      <FormSection
        title="Work"
        subtitle="Blank if off"
        icon={<Briefcase className="h-5 w-5 text-blue-500" />}
        isOpen={openSection === 'work'}
        onToggle={() => toggleSection('work')}
        summary={summaries.work}
      >
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Worked from?</Label>
            <Controller
              name="work_location"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                >
                  <option value="">Select...</option>
                  {Object.entries(workLocationLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              )}
            />
          </div>
          <Controller
            name="life_events"
            control={control}
            render={({ field }) => (
              <PillButton
                label="Took PTO"
                checked={field.value.includes('pto')}
                onChange={() => field.onChange(toggleEvent('pto', field.value as EventType[]))}
                color="purple"
              />
            )}
          />
        </div>
      </FormSection>

      {/* Drinks Section */}
      <FormSection
        title="Drinks"
        subtitle="Blank if none"
        icon={<Wine className="h-5 w-5 text-red-500" />}
        isOpen={openSection === 'drinks'}
        onToggle={() => toggleSection('drinks')}
        summary={summaries.drinks}
      >
        <div className="space-y-4">
          {/* Simple drink types */}
          <div className="grid grid-cols-3 gap-4">
            {!hiddenFields.includes('beers') && (
              <div className="space-y-2">
                <Label htmlFor="beers">Beer</Label>
                <Input
                  id="beers"
                  type="number"
                  min={0}
                  {...register('beers', { valueAsNumber: true })}
                />
              </div>
            )}
            {!hiddenFields.includes('seltzers') && (
              <div className="space-y-2">
                <Label htmlFor="seltzers">Seltzers</Label>
                <Input
                  id="seltzers"
                  type="number"
                  min={0}
                  {...register('seltzers', { valueAsNumber: true })}
                />
              </div>
            )}
            {!hiddenFields.includes('shots') && (
              <div className="space-y-2">
                <Label htmlFor="shots">Shots</Label>
                <Input
                  id="shots"
                  type="number"
                  min={0}
                  {...register('shots', { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Wine breakdown */}
          {!hiddenFields.includes('wine') && (
            <div className="pt-3 border-t">
              <Label className="text-sm font-medium text-gray-600 mb-2 block">Wine</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="wine_red" className="text-xs text-gray-500">Red</Label>
                  <Input
                    id="wine_red"
                    type="number"
                    min={0}
                    {...register('wine_red', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wine_white" className="text-xs text-gray-500">White</Label>
                  <Input
                    id="wine_white"
                    type="number"
                    min={0}
                    {...register('wine_white', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wine_sparkling" className="text-xs text-gray-500">Sparkling</Label>
                  <Input
                    id="wine_sparkling"
                    type="number"
                    min={0}
                    {...register('wine_sparkling', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cocktail/Liquor breakdown */}
          {!hiddenFields.includes('liquor') && (
            <div className="pt-3 border-t">
              <Label className="text-sm font-medium text-gray-600 mb-2 block">Cocktails (by spirit)</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="liquor_vodka" className="text-xs text-gray-500">Vodka</Label>
                  <Input
                    id="liquor_vodka"
                    type="number"
                    min={0}
                    {...register('liquor_vodka', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="liquor_gin" className="text-xs text-gray-500">Gin</Label>
                  <Input
                    id="liquor_gin"
                    type="number"
                    min={0}
                    {...register('liquor_gin', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="liquor_tequila" className="text-xs text-gray-500">Tequila</Label>
                  <Input
                    id="liquor_tequila"
                    type="number"
                    min={0}
                    {...register('liquor_tequila', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="liquor_whiskey" className="text-xs text-gray-500">Whiskey</Label>
                  <Input
                    id="liquor_whiskey"
                    type="number"
                    min={0}
                    {...register('liquor_whiskey', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="liquor_rum" className="text-xs text-gray-500">Rum</Label>
                  <Input
                    id="liquor_rum"
                    type="number"
                    min={0}
                    {...register('liquor_rum', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="liquor_other" className="text-xs text-gray-500">Other</Label>
                  <Input
                    id="liquor_other"
                    type="number"
                    min={0}
                    {...register('liquor_other', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {/* Movement Section */}
      <FormSection
        title="Movement"
        subtitle="Blank if none"
        icon={<Footprints className="h-5 w-5 text-blue-500" />}
        isOpen={openSection === 'movement'}
        onToggle={() => toggleSection('movement')}
        summary={summaries.movement}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="steps">Steps</Label>
              <Input
                id="steps"
                type="number"
                min={0}
                placeholder="From phone"
                {...register('steps', { valueAsNumber: true })}
                className="w-32"
              />
            </div>
            <Controller
              name="healthy_habits"
              control={control}
              render={({ field }) => (
                <PillButton
                  label="Intentional Exercise"
                  checked={field.value.includes('exercise')}
                  onChange={() => field.onChange(toggleHabit('exercise', field.value as HabitType[]))}
                />
              )}
            />
            <Controller
              name="life_events"
              control={control}
              render={({ field }) => (
                <PillButton
                  label="Played a Sport"
                  checked={field.value.includes('played_sport')}
                  onChange={() => field.onChange(toggleEvent('played_sport', field.value as EventType[]))}
                  color="purple"
                />
              )}
            />
          </div>
        </div>
      </FormSection>

      {/* Self Care Section */}
      <FormSection
        title="Self Care"
        subtitle="Blank if none"
        icon={<Sparkles className="h-5 w-5 text-pink-500" />}
        isOpen={openSection === 'selfcare'}
        onToggle={() => toggleSection('selfcare')}
        summary={summaries.selfCare}
      >
        <Controller
          name="life_events"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              <PillButton
                label="Haircut"
                checked={field.value.includes('haircut')}
                onChange={() => field.onChange(toggleEvent('haircut', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Massage"
                checked={field.value.includes('massage')}
                onChange={() => field.onChange(toggleEvent('massage', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Manicure"
                checked={field.value.includes('manicure')}
                onChange={() => field.onChange(toggleEvent('manicure', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Pedicure"
                checked={field.value.includes('pedicure')}
                onChange={() => field.onChange(toggleEvent('pedicure', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Facial"
                checked={field.value.includes('facial')}
                onChange={() => field.onChange(toggleEvent('facial', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Doctor"
                checked={field.value.includes('doctor')}
                onChange={() => field.onChange(toggleEvent('doctor', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Dentist"
                checked={field.value.includes('dentist')}
                onChange={() => field.onChange(toggleEvent('dentist', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Other"
                checked={field.value.includes('other_selfcare')}
                onChange={() => field.onChange(toggleEvent('other_selfcare', field.value as EventType[]))}
                color="purple"
              />
            </div>
          )}
        />
      </FormSection>

      {/* Arts, Entertainment & Events */}
      <FormSection
        title="Arts, Entertainment & Events"
        icon={<Theater className="h-5 w-5 text-purple-500" />}
        isOpen={openSection === 'events'}
        onToggle={() => toggleSection('events')}
        summary={summaries.events}
      >
        <Controller
          name="life_events"
          control={control}
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              <PillButton
                label="Concert"
                checked={field.value.includes('concert')}
                onChange={() => field.onChange(toggleEvent('concert', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Stage Play"
                checked={field.value.includes('stage_production')}
                onChange={() => field.onChange(toggleEvent('stage_production', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Sporting Event"
                checked={field.value.includes('attended_sport')}
                onChange={() => field.onChange(toggleEvent('attended_sport', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Movies"
                checked={field.value.includes('movies')}
                onChange={() => field.onChange(toggleEvent('movies', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Museum"
                checked={field.value.includes('museum')}
                onChange={() => field.onChange(toggleEvent('museum', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Park"
                checked={field.value.includes('park')}
                onChange={() => field.onChange(toggleEvent('park', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Diner"
                checked={field.value.includes('diner')}
                onChange={() => field.onChange(toggleEvent('diner', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Ice Cream"
                checked={field.value.includes('ice_cream')}
                onChange={() => field.onChange(toggleEvent('ice_cream', field.value as EventType[]))}
                color="purple"
              />
              <PillButton
                label="Saw Friends"
                checked={field.value.includes('guys_night')}
                onChange={() => field.onChange(toggleEvent('guys_night', field.value as EventType[]))}
                color="purple"
              />
            </div>
          )}
        />
        <Controller
          name="healthy_habits"
          control={control}
          render={({ field }) => (
            <div className="mt-3 pt-3 border-t">
              <PillButton
                label="Read 5+ Pages"
                checked={field.value.includes('read_5pages')}
                onChange={() => field.onChange(toggleHabit('read_5pages', field.value as HabitType[]))}
              />
            </div>
          )}
        />
      </FormSection>

      {/* Travel Section */}
      {showLocationTracking && (
        <FormSection
          title="Travel"
          subtitle="Blank if N/A"
          icon={<Plane className="h-5 w-5 text-sky-500" />}
          isOpen={openSection === 'travel'}
          onToggle={() => toggleSection('travel')}
          summary={summaries.travel}
        >
          <div className="space-y-4">
            <Controller
              name="life_events"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  <PillButton
                    label="Took a Flight"
                    checked={field.value.includes('flight')}
                    onChange={() => field.onChange(toggleEvent('flight', field.value as EventType[]))}
                    color="purple"
                  />
                  <PillButton
                    label="Took a Train"
                    checked={field.value.includes('train')}
                    onChange={() => field.onChange(toggleEvent('train', field.value as EventType[]))}
                    color="purple"
                  />
                </div>
              )}
            />

            <div className="pt-3 border-t">
              <Label className="text-sm font-medium text-gray-600 mb-3 block">Away from home city?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">At Wake</Label>
                  <Controller
                    name="city_wake"
                    control={control}
                    render={({ field }) => (
                      <CityAutocomplete
                        value={field.value || ''}
                        onChange={(value, lat, lng) => {
                          field.onChange(value)
                          // Store coordinates for later
                          if (lat && lng) {
                            setCityWakeCoords({ lat, lng })
                            if (profile.home_lat && profile.home_lng) {
                              const miles = calculateDistanceMiles(
                                profile.home_lat,
                                profile.home_lng,
                                lat,
                                lng
                              )
                              setValue('miles_wake', miles, { shouldDirty: true })
                            }
                          } else {
                            setCityWakeCoords(null)
                          }
                        }}
                        placeholder="City"
                      />
                    )}
                  />
                  <Input
                    type="number"
                    placeholder="Miles from home"
                    {...register('miles_wake', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">At Noon</Label>
                  <Controller
                    name="city_noon"
                    control={control}
                    render={({ field }) => (
                      <CityAutocomplete
                        value={field.value || ''}
                        onChange={(value, lat, lng) => {
                          field.onChange(value)
                          // Store coordinates for weather lookup
                          if (lat && lng) {
                            setCityNoonCoords({ lat, lng })
                            if (profile.home_lat && profile.home_lng) {
                              const miles = calculateDistanceMiles(
                                profile.home_lat,
                                profile.home_lng,
                                lat,
                                lng
                              )
                              setValue('miles_noon', miles, { shouldDirty: true })
                            }
                          } else {
                            setCityNoonCoords(null)
                          }
                        }}
                        placeholder="City"
                      />
                    )}
                  />
                  <Input
                    type="number"
                    placeholder="Miles from home"
                    {...register('miles_noon', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">At Sleep</Label>
                  <Controller
                    name="city_sleep"
                    control={control}
                    render={({ field }) => (
                      <CityAutocomplete
                        value={field.value || ''}
                        onChange={(value, lat, lng) => {
                          field.onChange(value)
                          // Store coordinates for later
                          if (lat && lng) {
                            setCitySleepCoords({ lat, lng })
                            if (profile.home_lat && profile.home_lng) {
                              const miles = calculateDistanceMiles(
                                profile.home_lat,
                                profile.home_lng,
                                lat,
                                lng
                              )
                              setValue('miles_sleep', miles, { shouldDirty: true })
                            }
                          } else {
                            setCitySleepCoords(null)
                          }
                        }}
                        placeholder="City"
                      />
                    )}
                  />
                  <Input
                    type="number"
                    placeholder="Miles from home"
                    {...register('miles_sleep', { valueAsNumber: true })}
                  />
                </div>
              </div>

              {/* Weather Display */}
              {(weather || weatherLoading) && (
                <div className="pt-3 border-t mt-4">
                  <Label className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    Weather {weatherLocation && <span className="text-gray-400 font-normal">({weatherLocation})</span>}
                  </Label>
                  {weatherLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading weather...
                    </div>
                  ) : weather ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className="text-gray-500 text-xs">High</div>
                        <div className="font-semibold text-lg">
                          {formatTemperature(weather.temperatureHigh, profile.temperature_unit || 'fahrenheit')}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className="text-gray-500 text-xs">Low</div>
                        <div className="font-semibold text-lg">
                          {formatTemperature(weather.temperatureLow, profile.temperature_unit || 'fahrenheit')}
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className="text-gray-500 text-xs">Conditions</div>
                        <div className="font-medium">{weather.conditions}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <div className="text-gray-500 text-xs">Precip.</div>
                        <div className="font-medium">{weather.precipitation}" </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Show message when no home city set and no noon city */}
              {!weather && !weatherLoading && !cityNoonCoords && !profile.home_lat && showLocationTracking && (
                <p className="text-xs text-amber-600 mt-2">
                  Set your home city in Settings to see weather data
                </p>
              )}
            </div>
          </div>
        </FormSection>
      )}

      {/* Best Part - simple text field */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <Label htmlFor="best_part" className="block mb-2 font-medium">
          Best part of your day
        </Label>
        <Textarea
          id="best_part"
          placeholder="What was the highlight?"
          {...register('best_part')}
          className="min-h-[60px]"
        />
      </div>

      {/* Error Display */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error saving entry</p>
          <p className="text-sm">{saveError}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-4 pt-2">
        <Button
          type="submit"
          className="flex-1"
          isLoading={isSubmitting || createEntry.isPending}
        >
          {existingEntry ? 'Update Entry' : 'Save Entry'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
