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
      // Skip if no data
      if (!dailyData || dailyData.length === 0 || !topDomains || topDomains.length === 0) {
        setLoading(false)
        setError(false)
        return
      }

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
          const errorData = await response.json().catch(() => ({}))
          console.error('Insights API error:', errorData)
          throw new Error(errorData.error || `Failed to fetch insights: ${response.status}`)
        }

        const data = await response.json()
        if (data.insights && typeof data.insights === 'string' && data.insights.trim()) {
          setInsights(data.insights)
        } else {
          console.error('Invalid insights response:', data)
          setError(true)
        }
      } catch (err: any) {
        console.error('Error fetching insights:', err)
        console.error('Category:', category, 'DailyData length:', dailyData?.length, 'TopDomains length:', topDomains?.length)
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
      <div className="text-base leading-relaxed" style={{ color: 'var(--text-main)', fontSize: '16px', lineHeight: '1.7' }}>
        {insights.split('\n').map((line, index) => {
          // Check if line is a bullet point
          if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
            return (
              <div key={index} className="ml-4 mb-2" style={{ listStyle: 'none' }}>
                {line.trim()}
              </div>
            )
          }
          // Regular paragraph
          if (line.trim()) {
            return (
              <p key={index} className="mb-3 last:mb-0">
                {line.trim()}
              </p>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}

