interface Totals {
  energy: number
  water: number
  co2: number
}

export function StatsCards({ totals }: { totals: Totals }) {
  const formatNumber = (num: number, decimals: number = 2) => {
    if (num < 0.01) return '<0.01'
    return num.toFixed(decimals)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <h3 className="text-sm font-medium text-gray-400">Total Energy</h3>
        </div>
        <p className="text-2xl font-bold text-white">{formatNumber(totals.energy)} Wh</p>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
          <h3 className="text-sm font-medium text-gray-400">Total Water</h3>
        </div>
        <p className="text-2xl font-bold text-white">{formatNumber(totals.water)} L</p>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-pink-400"></div>
          <h3 className="text-sm font-medium text-gray-400">Total CO₂</h3>
        </div>
        <p className="text-2xl font-bold text-white">{formatNumber(totals.co2)} g</p>
      </div>
    </div>
  )
}

