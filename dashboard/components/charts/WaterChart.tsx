'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO, differenceInDays, addDays } from 'date-fns'

interface DataPoint {
  date: string
  water_liters: number
}

export function WaterChart({ data }: { data: DataPoint[] }) {
  // Create a date range for the last 30 days
  const endDate = new Date()
  const startDate = addDays(endDate, -30)
  
  // Create a map of data by date string (YYYY-MM-DD)
  const dataMap = new Map<string, number>()
  data.forEach(d => {
    dataMap.set(d.date, d.water_liters)
  })
  
  // Generate chart data for all dates in range, filling gaps with null
  const chartData = []
  let chartDate = new Date(startDate)
  while (chartDate <= endDate) {
    const dateStr = format(chartDate, 'yyyy-MM-dd')
    const value = dataMap.get(dateStr)
    
    // Calculate position as days since start
    const daysSinceStart = differenceInDays(chartDate, startDate)
    
    chartData.push({
      date: format(chartDate, 'MMM d'),
      dateValue: daysSinceStart,
      water: value !== undefined ? parseFloat(value.toFixed(4)) : null
    })
    
    chartDate = addDays(chartDate, 1)
  }
  
  // Custom tick formatter to show only every 2 days
  const tickFormatter = (tick: any, index: number) => {
    const date = addDays(startDate, tick)
    // Only show label if it's a multiple of 2 days
    if (differenceInDays(date, startDate) % 2 === 0) {
      return format(date, 'MMM d')
    }
    return ''
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis 
          dataKey="dateValue"
          stroke="var(--text-subtle)"
          tickFormatter={tickFormatter}
          domain={[0, 30]}
          type="number"
          scale="linear"
        />
        <YAxis stroke="var(--text-subtle)" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--card-bg)', 
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-main)'
          }}
          labelFormatter={(value) => {
            const date = addDays(startDate, value)
            return format(date, 'MMM d, yyyy')
          }}
        />
        <Line 
          type="monotone" 
          dataKey="water" 
          stroke="var(--water-color)" 
          strokeWidth={2}
          dot={{ fill: 'var(--water-color)', r: 4 }}
          connectNulls={true}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
