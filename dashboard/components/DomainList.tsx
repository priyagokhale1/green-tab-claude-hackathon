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
    return num.toFixed(decimals)
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
    <div className="space-y-2">
      {domains.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No data yet. Start browsing to see your impact!</p>
      ) : (
        domains.map((domain, index) => (
          <div key={domain.domain} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-sm font-medium">#{index + 1}</span>
                <h4 className="font-semibold text-white">{domain.domain}</h4>
              </div>
              <span className="text-sm text-gray-400">{formatTime(domain.total_seconds)}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Energy:</span>
                <span className="text-yellow-400 ml-2 font-medium">{formatNumber(domain.energy_wh)} Wh</span>
              </div>
              <div>
                <span className="text-gray-400">Water:</span>
                <span className="text-blue-400 ml-2 font-medium">{formatNumber(domain.water_liters)} L</span>
              </div>
              <div>
                <span className="text-gray-400">CO₂:</span>
                <span className="text-pink-400 ml-2 font-medium">{formatNumber(domain.co2_grams)} g</span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

