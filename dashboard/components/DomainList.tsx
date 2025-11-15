interface Domain {
  domain: string
  energy_wh: number
  water_liters: number
  co2_grams: number
  total_seconds: number
}

export function DomainList({ domains }: { domains: Domain[] }) {
  const formatNumber = (num: number, decimals: number = 2) => {
    if (num < 0.01) return '<0.01'
    return num.toFixed(decimals).replace(/\.?0+$/, '')
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="space-y-3">
      {domains.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-subtle)' }}>
          No data yet. Start browsing to see your impact!
        </p>
      ) : (
        domains.map((domain, index) => (
          <div key={domain.domain} className="domain-row">
            <div className="domain-main">
              <div className="domain-rank">#{index + 1}</div>
              <div className="domain-info">
                <div className="domain-name">{domain.domain}</div>
                <div className="domain-meta">
                  <span style={{ color: 'var(--text-subtle)' }}>Energy: </span>
                  <span style={{ color: 'var(--energy-color)' }}>{formatNumber(domain.energy_wh, 2)} Wh</span>
                  <span style={{ color: 'var(--text-subtle)' }}> · </span>
                  <span style={{ color: 'var(--text-subtle)' }}>Water: </span>
                  <span style={{ color: 'var(--water-color)' }}>{formatNumber(domain.water_liters, 2)} L</span>
                  <span style={{ color: 'var(--text-subtle)' }}> · </span>
                  <span style={{ color: 'var(--text-subtle)' }}>CO₂: </span>
                  <span style={{ color: 'var(--carbon-color)' }}>{formatNumber(domain.co2_grams, 2)} g</span>
                </div>
              </div>
            </div>
            <div className="domain-time">{formatTime(domain.total_seconds)}</div>
          </div>
        ))
      )}
    </div>
  )
}
