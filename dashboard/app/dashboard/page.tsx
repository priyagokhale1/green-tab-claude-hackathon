import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDailyAggregates, getTopDomains } from '@/lib/queries'
import { EnergyChart } from '@/components/charts/EnergyChart'
import { StatsCards } from '@/components/StatsCards'
import { DomainList } from '@/components/DomainList'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }
  
  const [dailyData, topDomains] = await Promise.all([
    getDailyAggregates(user.id, 30),
    getTopDomains(user.id, 10)
  ])
  
  // Calculate totals
  const totals = dailyData.reduce((acc, day) => ({
    energy: acc.energy + day.energy_wh,
    water: acc.water + day.water_liters,
    co2: acc.co2 + day.co2_grams
  }), { energy: 0, water: 0, co2: 0 })
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Environmental Impact</h1>
          <form action="/api/auth/signout" method="post">
            <button 
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
            >
              Sign Out
            </button>
          </form>
        </div>
        
        <StatsCards totals={totals} />
        
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Energy Usage (Last 30 Days)</h2>
          <EnergyChart data={dailyData} />
        </div>
        
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Top Domains by Energy</h2>
          <DomainList domains={topDomains} />
        </div>
      </div>
    </div>
  )
}

