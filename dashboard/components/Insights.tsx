'use client'

import { useEffect, useState } from 'react'

interface InsightsProps {
  category: 'energy' | 'water' | 'co2'
  dailyData: any[]
  topDomains: any[]
  totals: { energy: number; water: number; co2: number }
  comparison: { percentChange: { energy: number; water: number; co2: number } }
}

export function Insights({ category, dailyData, topDomains, totals, comparison }: InsightsProps) {
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchInsights() {
      setLoading(true)
      setError(false)
      
      try {
        const response = await fetch('/api/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category,
            dailyData,
            topDomains,
            totals,
            comparison
          })
        })

        if (!response.ok) {
          throw new Error('Failed to fetch insights')
        }

        const data = await response.json()
        setInsights(data.insights)
      } catch (err) {
        console.error('Error fetching insights:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
  }, [category, dailyData, topDomains, totals, comparison])

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Generating insights...</span>
        </div>
      </div>
    )
  }

  if (error || !insights) {
    return null // Don't show anything if there's an error or no insights
  }

  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
        {insights.split('\n\n').map((paragraph, index) => (
          <p key={index} className="mb-3 last:mb-0">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}

