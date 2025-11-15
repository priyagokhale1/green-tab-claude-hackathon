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

export async function getTodayVsMonthAgo(userId: string) {
  const supabase = await createClient()
  
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0]
  
  // Get today's data
  const { data: todayData, error: todayError } = await supabase
    .from('tracking_data')
    .select('energy_wh, water_liters, co2_grams')
    .eq('user_id', userId)
    .eq('date', todayStr)
  
  if (todayError) throw todayError
  
  // Get one month ago's data
  const { data: monthAgoData, error: monthAgoError } = await supabase
    .from('tracking_data')
    .select('energy_wh, water_liters, co2_grams')
    .eq('user_id', userId)
    .eq('date', oneMonthAgoStr)
  
  if (monthAgoError) throw monthAgoError
  
  // Aggregate today's totals
  const todayTotals = todayData.reduce((acc, row) => ({
    energy: acc.energy + (row.energy_wh || 0),
    water: acc.water + (row.water_liters || 0),
    co2: acc.co2 + (row.co2_grams || 0)
  }), { energy: 0, water: 0, co2: 0 })
  
  // Aggregate one month ago's totals
  let monthAgoTotals = monthAgoData.reduce((acc, row) => ({
    energy: acc.energy + (row.energy_wh || 0),
    water: acc.water + (row.water_liters || 0),
    co2: acc.co2 + (row.co2_grams || 0)
  }), { energy: 0, water: 0, co2: 0 })
  
  // If no data from exactly one month ago, get the earliest available data
  const hasMonthAgoData = monthAgoTotals.energy > 0 || monthAgoTotals.water > 0 || monthAgoTotals.co2 > 0
  
  if (!hasMonthAgoData) {
    // Get the earliest data point available
    const { data: earliestData, error: earliestError } = await supabase
      .from('tracking_data')
      .select('date, energy_wh, water_liters, co2_grams')
      .eq('user_id', userId)
      .order('date', { ascending: true })
      .limit(100) // Get enough records to aggregate
    
    if (earliestError) throw earliestError
    
    if (earliestData && earliestData.length > 0) {
      // Get the earliest date
      const earliestDate = earliestData[0].date
      
      // Aggregate all data from the earliest date
      const earliestDateData = earliestData.filter(row => row.date === earliestDate)
      monthAgoTotals = earliestDateData.reduce((acc, row) => ({
        energy: acc.energy + (row.energy_wh || 0),
        water: acc.water + (row.water_liters || 0),
        co2: acc.co2 + (row.co2_grams || 0)
      }), { energy: 0, water: 0, co2: 0 })
    }
  }
  
  // Calculate percentage changes
  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) {
      // If no previous data at all, return null or a special value
      return current > 0 ? 100 : 0
    }
    return ((current - previous) / previous) * 100
  }
  
  return {
    today: todayTotals,
    monthAgo: monthAgoTotals,
    percentChange: {
      energy: calculatePercentChange(todayTotals.energy, monthAgoTotals.energy),
      water: calculatePercentChange(todayTotals.water, monthAgoTotals.water),
      co2: calculatePercentChange(todayTotals.co2, monthAgoTotals.co2)
    }
  }
}

export async function getWeeklyData(userId: string) {
  const supabase = await createClient()
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 7) // Last 7 days
  
  const { data, error } = await supabase
    .from('tracking_data')
    .select('date, domain, energy_wh, water_liters, co2_grams, total_seconds')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true })
  
  if (error) throw error
  
  // Aggregate totals
  const totals = data.reduce((acc, row) => ({
    energy: acc.energy + (row.energy_wh || 0),
    water: acc.water + (row.water_liters || 0),
    co2: acc.co2 + (row.co2_grams || 0),
    total_seconds: acc.total_seconds + (row.total_seconds || 0)
  }), { energy: 0, water: 0, co2: 0, total_seconds: 0 })
  
  // Get top domains
  const domainAggregates = data.reduce((acc, row) => {
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
  
  const topDomains = Object.values(domainAggregates)
    .sort((a: any, b: any) => b.energy_wh - a.energy_wh)
    .slice(0, 5)
  
  return {
    totals,
    topDomains,
    days: data.length > 0 ? new Set(data.map(d => d.date)).size : 0
  }
}

export async function getEmailSubscription(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('email_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error
  }
  
  return data
}

export async function upsertEmailSubscription(
  userId: string,
  email: string,
  optedIn: boolean
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('email_subscriptions')
    .upsert({
      user_id: userId,
      email: email,
      opted_in: optedIn,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

