# Claude API Setup for Dashboard Insights

The dashboard uses Claude API to generate personalized insights under each chart. To enable this feature:

## Step 1: Get Your Claude API Key

1. Go to https://console.anthropic.com/
2. Sign in or create an account
3. Navigate to API Keys
4. Create a new API key
5. Copy the key

## Step 2: Add to Environment Variables

Add the following line to your `.env.local` file in the `dashboard` folder:

```env
CLAUDE_API_KEY=your-api-key-here
```

## Step 3: Restart the Development Server

After adding the API key, restart your Next.js server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## What It Does

The insights will appear under each chart (Energy, Water, CO₂) and provide:
- Analysis of your data trends
- Relatable comparisons
- Actionable suggestions for greener alternatives
- Website-specific recommendations

## If API Key is Not Set

If the API key is not configured, the insights section will simply not appear. The dashboard will work normally without it.

