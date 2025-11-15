'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface DataPoint {
  date: string
  energy_wh: number
}

export function EnergyChart({ data }: { data: DataPoint[] }) {
  const chartData = data.map(d => ({
    date: format(new Date(d.date), 'MMM d'),
    energy: parseFloat(d.energy_wh.toFixed(2))
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: '1px solid #374151',
            borderRadius: '8px',
            color: '#e5e7eb'
          }}
        />
        <Line 
          type="monotone" 
          dataKey="energy" 
          stroke="#facc15" 
          strokeWidth={2}
          dot={{ fill: '#facc15', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

