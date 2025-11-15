import { createClient } from './supabase/server'

export async function getUserTrackingData(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tracking_data')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getDailyAggregates(userId: string, days: number = 30) {
  const supabase = await createClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const { data, error } = await supabase
    .from('tracking_data')
    .select('date, energy_wh, water_liters, co2_grams, total_seconds')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })
  
  if (error) throw error
  
  // Aggregate by date
  const aggregated = data.reduce((acc, row) => {
    const date = row.date
    if (!acc[date]) {
      acc[date] = {
        date,
        energy_wh: 0,
        water_liters: 0,
        co2_grams: 0,
        total_seconds: 0
      }
    }
    acc[date].energy_wh += row.energy_wh || 0
    acc[date].water_liters += row.water_liters || 0
    acc[date].co2_grams += row.co2_grams || 0
    acc[date].total_seconds += row.total_seconds || 0
    return acc
  }, {} as Record<string, any>)
  
  return Object.values(aggregated)
}

export async function getTopDomains(userId: string, limit: number = 10) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tracking_data')
    .select('domain, energy_wh, water_liters, co2_grams, total_seconds')
    .eq('user_id', userId)
  
  if (error) throw error
  
  // Aggregate by domain
  const aggregated = data.reduce((acc, row) => {
    const domain = row.domain
    if (!acc[domain]) {
      acc[domain] = {
        domain,
        energy_wh: 0,
        water_liters: 0,
        co2_grams: 0,
        total_seconds: 0
      }
    }
    acc[domain].energy_wh += row.energy_wh || 0
    acc[domain].water_liters += row.water_liters || 0
    acc[domain].co2_grams += row.co2_grams || 0
    acc[domain].total_seconds += row.total_seconds || 0
    return acc
  }, {} as Record<string, any>)
  
  return Object.values(aggregated)
    .sort((a: any, b: any) => b.energy_wh - a.energy_wh)
    .slice(0, limit)
}

