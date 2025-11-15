import { NextRequest, NextResponse } from 'next/server'
import { getClaudeInsights } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, dailyData, topDomains, totals, comparison } = body

    if (!category || !dailyData || !topDomains || !totals || !comparison) {
      return NextResponse.json(
        { error: 'Missing required parameters', details: { category: !!category, dailyData: !!dailyData, topDomains: !!topDomains, totals: !!totals, comparison: !!comparison } },
        { status: 400 }
      )
    }

    // Validate data arrays
    if (!Array.isArray(dailyData) || dailyData.length === 0) {
      return NextResponse.json(
        { error: 'No daily data available' },
        { status: 400 }
      )
    }

    if (!Array.isArray(topDomains) || topDomains.length === 0) {
      return NextResponse.json(
        { error: 'No domain data available' },
        { status: 400 }
      )
    }

    const insights = await getClaudeInsights(
      category,
      dailyData,
      topDomains,
      totals,
      comparison
    )

    if (!insights) {
      return NextResponse.json(
        { error: 'Failed to generate insights - check Claude API key and data validity' },
        { status: 500 }
      )
    }

    return NextResponse.json({ insights })
  } catch (error: any) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

