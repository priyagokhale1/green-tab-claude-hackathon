const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

export async function getClaudeInsights(
  category: 'energy' | 'water' | 'co2',
  dailyData: any[],
  topDomains: any[],
  totals: { energy: number; water: number; co2: number },
  comparison: { percentChange: { energy: number; water: number; co2: number } }
) {
  const apiKey = process.env.CLAUDE_API_KEY
  
  if (!apiKey) {
    return null // Return null if API key not configured
  }

  // Validate data
  if (!dailyData || dailyData.length === 0 || !topDomains || topDomains.length === 0) {
    return null
  }

  // Prepare data summary
  const categoryTotal = totals[category] || 0
  const percentChange = comparison.percentChange[category] || 0
  const top3Domains = topDomains
    .filter(d => d && d.domain) // Filter out invalid entries
    .slice(0, 3)
    .map(d => ({
      domain: d.domain,
      value: category === 'energy' ? (d.energy_wh || 0) : category === 'water' ? (d.water_liters || 0) : (d.co2_grams || 0),
      time: `${Math.floor((d.total_seconds || 0) / 3600)}h ${Math.floor(((d.total_seconds || 0) % 3600) / 60)}m`
    }))
  
  // If no valid domains after filtering, return null
  if (top3Domains.length === 0) {
    return null
  }

  // Calculate trend (increasing/decreasing/stable)
  const sortedData = [...dailyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2))
  const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2))
  
  const categoryKey = category === 'energy' ? 'energy_wh' : category === 'water' ? 'water_liters' : 'co2_grams'
  
  const firstHalfSum = firstHalf.reduce((sum, d) => sum + (d[categoryKey] || 0), 0)
  const secondHalfSum = secondHalf.reduce((sum, d) => sum + (d[categoryKey] || 0), 0)
  
  const firstHalfAvg = firstHalf.length > 0 ? firstHalfSum / firstHalf.length : 0
  const secondHalfAvg = secondHalf.length > 0 ? secondHalfSum / secondHalf.length : 0
  
  let trend = 'stable'
  if (firstHalfAvg > 0) {
    if (secondHalfAvg > firstHalfAvg * 1.1) {
      trend = 'increasing'
    } else if (secondHalfAvg < firstHalfAvg * 0.9) {
      trend = 'decreasing'
    }
  } else if (secondHalfAvg > 0) {
    trend = 'increasing'
  }

  const categoryName = category === 'energy' ? 'Energy' : category === 'water' ? 'Water' : 'CO₂'
  const unit = category === 'energy' ? 'Wh' : category === 'water' ? 'L' : 'g'

  const prompt = `Analyze this user's ${categoryName.toLowerCase()} usage data for the last 30 days and provide a brief, actionable insight.

**Data Summary:**
- Total ${categoryName} used: ${categoryTotal.toFixed(2)} ${unit}
- Change vs. one month ago: ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%
- Trend: ${trend}
- Top domains by ${categoryName.toLowerCase()}:
${top3Domains.length > 0 ? top3Domains.map((d, i) => `  ${i + 1}. ${d.domain}: ${d.value.toFixed(2)} ${unit} (${d.time})`).join('\n') : '  No domain data available'}

**Your Task:**
Write a VERY concise insight (1-2 sentences max) that:
1. Briefly comments on the trend (e.g., "Your ${categoryName.toLowerCase()} usage is ${trend} this month")
2. Provides one relatable comparison if helpful (e.g., "That's equivalent to...")

Then provide 2-3 bulleted alternatives:
- ${top3Domains.length > 0 ? `Suggest specific lower-impact alternatives for the top domain (e.g., "• Instead of ${top3Domains[0]?.domain}, try [alternative]")` : 'Suggest general lower-impact alternatives'}
- Suggest one greener behavior or setting
- Keep each bullet to one short line

**Tone:** Friendly, encouraging, not guilt-trippy.

**Format:** 
First line: 1-2 sentence insight
Then: 2-3 bullet points starting with "•" for alternatives

Example format:
"Your energy usage is increasing this month. That's like charging your phone 50 times.
• ${top3Domains.length > 0 ? `Instead of ${top3Domains[0]?.domain}, try reading articles instead of videos` : 'Try reading articles instead of watching videos'}
• Enable dark mode to reduce energy consumption
• Use text-based apps when possible"`

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Claude API error: ${response.status} - ${errorText}`)
      return null
    }

    const data = await response.json()
    
    // Extract text from response
    let insightText = ''
    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      if (typeof data.content[0].text === 'string') {
        insightText = data.content[0].text.trim()
      } else if (data.content[0].type === 'text' && data.content[0].text) {
        insightText = data.content[0].text.trim()
      }
    }
    
    return insightText || null
  } catch (error) {
    console.error('Claude API request failed:', error)
    return null
  }
}

export async function getClaudeWeeklyEmail(
  weeklyData: {
    totals: { energy: number; water: number; co2: number; total_seconds: number }
    topDomains: any[]
    days: number
  },
  userName: string = 'there'
) {
  const apiKey = process.env.CLAUDE_API_KEY
  
  if (!apiKey) {
    return generateFallbackEmail(weeklyData, userName)
  }

  const { totals, topDomains, days } = weeklyData
  const hours = Math.floor(totals.total_seconds / 3600)
  const minutes = Math.floor((totals.total_seconds % 3600) / 60)

  const prompt = `Create a fun, engaging "GreenTab Wrapped" style weekly email recap for a user's browsing environmental impact. This should feel like Spotify Wrapped but for environmental impact.

**User's Name:** ${userName}

**This Week's Stats:**
- Energy: ${totals.energy.toFixed(1)} Wh
- Water: ${totals.water.toFixed(2)} L
- CO₂: ${totals.co2.toFixed(1)} g
- Time browsing: ${hours}h ${minutes}m
- Active days: ${days} out of 7
- Top 3 sites:
${topDomains.slice(0, 3).map((d, i) => `  ${i + 1}. ${d.domain}: ${d.energy_wh.toFixed(1)} Wh`).join('\n')}

**Format Requirements:**
- Create an HTML email (use inline styles, no external CSS)
- Start with a friendly greeting using the user's name
- Include a "This Week's Impact" section with the key stats
- Add a "Top Sites" section highlighting their most-used sites
- Include fun comparisons (e.g., "That's like charging your phone X times" or "Equivalent to X miles driven")
- Add personalized insights and trends
- End with encouragement and a call to action to check the dashboard
- Use emojis tastefully (🌱, 🌍, 📊, etc.)
- Make it feel celebratory and informative, not guilt-trippy
- Use a clean, modern design with dark background (#020617) and green accents (#22c55e)
- Keep it concise but engaging (2-3 paragraphs plus stats)

**HTML Structure:**
- Use tables for layout (email client compatibility)
- Use inline styles
- Dark background: #020617
- Text color: #e5e7eb
- Accent color: #22c55e
- Card background: #020b1e
- Border color: #111827

Output ONLY the HTML email content, nothing else.`

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Claude API error: ${response.status} - ${errorText}`)
      return generateFallbackEmail(weeklyData, userName)
    }

    const data = await response.json()
    
    // Extract HTML from response
    let emailHtml = ''
    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      if (typeof data.content[0].text === 'string') {
        emailHtml = data.content[0].text.trim()
      } else if (data.content[0].type === 'text' && data.content[0].text) {
        emailHtml = data.content[0].text.trim()
      }
    }
    
    return emailHtml || generateFallbackEmail(weeklyData, userName)
  } catch (error) {
    console.error('Claude API request failed:', error)
    return generateFallbackEmail(weeklyData, userName)
  }
}

function generateFallbackEmail(
  weeklyData: {
    totals: { energy: number; water: number; co2: number; total_seconds: number }
    topDomains: any[]
    days: number
  },
  userName: string
) {
  const { totals, topDomains, days } = weeklyData
  const hours = Math.floor(totals.total_seconds / 3600)
  const minutes = Math.floor((totals.total_seconds % 3600) / 60)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: system-ui, -apple-system, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #020617; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #020b1e; border-radius: 16px; border: 1px solid #111827; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(145deg, #020617, #020b1e);">
              <h1 style="margin: 0; color: #22c55e; font-size: 32px; font-weight: 600;">🌱 GreenTab Wrapped</h1>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 14px;">Your Weekly Environmental Impact Recap</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; color: #e5e7eb; font-size: 16px; line-height: 1.6;">
                Hi ${userName}! 👋
              </p>
              
              <p style="margin: 0 0 30px; color: #e5e7eb; font-size: 16px; line-height: 1.6;">
                Here's your environmental impact from the past week:
              </p>
              
              <!-- Stats Cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td width="33%" style="padding: 15px; background-color: #020617; border-radius: 12px; border: 1px solid #111827; text-align: center;">
                    <div style="color: #facc15; font-size: 24px; font-weight: 600; margin-bottom: 5px;">${totals.energy.toFixed(1)}</div>
                    <div style="color: #9ca3af; font-size: 12px;">Wh Energy</div>
                  </td>
                  <td width="33%" style="padding: 15px; background-color: #020617; border-radius: 12px; border: 1px solid #111827; text-align: center; margin: 0 10px;">
                    <div style="color: #38bdf8; font-size: 24px; font-weight: 600; margin-bottom: 5px;">${totals.water.toFixed(2)}</div>
                    <div style="color: #9ca3af; font-size: 12px;">L Water</div>
                  </td>
                  <td width="33%" style="padding: 15px; background-color: #020617; border-radius: 12px; border: 1px solid #111827; text-align: center;">
                    <div style="color: #fb7185; font-size: 24px; font-weight: 600; margin-bottom: 5px;">${totals.co2.toFixed(1)}</div>
                    <div style="color: #9ca3af; font-size: 12px;">g CO₂</div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; color: #9ca3af; font-size: 14px;">
                ⏱️ Time browsing: ${hours}h ${minutes}m across ${days} days
              </p>
              
              ${topDomains.length > 0 ? `
              <div style="margin-top: 30px; padding: 20px; background-color: #020617; border-radius: 12px; border: 1px solid #111827;">
                <h2 style="margin: 0 0 15px; color: #e5e7eb; font-size: 18px; font-weight: 600;">Top Sites This Week</h2>
                ${topDomains.slice(0, 3).map((d, i) => `
                  <div style="margin-bottom: 10px; color: #9ca3af; font-size: 14px;">
                    ${i + 1}. <span style="color: #e5e7eb;">${d.domain}</span> - ${d.energy_wh.toFixed(1)} Wh
                  </div>
                `).join('')}
              </div>
              ` : ''}
              
              <p style="margin: 30px 0 0; color: #e5e7eb; font-size: 16px; line-height: 1.6;">
                Check out your full dashboard for detailed insights and trends! 🌍
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; border-top: 1px solid #111827;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                You're receiving this because you opted in to weekly GreenTab recaps.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

