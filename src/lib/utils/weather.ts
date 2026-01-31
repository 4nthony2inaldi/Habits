// Weather service using Open-Meteo API (free, no API key required)
// Supports both current and historical weather data

export interface WeatherData {
  temperatureHigh: number // in Fahrenheit
  temperatureLow: number // in Fahrenheit
  conditions: string
  humidity: number // percentage
  precipitation: number // in inches
}

interface OpenMeteoResponse {
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    relative_humidity_2m_mean?: number[]
    weathercode: number[]
  }
}

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
const weatherCodeToCondition: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  56: 'Freezing Drizzle',
  57: 'Freezing Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  66: 'Freezing Rain',
  67: 'Freezing Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Light Showers',
  81: 'Showers',
  82: 'Heavy Showers',
  85: 'Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Hail',
  99: 'Thunderstorm with Hail',
}

function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32)
}

function mmToInches(mm: number): number {
  return Math.round(mm * 0.0393701 * 100) / 100
}

export async function fetchWeather(
  lat: number,
  lng: number,
  date: string // YYYY-MM-DD format
): Promise<WeatherData | null> {
  try {
    // Open-Meteo API for historical/archive weather data
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      start_date: date,
      end_date: date,
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode',
      timezone: 'auto',
    })

    // Use archive API for dates before today, forecast API for recent/future dates
    const today = new Date().toISOString().split('T')[0]
    const dateObj = new Date(date)
    const daysAgo = Math.floor((new Date(today).getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24))

    // Open-Meteo archive goes back to 1940, forecast goes forward 16 days
    // Archive API is for dates older than ~7 days
    const baseUrl = daysAgo > 7
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast'

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: {
        'User-Agent': 'HabitsTracker/1.0',
      },
    })

    if (!response.ok) {
      console.error('Weather API error:', response.status, await response.text())
      return null
    }

    const data: OpenMeteoResponse = await response.json()

    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
      console.error('No weather data returned for date:', date)
      return null
    }

    const index = 0 // We only requested one day
    const weatherCode = data.daily.weathercode[index]

    return {
      temperatureHigh: celsiusToFahrenheit(data.daily.temperature_2m_max[index]),
      temperatureLow: celsiusToFahrenheit(data.daily.temperature_2m_min[index]),
      conditions: weatherCodeToCondition[weatherCode] || 'Unknown',
      humidity: data.daily.relative_humidity_2m_mean?.[index] ?? 0,
      precipitation: mmToInches(data.daily.precipitation_sum[index] || 0),
    }
  } catch (error) {
    console.error('Failed to fetch weather:', error)
    return null
  }
}

// Fetch weather for multiple dates at once (more efficient for backfill)
export async function fetchWeatherBatch(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<Map<string, WeatherData>> {
  const results = new Map<string, WeatherData>()

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      start_date: startDate,
      end_date: endDate,
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode',
      timezone: 'auto',
    })

    // Determine which API to use based on date range
    const today = new Date().toISOString().split('T')[0]
    const endDateObj = new Date(endDate)
    const daysAgo = Math.floor((new Date(today).getTime() - endDateObj.getTime()) / (1000 * 60 * 60 * 24))

    const baseUrl = daysAgo > 7
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast'

    const response = await fetch(`${baseUrl}?${params}`, {
      headers: {
        'User-Agent': 'HabitsTracker/1.0',
      },
    })

    if (!response.ok) {
      console.error('Weather batch API error:', response.status)
      return results
    }

    const data: OpenMeteoResponse = await response.json()

    if (!data.daily || !data.daily.time) {
      return results
    }

    for (let i = 0; i < data.daily.time.length; i++) {
      const date = data.daily.time[i]
      const weatherCode = data.daily.weathercode[i]

      results.set(date, {
        temperatureHigh: celsiusToFahrenheit(data.daily.temperature_2m_max[i]),
        temperatureLow: celsiusToFahrenheit(data.daily.temperature_2m_min[i]),
        conditions: weatherCodeToCondition[weatherCode] || 'Unknown',
        humidity: data.daily.relative_humidity_2m_mean?.[i] ?? 0,
        precipitation: mmToInches(data.daily.precipitation_sum[i] || 0),
      })
    }
  } catch (error) {
    console.error('Failed to fetch weather batch:', error)
  }

  return results
}

// Convert temperature between units for display
export function convertTemperature(
  fahrenheit: number,
  unit: 'fahrenheit' | 'celsius'
): number {
  if (unit === 'celsius') {
    return Math.round(((fahrenheit - 32) * 5) / 9)
  }
  return fahrenheit
}

// Format temperature with unit symbol
export function formatTemperature(
  fahrenheit: number,
  unit: 'fahrenheit' | 'celsius'
): string {
  const temp = convertTemperature(fahrenheit, unit)
  return `${temp}°${unit === 'celsius' ? 'C' : 'F'}`
}
