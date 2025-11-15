# green-tab-claude-hackathon

🌱 **GreenTab: See the Hidden Environmental Cost of Your Browsing**

A Chrome extension that tracks environmental impact of your browsing in real-time.

---

## 🚀 Quick Start

### If You're Getting an Error
See **QUICK_START_FIX.md** for immediate solutions.

### To Install & Run
1. Clone the repo: `git clone https://github.com/priyagokhale1/green-tab-claude-hackathon.git`
2. Go to `chrome://extensions`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select your `green-tab-claude-hackathon` folder

See **AUTHENTICATION_SETUP.md** for OAuth configuration.

---

## 📖 Documentation

- **[QUICK_START_FIX.md](QUICK_START_FIX.md)** - Error troubleshooting (3 steps)
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Comprehensive guide (20+ issues)
- **[AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md)** - OAuth & Supabase setup
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture overview
- **[FIX_SUMMARY.md](FIX_SUMMARY.md)** - Latest fixes and improvements
- **[FLOW_DIAGRAM.md](FLOW_DIAGRAM.md)** - Visual sign-in flow diagrams

---

## ✨ Features

- 🔍 **Real-time tracking** - Monitors which website you're on
- 🌍 **Environmental impact** - Estimates energy, water, and CO₂ usage
- 🔒 **Privacy-first** - Only tracks domain + time, no content
- 📊 **Visual stats** - See impact in real-time as you browse
- 👤 **Google Auth** - Sign in to save and sync your data
- 🟢 **Green hosting** - Check if the site uses renewable energy

---

## 🎨 How It Works

```
Active Tab → Track Time → Fetch API Data → Calculate Impact → Show Stats
```

1. **Tracking**: Background script monitors your active tab
2. **API Integration**: Fetches carbon intensity data from Website Carbon API
3. **Calculation**: Converts CO₂ to energy (Wh) and water (L)
4. **Display**: Shows stats in the popup with real-time updates
5. **Sync**: Authenticated users' data syncs to Supabase backend

---

## 🛠️ Tech Stack

- **Chrome Extension (Manifest V3)**
- **JavaScript** (background.js, popup.js)
- **Supabase** (PostgreSQL + OAuth)
- **APIs**: Green Web Foundation, Website Carbon
- **Storage**: Chrome Storage API (sync & local)

---

## 📁 Project Structure

```
green-tab-claude-hackathon/
├── manifest.json           # Extension config
├── popup.js               # Main UI logic
├── background.js          # Tracking & sync
├── hello.html             # Popup HTML
├── circular_logo.png      # Logo
└── docs/
    ├── README.md                      # This file
    ├── QUICK_START_FIX.md            # Quick fixes
    ├── TROUBLESHOOTING.md            # Full troubleshooting
    ├── AUTHENTICATION_SETUP.md       # OAuth setup
    ├── ARCHITECTURE.md               # Architecture
    ├── FIX_SUMMARY.md               # Latest fixes
    └── FLOW_DIAGRAM.md              # Visual flows
```

---

## 🔐 Privacy & Security

- ✅ Only domain + time tracked (no URLs, content, or keystrokes)
- ✅ Data stored locally by default
- ✅ Only synced when user signs in
- ✅ HTTPS only for all API calls
- ✅ JWT tokens with expiration

---

## 🐛 Common Issues & Quick Fixes

### "Failed to sign in: Cannot read properties of undefined"
→ See **QUICK_START_FIX.md** (1-minute fix)

### OAuth redirect URL error
→ See **FIX_REDIRECT_URI_MISMATCH.md**

### Data not syncing
→ Check **TROUBLESHOOTING.md** > "Data Not Syncing"

### Time shows 0 sec / Impact shows "Calculating"
→ See **TROUBLESHOOTING.md** > "Common Issues"

---

## 📚 For Developers

### To Debug
1. Open DevTools: `Ctrl+Shift+J` (Windows/Linux) or `Cmd+Option+J` (Mac)
2. Reload extension: `chrome://extensions` > GreenTab > Reload
3. Check console logs for detailed info

### To Modify
- `popup.js` - UI and impact calculations
- `background.js` - Tracking and data sync
- `hello.html` - Popup layout

See **ARCHITECTURE.md** for design patterns.

---

## 🚀 Latest Updates

### Fixed (Nov 2025)
✅ Chrome identity API validation
✅ Better error messages
✅ Improved documentation
✅ Quick start guides

See **FIX_SUMMARY.md** for details.

---

## 📞 Need Help?

1. **Check the docs** - Most questions answered there
2. **Check console errors** - `Ctrl+Shift+J` in popup
3. **Read TROUBLESHOOTING.md** - 20+ solutions
4. **Screenshot the error** and create an issue

---

## 📝 License

Built with 🌿 for a more sustainable web