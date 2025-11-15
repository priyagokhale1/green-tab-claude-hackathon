interface PercentChanges {
  energy: number
  water: number
  co2: number
}

export function StatsCards({ percentChanges }: { percentChanges: PercentChanges }) {
  const formatPercent = (percent: number) => {
    const absPercent = Math.abs(percent)
    if (absPercent < 0.01) return '0%'
    if (absPercent < 1) return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
    return `${percent > 0 ? '+' : ''}${percent.toFixed(0)}%`
  }

  const getArrow = (percent: number) => {
    if (percent < 0) return '↓' // Down arrow
    if (percent > 0) return '↑' // Up arrow
    return '→' // No change
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Energy Usage Card */}
      <div className="session-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--energy-color)' }}></div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Energy Usage</h3>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold" style={{ color: 'var(--energy-color)' }}>
            {formatPercent(percentChanges.energy)}
          </span>
          <span className="text-2xl" style={{ color: 'var(--energy-color)' }}>
            {getArrow(percentChanges.energy)}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>vs. one month ago</p>
      </div>
      
      {/* Water Usage Card */}
      <div className="session-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--water-color)' }}></div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Water Usage</h3>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold" style={{ color: 'var(--water-color)' }}>
            {formatPercent(percentChanges.water)}
          </span>
          <span className="text-2xl" style={{ color: 'var(--water-color)' }}>
            {getArrow(percentChanges.water)}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>vs. one month ago</p>
      </div>
      
      {/* CO2 Emissions Card */}
      <div className="session-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--carbon-color)' }}></div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>CO₂ Emissions</h3>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold" style={{ color: 'var(--carbon-color)' }}>
            {formatPercent(percentChanges.co2)}
          </span>
          <span className="text-2xl" style={{ color: 'var(--carbon-color)' }}>
            {getArrow(percentChanges.co2)}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>vs. one month ago</p>
      </div>
    </div>
  )
}
