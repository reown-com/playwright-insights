'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEffect, useState } from 'react'

interface AvailableDates {
  years: number[];
  monthsByYear: Record<number, number[]>;
}

export function YearMonthSelector() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [availableDates, setAvailableDates] = useState<AvailableDates>({ years: [], monthsByYear: {} })
  const [loading, setLoading] = useState(true)

  // Get current year and month from URL params or use current date
  const currentDate = new Date()
  const currentYear = parseInt(searchParams.get('year') || currentDate.getFullYear().toString())
  const currentMonth = parseInt(searchParams.get('month') || (currentDate.getMonth() + 1).toString())

  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const response = await fetch(`/api/flakiness-data?year=${currentYear}&month=${currentMonth}`)
        if (!response.ok) {
          throw new Error('Failed to fetch available dates')
        }
        const data = await response.json()
        if (data.availableDates) {
          setAvailableDates(data.availableDates)
        }
      } catch (error) {
        console.error('Error fetching available dates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableDates()
  }, [currentYear, currentMonth])

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year)
    const months = availableDates.monthsByYear[newYear] || []
    const newMonth = months.length > 0 ? months[0] : 1
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', newYear.toString())
    params.set('month', newMonth.toString())
    router.push(`?${params.toString()}`)
  }

  const handleMonthChange = (month: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', month)
    router.push(`?${params.toString()}`)
  }

  if (loading) {
    return <div className="animate-pulse h-10 w-48 bg-gray-200 rounded" />
  }

  return (
    <div className="flex gap-2">
      <Select
        value={currentYear.toString()}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Select year" />
        </SelectTrigger>
        <SelectContent>
          {availableDates.years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentMonth.toString()}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Select month" />
        </SelectTrigger>
        <SelectContent>
          {availableDates.monthsByYear[currentYear]?.map((month) => (
            <SelectItem key={month} value={month.toString()}>
              {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 