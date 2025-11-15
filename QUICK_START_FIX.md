# Quick Fix Checklist

## Getting GreenTab Working on Your Laptop

Follow these steps **in order**:

### Step 1: Update Code (2 minutes)
- [ ] Open terminal and navigate to your GreenTab project
- [ ] Run: `git pull origin main`
- [ ] This gets the latest fixes

### Step 2: Reload Extension (1 minute)
- [ ] Go to `chrome://extensions`
- [ ] Find "GreenTab"
- [ ] Click the **Reload** button (circular refresh icon)
- [ ] Wait for it to finish loading

### Step 3: Test Sign-In (2 minutes)
- [ ] Close the GreenTab popup (click elsewhere)
- [ ] Click the GreenTab icon to reopen the popup
- [ ] Click "Sign in with Google"
- [ ] Follow the OAuth flow

### ✅ If It Works
Congratulations! You're done. The extension will now:
- Track your browsing time
- Show environmental impact
- Sync data to your account

### ❌ If You Still See an Error

**See Error About Chrome Identity?**
→ Go to Step 2 again and reload the extension

**Still Getting Error After Reload?**
→ Restart Chrome completely:
1. Close Chrome entirely
2. Reopen Chrome
3. Try signing in again

**Chrome Won't Let You Sign In?**
→ Check `TROUBLESHOOTING.md` for OAuth configuration issues

**Something Else?**
→ Open DevTools with `Ctrl+Shift+J` and look for red errors
→ Google the error message

---

## Common Issues Quick Reference

| Issue | What to Do |
|-------|-----------|
| "Cannot read properties of undefined" | Reload extension (Step 2 above) |
| OAuth page won't load | Check `FIX_REDIRECT_URI_MISMATCH.md` |
| Time shows "0 sec" | Wait a few seconds, or visit a website |
| Impact shows "Calculating..." | Wait 1-2 seconds, check internet connection |
| Data not syncing | Make sure you're signed in (see "Sign in with Google") |
| Extension missing from popup menu | Go to `chrome://extensions` and check if enabled |

---

## If You Need Help

1. **Check the logs:** Open DevTools (`Ctrl+Shift+J`) and look for errors
2. **Read TROUBLESHOOTING.md** - Has solutions for 90% of issues
3. **Check AUTHENTICATION_SETUP.md** - For Supabase/OAuth config
4. **Screenshot the error** and the browser console output

---

## Key Files
- `popup.js` - The main UI script (just updated)
- `manifest.json` - Extension configuration
- `TROUBLESHOOTING.md` - Full troubleshooting guide
- `FIX_REDIRECT_URI_MISMATCH.md` - OAuth setup
- `AUTHENTICATION_SETUP.md` - Backend setup

---

**TL;DR:**
1. `git pull origin main`
2. Go to `chrome://extensions` → Reload GreenTab
3. Try signing in again

🎉 Done!
