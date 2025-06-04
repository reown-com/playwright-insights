import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getTestRunSummaries } from '@/lib/s3-data-service'
import { calculateFlakinessStats } from '@/lib/flakiness-calculator'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const year = parseInt(searchParams.get('year') || '')
  const month = parseInt(searchParams.get('month') || '')

  if (!year || !month) {
    return NextResponse.json({ error: 'Year and month are required' }, { status: 400 })
  }

  try {
    const summaries = await getTestRunSummaries(year, month)
    const flakinessStats = calculateFlakinessStats(summaries)
    return NextResponse.json(flakinessStats)
  } catch (error) {
    console.error('Error fetching flakiness data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: 'Failed to fetch flakiness data', details: errorMessage },
      { status: 500 }
    )
  }
} 