# 🌱 GreenTab

**See the Hidden Environmental Cost of Your Browsing**

GreenTab is a Chrome extension that tracks your browsing habits and calculates the environmental impact (energy, water, and CO₂ emissions) of the websites you visit. It includes a comprehensive dashboard with AI-generated insights and weekly email recaps.

---

## ✨ Features

### Chrome Extension
- 🔍 **Real-time tracking** - Monitors which website you're on and tracks time spent
- 🌍 **Environmental impact calculation** - Estimates energy (Wh), water (L), and CO₂ (g) usage
- 🟢 **Green hosting detection** - Checks if websites use renewable energy via Green Web Foundation API
- 📊 **Live stats** - See your impact in real-time as you browse
- 👤 **Google OAuth authentication** - Sign in to sync data across devices
- 🔒 **Privacy-first** - Only tracks domain + time, no content or personal data
- 📱 **Dashboard link** - Quick access to your full analytics dashboard

### Dashboard Website
- 📈 **Interactive charts** - View energy, water, and CO₂ usage over the last 30 days
- 📊 **Trend analysis** - See percentage changes compared to previous month
- 🎯 **Top domains** - Identify which websites consume the most resources
- 🤖 **AI insights** - Claude-generated personalized insights and recommendations
- 📧 **Weekly email recaps** - Opt-in to receive "GreenTab Wrapped" style summaries
- 🎨 **Modern UI** - Dark theme with beautiful visualizations

---

## 🛠️ Tech Stack

### Chrome Extension
- **Manifest V3** - Modern Chrome extension architecture
- **JavaScript** - Vanilla JS (no frameworks)
- **Chrome Storage API** - Local and sync storage
- **Chrome Identity API** - OAuth authentication
- **Chrome Alarms API** - Persistent background sync

### Dashboard
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **React 19** - UI library
- **Tailwind CSS 4** - Utility-first styling
- **Recharts** - Chart visualization library
- **Supabase** - Backend (PostgreSQL + Auth)

### Backend & APIs
- **Supabase** - PostgreSQL database, authentication, and storage
- **Claude API** (Anthropic) - AI-generated insights and email content
- **Resend** - Email delivery service
- **Green Web Foundation API** - Green hosting detection
- **Website Carbon API** - Carbon intensity data

---

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v20.9.0 or higher)
   - Check: `node --version`
   - Install: [nodejs.org](https://nodejs.org/) or use `nvm install 20`

2. **npm** (comes with Node.js)
   - Check: `npm --version`

3. **Google Chrome** browser

4. **Accounts for APIs** (all have free tiers):
   - [Supabase](https://supabase.com) - Database & Auth
   - [Anthropic Claude](https://console.anthropic.com/) - AI insights (optional)
   - [Resend](https://resend.com) - Email service (optional, for weekly emails)
   - [Google Cloud Console](https://console.cloud.google.com) - OAuth credentials

---

## 🚀 Installation & Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/priyagokhale1/green-tab-claude-hackathon.git
cd green-tab-claude-hackathon
```

### Step 2: Set Up Supabase

1. **Create a Supabase project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your **Project URL** and **Anon Key** from Settings → API

2. **Set up the database schema**:
   - Go to SQL Editor in Supabase
   - Run this SQL to create the tracking data table:

```sql
-- Create tracking_data table
CREATE TABLE IF NOT EXISTS tracking_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  domain TEXT NOT NULL,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  energy_wh FLOAT,
  water_liters FLOAT,
  co2_grams FLOAT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date, domain)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tracking_data_user_date 
  ON tracking_data(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_data_user_domain 
  ON tracking_data(user_id, domain);

-- Enable Row Level Security
ALTER TABLE tracking_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own tracking data"
  ON tracking_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking data"
  ON tracking_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracking data"
  ON tracking_data FOR UPDATE
  USING (auth.uid() = user_id);
```

3. **Create email subscriptions table** (for weekly emails):

```sql
-- Create email_subscriptions table
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  opted_in BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_user_id 
  ON email_subscriptions(user_id);

-- Enable Row Level Security
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own email subscription"
  ON email_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email subscription"
  ON email_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email subscription"
  ON email_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);
```

4. **Enable Google OAuth**:
   - Go to Authentication → Providers in Supabase
   - Enable Google provider
   - Get OAuth credentials from [Google Cloud Console](https://console.cloud.google.com):
     - Create OAuth 2.0 Client ID
     - Add authorized redirect URI: `https://[your-project-id].supabase.co/auth/v1/callback`
   - Add Client ID and Client Secret to Supabase

### Step 3: Configure Chrome Extension

1. **Update Supabase credentials** in `popup.js` and `background.js`:

```javascript
// Lines 19-20 in both files
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

2. **Add extension redirect URL to Supabase**:
   - Load the extension in Chrome first (see Step 5)
   - Get your extension ID from `chrome://extensions`
   - In Supabase → Authentication → URL Configuration
   - Add redirect URL: `https://[extension-id].chromiumapp.org/`

### Step 4: Set Up Dashboard

1. **Navigate to dashboard directory**:

```bash
cd dashboard
```

2. **Install dependencies**:

```bash
npm install
```

3. **Create environment file**:

Create `dashboard/.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Claude API (optional - for AI insights)
CLAUDE_API_KEY=your-claude-api-key-here

# Resend API (optional - for weekly emails)
RESEND_API_KEY=re_your-resend-api-key-here
RESEND_FROM_EMAIL=GreenTab <noreply@greentab.app>
```

4. **Get API keys**:

   - **Claude API Key** (optional):
     - Sign up at [console.anthropic.com](https://console.anthropic.com/)
     - Create an API key
     - Add to `.env.local` as `CLAUDE_API_KEY`
   
   - **Resend API Key** (optional, for weekly emails):
     - Sign up at [resend.com](https://resend.com)
     - Create an API key
     - Add to `.env.local` as `RESEND_API_KEY`
     - Set `RESEND_FROM_EMAIL` (can use default for testing)

5. **Update Supabase redirect URLs**:
   - In Supabase → Authentication → URL Configuration
   - Add: `http://localhost:3000/api/auth/callback`

### Step 5: Load Chrome Extension

1. **Open Chrome Extensions**:
   - Go to `chrome://extensions`
   - Enable **"Developer mode"** (toggle in top right)

2. **Load the extension**:
   - Click **"Load unpacked"**
   - Select the `green-tab-claude-hackathon` folder (root directory, not dashboard)
   - Note your **Extension ID** (displayed under the extension name)

3. **Complete OAuth setup**:
   - Add the extension redirect URL to Supabase (see Step 3)
   - Add the extension redirect URL to Google Cloud Console OAuth credentials

### Step 6: Run the Dashboard

1. **Start the development server**:

```bash
cd dashboard
npm run dev
```

2. **Open in browser**:
   - Navigate to `http://localhost:3000`
   - Sign in with the same Google account used in the extension

---

## 📡 APIs Used

### Required APIs

1. **Supabase** (Backend & Auth)
   - **Purpose**: Database storage, user authentication, OAuth
   - **Setup**: [supabase.com](https://supabase.com)
   - **Free tier**: 500MB database, 2GB bandwidth
   - **Credentials needed**: Project URL, Anon Key

2. **Green Web Foundation API**
   - **Purpose**: Check if websites use green hosting
   - **Endpoint**: `https://api.thegreenwebfoundation.org/greencheck/`
   - **Rate limit**: Free, no authentication required
   - **Documentation**: [thegreenwebfoundation.org](https://www.thegreenwebfoundation.org/)

3. **Website Carbon API**
   - **Purpose**: Get carbon intensity data for websites
   - **Endpoint**: `https://api.websitecarbon.com/site`
   - **Rate limit**: Free tier available
   - **Documentation**: [websitecarbon.com](https://www.websitecarbon.com/api/)

### Optional APIs

4. **Anthropic Claude API** (AI Insights)
   - **Purpose**: Generate personalized insights and email content
   - **Endpoint**: `https://api.anthropic.com/v1/messages`
   - **Setup**: [console.anthropic.com](https://console.anthropic.com/)
   - **Free tier**: Pay-as-you-go, very affordable
   - **Model used**: `claude-3-haiku-20240307`
   - **Credentials needed**: API key

5. **Resend API** (Weekly Emails)
   - **Purpose**: Send weekly "GreenTab Wrapped" email recaps
   - **Endpoint**: `https://api.resend.com/emails`
   - **Setup**: [resend.com](https://resend.com)
   - **Free tier**: 3,000 emails/month
   - **Credentials needed**: API key

---

## 🔧 Environment Variables

### Chrome Extension
No environment variables needed - credentials are in code:
- `popup.js` (lines 19-20): `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `popup.js` (line 24): `DASHBOARD_URL` (default: `http://localhost:3000`)

### Dashboard
Create `dashboard/.env.local`:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional - for AI insights
CLAUDE_API_KEY=sk-ant-api03-...

# Optional - for weekly emails
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=GreenTab <noreply@greentab.app>
```

---

## 📁 Project Structure

```
green-tab-claude-hackathon/
├── manifest.json              # Chrome extension configuration
├── popup.js                   # Extension popup logic & UI
├── background.js              # Background service worker (tracking & sync)
├── hello.html                 # Extension popup HTML
├── green_tab_logo.png         # Extension icon
│
├── dashboard/                 # Next.js dashboard application
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── dashboard/
│   │   │   └── page.tsx      # Main dashboard page
│   │   └── api/
│   │       ├── auth/         # Authentication routes
│   │       ├── insights/      # AI insights endpoint
│   │       └── email/        # Email subscription endpoints
│   ├── components/
│   │   ├── charts/           # Chart components (Energy, Water, CO₂)
│   │   ├── Insights.tsx      # AI-generated insights
│   │   ├── EmailOptIn.tsx    # Email subscription UI
│   │   ├── StatsCards.tsx    # Summary statistics
│   │   └── DomainList.tsx     # Top domains list
│   ├── lib/
│   │   ├── claude.ts         # Claude API integration
│   │   ├── email.ts          # Resend email integration
│   │   ├── queries.ts        # Supabase queries
│   │   └── supabase/         # Supabase clients
│   ├── public/               # Static assets
│   ├── .env.local            # Environment variables (create this)
│   └── package.json          # Dependencies
│
└── README.md                 # This file
```

---

## 🎯 How It Works

### Chrome Extension Flow

1. **Background Script** (`background.js`):
   - Monitors active tab changes
   - Tracks time spent on each domain
   - Calculates environmental impact using APIs
   - Syncs data to Supabase every 30 seconds (if authenticated)
   - Uses Chrome Alarms API for persistence

2. **Popup** (`popup.js` + `hello.html`):
   - Displays real-time stats (energy, water, CO₂)
   - Shows current domain and session time
   - Handles Google OAuth sign-in
   - Provides link to dashboard

3. **Data Sync**:
   - Local data stored in `chrome.storage.local`
   - When authenticated, syncs to Supabase every 30 seconds
   - Updates `synced_at` timestamp on each sync

### Dashboard Flow

1. **Authentication**:
   - Uses Supabase OAuth (same as extension)
   - Server-side session management
   - Protected routes with redirect

2. **Data Visualization**:
   - Fetches aggregated data from Supabase
   - Displays charts using Recharts
   - Shows trends and comparisons

3. **AI Insights**:
   - Calls Claude API with user's data
   - Generates personalized insights per category
   - Displays concise recommendations

4. **Weekly Emails**:
   - Users can opt-in with email address
   - Weekly cron job (or manual trigger) sends emails
   - Claude generates "GreenTab Wrapped" style content

---

## 🚦 Running the Project

### Chrome Extension

1. **Load in Chrome**:
   ```bash
   # No build step needed - just load the folder
   # Go to chrome://extensions → Load unpacked
   ```

2. **Test**:
   - Click the extension icon
   - Browse some websites
   - Watch the stats update in real-time

### Dashboard

1. **Start development server**:
   ```bash
   cd dashboard
   npm run dev
   ```

2. **Access dashboard**:
   - Open `http://localhost:3000`
   - Sign in with Google
   - View your data and insights

3. **Test email (optional)**:
   - Opt in to weekly emails on dashboard
   - Click "Send Test Email" button
   - Check your inbox

---

## 🔍 Troubleshooting

### Extension Issues

**"Chrome Identity API not available"**
- Reload the extension: `chrome://extensions` → Reload
- Close and reopen the popup
- Restart Chrome

**"OAuth redirect URL mismatch"**
- Ensure extension redirect URL is added to:
  - Supabase → Authentication → URL Configuration
  - Google Cloud Console → OAuth credentials

**Data not syncing**
- Check if signed in (should see "Hi [Name]!" in popup)
- Check browser console for errors: `Ctrl+Shift+J`
- Verify Supabase credentials in `popup.js` and `background.js`

### Dashboard Issues

**"Cannot connect to Supabase"**
- Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart dev server after changing `.env.local`

**"No data showing"**
- Ensure extension is tracking and syncing data
- Check you're signed in with the same Google account
- Wait a few minutes for data to sync

**Insights not generating**
- Check `CLAUDE_API_KEY` is set in `.env.local`
- Check browser console for API errors
- Verify you have data (insights need at least some tracking data)

**Email not sending**
- Check `RESEND_API_KEY` is set in `.env.local`
- Verify email address format
- Check Resend dashboard for delivery status

### Port Issues

**Port 3000 already in use**:
```bash
# Check what's using the port
lsof -i :3000

# Or use a different port
npm run dev -- -p 3001
# Then update DASHBOARD_URL in popup.js
```

---

## 📊 Data Flow

```
User Browses
    ↓
Background Script Tracks Domain + Time
    ↓
Fetch Carbon Data (Website Carbon API)
    ↓
Calculate Impact (Energy, Water, CO₂)
    ↓
Store Locally (Chrome Storage)
    ↓
[If Authenticated] Sync to Supabase (every 30s)
    ↓
Dashboard Fetches Data
    ↓
Display Charts & Insights
```

---

## 🔐 Security & Privacy

- ✅ **No content tracking** - Only domain names and time spent
- ✅ **Local-first** - Data stored locally by default
- ✅ **Opt-in sync** - Only syncs when user signs in
- ✅ **HTTPS only** - All API calls use secure connections
- ✅ **Row Level Security** - Supabase RLS ensures users only see their own data
- ✅ **JWT tokens** - Secure authentication with expiration
- ✅ **No personal data** - No URLs, page content, or keystrokes tracked

---

## 🧪 Development

### Debugging Extension

1. **Popup console**:
   - Right-click extension icon → "Inspect popup"
   - Or: `Ctrl+Shift+J` when popup is open

2. **Background script console**:
   - Go to `chrome://extensions`
   - Find GreenTab → "service worker" (click to open console)

3. **Storage inspection**:
   - DevTools → Application → Storage → Chrome Storage

### Debugging Dashboard

1. **Browser console**: `F12` or `Ctrl+Shift+J`
2. **Server logs**: Check terminal where `npm run dev` is running
3. **Network tab**: Inspect API calls in DevTools

### Making Changes

- **Extension**: Reload extension after changes (`chrome://extensions` → Reload)
- **Dashboard**: Hot reloads automatically (Next.js)
- **Environment variables**: Restart dev server after changing `.env.local`

---

## 📝 API Rate Limits & Costs

### Free Tiers

- **Supabase**: 500MB database, 2GB bandwidth/month
- **Green Web Foundation**: No limits (public API)
- **Website Carbon**: Free tier available
- **Claude API**: Pay-as-you-go (~$0.25 per 1M tokens)
- **Resend**: 3,000 emails/month free

### Estimated Costs (per user per month)

- **Supabase**: Free (within limits)
- **Claude API**: ~$0.01 (for insights)
- **Resend**: Free (within 3,000 emails)
- **Total**: Essentially free for small-scale use

---

## 🎨 Customization

### Change Dashboard URL

In `popup.js` (line 24):
```javascript
const DASHBOARD_URL = 'http://localhost:3000'; // Change to your URL
```

### Modify Chart Colors

In `dashboard/app/globals.css`, update CSS variables:
```css
--energy-color: #facc15;  /* Yellow */
--water-color: #38bdf8;  /* Blue */
--carbon-color: #fb7185; /* Pink */
```

### Adjust Sync Frequency

In `background.js`, change the alarm interval (line ~304):
```javascript
chrome.alarms.create('syncData', { periodInMinutes: 0.5 }); // 30 seconds
```

---

## 📚 Additional Resources

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Recharts Documentation](https://recharts.org/)
- [Claude API Documentation](https://docs.anthropic.com/)

---

## 🤝 Contributing

This is a hackathon project. Feel free to fork and modify for your own use!

---

## 📄 License

Built with 🌿 for a more sustainable web

---

## 🆘 Need Help?

1. Check browser console for errors
2. Verify all environment variables are set
3. Ensure all APIs are configured correctly
4. Check Supabase database schema is created
5. Verify OAuth redirect URLs are configured

For detailed troubleshooting, check the browser console and server logs.
