import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getDailyAggregates, getTopDomains, getTodayVsMonthAgo } from '@/lib/queries'
import { EnergyChart } from '@/components/charts/EnergyChart'
import { WaterChart } from '@/components/charts/WaterChart'
import { CO2Chart } from '@/components/charts/CO2Chart'
import { StatsCards } from '@/components/StatsCards'
import { DomainList } from '@/components/DomainList'
import { Insights } from '@/components/Insights'
import { EmailOptIn } from '@/components/EmailOptIn'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }
  
  // Extract user's name from metadata
  const userName = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.user_metadata?.display_name ||
                   user.email?.split('@')[0] || 
                   'User'
  
  // Get first name for possessive form
  const firstName = userName.split(' ')[0]
  const displayName = firstName + (firstName.endsWith('s') ? "'" : "'s")
  
  const [dailyData, topDomains, comparison] = await Promise.all([
    getDailyAggregates(user.id, 30),
    getTopDomains(user.id, 10),
    getTodayVsMonthAgo(user.id)
  ])
  
  // Calculate totals from the last 30 days (matching the graphs)
  const totals = dailyData.reduce((acc, day) => ({
    energy: acc.energy + (day.energy_wh || 0),
    water: acc.water + (day.water_liters || 0),
    co2: acc.co2 + (day.co2_grams || 0)
  }), { energy: 0, water: 0, co2: 0 })
  
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
              <img 
                src="/green_tab_logo.png" 
                alt="GreenTab Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: 'var(--text-main)' }}>
                {displayName} Environmental Impact
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
                Dashboard
              </p>
            </div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button 
              type="submit"
              className="px-4 py-2 rounded-full text-sm font-medium transition"
              style={{
                background: 'rgba(248, 113, 113, 0.12)',
                color: '#fecaca',
                border: '1px solid rgba(248, 113, 113, 0.5)'
              }}
            >
              Sign Out
            </button>
          </form>
        </header>
        
        {/* Stats Cards */}
        <StatsCards percentChanges={comparison.percentChange} />
        
        {/* Charts */}
        <div className="space-y-4 mt-6">
          <div className="rounded-2xl p-4 border" style={{ 
            background: 'var(--card-bg)', 
            borderColor: 'var(--border-subtle)' 
          }}>
            <div className="mb-4">
              <h2 className="text-base font-medium mb-1" style={{ color: 'var(--text-main)' }}>
                Energy Usage
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                Last 30 Days
              </p>
            </div>
            <EnergyChart data={dailyData} />
            <Insights 
              category="energy"
              dailyData={dailyData}
              topDomains={topDomains}
              totals={totals}
              comparison={comparison}
            />
          </div>
          
          <div className="rounded-2xl p-4 border" style={{ 
            background: 'var(--card-bg)', 
            borderColor: 'var(--border-subtle)' 
          }}>
            <div className="mb-4">
              <h2 className="text-base font-medium mb-1" style={{ color: 'var(--text-main)' }}>
                Water Usage
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                Last 30 Days
              </p>
            </div>
            <WaterChart data={dailyData} />
            <Insights 
              category="water"
              dailyData={dailyData}
              topDomains={topDomains}
              totals={totals}
              comparison={comparison}
            />
          </div>
          
          <div className="rounded-2xl p-4 border" style={{ 
            background: 'var(--card-bg)', 
            borderColor: 'var(--border-subtle)' 
          }}>
            <div className="mb-4">
              <h2 className="text-base font-medium mb-1" style={{ color: 'var(--text-main)' }}>
                CO₂ Emissions
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                Last 30 Days
              </p>
            </div>
            <CO2Chart data={dailyData} />
            <Insights 
              category="co2"
              dailyData={dailyData}
              topDomains={topDomains}
              totals={totals}
              comparison={comparison}
            />
          </div>
        </div>
        
        {/* Top Domains */}
        <div className="mt-6 rounded-2xl p-5 border" style={{ 
          background: 'var(--card-bg)', 
          borderColor: 'var(--border-subtle)' 
        }}>
          <h2 className="domain-header">
            Top Domains by Energy
          </h2>
          <DomainList domains={topDomains} />
        </div>

        {/* Email Opt-In */}
        <EmailOptIn />
      </div>
    </div>
  )
}
