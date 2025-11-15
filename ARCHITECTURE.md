# GreenTab MVP - Account & Dashboard Architecture

## Overview
This document outlines the architecture for adding user accounts and a dashboard website to the GreenTab Chrome extension.

## Architecture Components

### 1. Backend API
**Recommended Stack:**
- **Node.js + Express** (or **Python + FastAPI**, or **Go + Gin**)
- **PostgreSQL** or **MongoDB** for database
- **JWT** (JSON Web Tokens) for authentication
- **REST API** or **GraphQL** for data access

**Alternative Simple Option:**
- **Firebase** (Authentication + Firestore + Hosting)
- **Supabase** (PostgreSQL + Auth + Realtime)
- **Railway/Render** for hosting

### 2. Database Schema

#### Users Table
```
- id: UUID (primary key)
- email: string (unique)
- password_hash: string
- created_at: timestamp
- last_sync_at: timestamp
```

#### Tracking Data Table
```
- id: UUID (primary key)
- user_id: UUID (foreign key)
- date: date
- domain: string
- total_seconds: integer
- energy_wh: float (calculated)
- water_liters: float (calculated)
- co2_grams: float (calculated)
- synced_at: timestamp
```

#### Sessions Table (Optional - for real-time)
```
- id: UUID
- user_id: UUID
- domain: string
- start_time: timestamp
- end_time: timestamp
- duration_seconds: integer
```

### 3. API Endpoints

#### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login, returns JWT token
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user info

#### Data Sync
- `POST /api/data/sync` - Bulk upload tracking data
- `GET /api/data/export` - Get all user data (for dashboard)
- `GET /api/data/stats` - Get aggregated statistics
- `DELETE /api/data/clear` - Clear user data (optional)

### 4. Extension Changes Needed

#### Authentication Module
- Store JWT token in `chrome.storage.sync` (synced across devices)
- Login/signup UI in popup (or separate options page)
- Auto-refresh tokens before expiration

#### Data Sync Module
- Periodically sync local data to backend (every 5-10 minutes)
- Batch upload pending data
- Handle offline mode (queue for sync later)
- Track what's been synced vs. what's pending

#### Storage Structure Changes
```javascript
// Local storage (chrome.storage.local)
{
  greenTabTracking: { date: { domain: seconds } },
  syncState: {
    lastSyncDate: "2024-01-15",
    pendingSync: [...],
    userId: "user-id-here"
  },
  auth: {
    token: "jwt-token",
    refreshToken: "refresh-token",
    expiresAt: timestamp
  }
}
```

### 5. Dashboard Website

**Frontend Stack:**
- **React** or **Next.js** (or **Vue**, **SvelteKit**)
- **Chart.js** or **Recharts** or **D3.js** for visualizations
- **Tailwind CSS** or similar for styling

**Key Pages:**
- Login/Signup page
- Dashboard (overview with key metrics)
- Analytics page (detailed charts)
  - Time series of energy/water/CO2 over time
  - Top domains by energy usage
  - Daily/weekly/monthly breakdowns
  - Comparison charts (this week vs last week)
- Settings page
  - Account settings
  - Export data
  - Delete account

**Visualizations Needed:**
1. **Time Series Chart**: Energy/water/CO2 over days/weeks/months
2. **Pie/Bar Chart**: Top domains by energy usage
3. **Calendar Heatmap**: Daily usage intensity
4. **Comparison Charts**: Period-over-period comparisons
5. **Goal Tracking**: Progress toward reduction goals (if added)

## Implementation Steps

### Phase 1: Backend Setup
1. Set up database (PostgreSQL/Firestore)
2. Create user authentication endpoints
3. Create data sync endpoints
4. Set up JWT token handling
5. Add CORS for extension and website

### Phase 2: Extension Authentication
1. Add login/signup UI to extension
2. Implement token storage and refresh
3. Add authentication state management
4. Handle login/logout flows

### Phase 3: Data Synchronization
1. Implement sync service in background.js
2. Add periodic sync (every 5-10 min)
3. Batch upload local data
4. Handle sync conflicts and errors
5. Track sync status in UI

### Phase 4: Dashboard Website
1. Set up frontend project
2. Create login/signup pages
3. Build dashboard with charts
4. Implement data fetching from API
5. Add responsive design

### Phase 5: Polish & Testing
1. Error handling and edge cases
2. Loading states
3. Offline mode handling
4. User testing

## Recommended Quick Start Options

### Option 1: Firebase (Fastest)
**Pros:**
- Built-in authentication
- Firestore database
- Free tier available
- Real-time updates
- Hosting included

**Cons:**
- Vendor lock-in
- Less SQL flexibility

### Option 2: Supabase (Balanced)
**Pros:**
- PostgreSQL database (SQL)
- Built-in authentication
- Real-time subscriptions
- Free tier
- Open source

**Cons:**
- Smaller ecosystem than Firebase

### Option 3: Custom Backend (Most Control)
**Pros:**
- Full control
- Custom logic
- No vendor lock-in

**Cons:**
- More setup time
- Need to handle hosting
- More maintenance

## Data Privacy Considerations
- Only store aggregated data (domain + time)
- No full URLs or content
- Allow users to delete data
- GDPR compliance if targeting EU users
- Clear privacy policy

## Security Best Practices
- HTTPS only
- JWT tokens with expiration
- Rate limiting on API
- Input validation
- SQL injection prevention (use parameterized queries)
- Secure password hashing (bcrypt)

