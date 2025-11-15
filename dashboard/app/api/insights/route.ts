import { NextRequest, NextResponse } from 'next/server'
import { getClaudeInsights } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, dailyData, topDomains, totals, comparison } = body

    if (!category || !dailyData || !topDomains || !totals || !comparison) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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
        { error: 'Failed to generate insights' },
        { status: 500 }
      )
    }

    return NextResponse.json({ insights })
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

