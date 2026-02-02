'use client'

import * as React from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'
import { MapPin, Loader2 } from 'lucide-react'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  class: string
  importance: number
  address?: {
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

interface CityAutocompleteProps {
  value: string
  onChange: (value: string, lat?: number, lng?: number) => void
  placeholder?: string
  id?: string
  className?: string
  disabled?: boolean
}

function formatDisplayName(result: NominatimResult): string {
  // Try to format a cleaner display name from address components
  const addr = result.address
  if (addr) {
    const city = addr.city || addr.town || addr.village
    const parts = [city, addr.state, addr.country].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(', ')
    }
  }
  // Fallback to first 3 parts of display_name
  const parts = result.display_name.split(', ').slice(0, 3)
  return parts.join(', ')
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a city...',
  id,
  className,
  disabled,
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Sync input value with external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      // Using Nominatim API - free geocoding from OpenStreetMap
      // Search for places (cities, towns, villages) with dedupe to avoid duplicates
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '8',
        dedupe: '1',
      })

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            // Required by Nominatim usage policy
            'User-Agent': 'HabitsTracker/1.0',
          },
        }
      )

      if (!response.ok) throw new Error('Search failed')

      const data: NominatimResult[] = await response.json()

      // Filter to prioritize populated places (cities, towns, villages, etc.)
      // class=place or class=boundary with type=administrative are what we want
      const placeTypes = ['city', 'town', 'village', 'municipality', 'hamlet', 'suburb', 'neighbourhood', 'administrative']

      // Score function to prioritize specific cities over generic administrative boundaries
      const getResultScore = (result: NominatimResult): number => {
        let score = result.importance || 0

        // Strongly prioritize results that have a specific city/town/village in address
        const hasSpecificPlace = result.address && (result.address.city || result.address.town || result.address.village)
        if (hasSpecificPlace) {
          score += 10 // Big boost for having a specific place name
        }

        // Prioritize place class items (actual places vs boundaries)
        if (result.class === 'place') {
          score += 5
        }

        // Deprioritize state/country level administrative boundaries
        // These are usually what we DON'T want when searching for a specific city
        if (result.class === 'boundary' && result.type === 'administrative') {
          // Check if it's a state/region level boundary (no city in address = likely state/country level)
          if (!result.address?.city && !result.address?.town && !result.address?.village) {
            score -= 10 // Penalize generic administrative boundaries
          }
        }

        return score
      }

      const filtered = data
        .filter(result => {
          // Include if it's a place class or boundary/administrative
          const isPlaceClass = result.class === 'place'
          const isBoundary = result.class === 'boundary' && result.type === 'administrative'
          const isPlaceType = placeTypes.includes(result.type)
          const hasPlace = result.address && (result.address.city || result.address.town || result.address.village)
          return isPlaceClass || isBoundary || isPlaceType || hasPlace
        })
        .sort((a, b) => getResultScore(b) - getResultScore(a))
        .slice(0, 5)

      // If no filtered results, show first 5 of any results as fallback
      const results = filtered.length > 0 ? filtered : data.slice(0, 5)

      setSuggestions(results)
      setIsOpen(results.length > 0)
      setHighlightedIndex(-1)
    } catch (error) {
      console.error('Geocoding error:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue) // Update immediately for free-form input

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue)
    }, 300)
  }

  const handleSelect = (result: NominatimResult) => {
    const displayName = formatDisplayName(result)
    setInputValue(displayName)
    onChange(displayName, parseFloat(result.lat), parseFloat(result.lon))
    setIsOpen(false)
    setSuggestions([])
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0) {
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true)
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg"
        >
          <ul className="max-h-60 overflow-auto py-1">
            {suggestions.map((result, index) => (
              <li
                key={result.place_id}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  highlightedIndex === index
                    ? 'bg-purple-50 text-purple-900'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  <span>{formatDisplayName(result)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
