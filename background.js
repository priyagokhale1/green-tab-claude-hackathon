// Background script to track time spent on each domain across all tabs

// Store tracking data for all tabs: { tabId: { domain, startTime } }
let trackedTabs = new Map();

// Storage structure: { date: { domain: totalSeconds } }
const storageKey = 'greenTabTracking';

// Authentication and sync state
let isAuthenticated = false;
let authToken = null;
let userId = null;
let syncInterval = null;

// Supabase/Backend configuration (should match popup.js)
const SUPABASE_URL = 'https://taaadgsnajjsmpidtusz.supabase.co'; // e.g., 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYWFkZ3NuYWpqc21waWR0dXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDk5ODEsImV4cCI6MjA3ODc4NTk4MX0.QKFSl_WlrGVT8Wp3RsJWrqOC3WyEPmCi54xIinydBns'; // e.g., 'your-anon-key-here'

// Energy conversion factors (same as popup.js)
const CO2_TO_WH = 2; // Wh per gram CO2 (average)
const WH_TO_WATER = 0.001; // Liters per Wh (average)
const CO2_PER_PAGE_VIEW = 0.5; // grams CO2 per page view
const PAGES_PER_MINUTE = 2.5; // average pages per minute while browsing

// Initialize storage and load existing tabs
chrome.runtime.onInstalled.addListener(async () => {
  await initializeAllTabs();
});

// Also initialize when extension starts (service worker wakes up)
chrome.runtime.onStartup.addListener(async () => {
  await initializeAllTabs();
});

// Initialize immediately when script loads
initializeAllTabs();

// Initialize tracking for all currently open tabs
async function initializeAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url && !isChromeInternalPage(tab.url)) {
        await startTrackingTab(tab.id, tab.url);
      }
    }
  } catch (error) {
    console.error('Error initializing tabs:', error);
  }
}

// Check if URL is a Chrome internal page
function isChromeInternalPage(url) {
  return url.startsWith('chrome://') || 
         url.startsWith('chrome-extension://') || 
         url.startsWith('edge://') ||
         url.startsWith('about:');
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return null;
  }
}

// Start tracking a tab
async function startTrackingTab(tabId, url) {
  if (!url || isChromeInternalPage(url)) {
    return;
  }

  const domain = extractDomain(url);
  if (!domain) {
    return;
  }

  // Stop tracking if already tracking this tab with different domain
  if (trackedTabs.has(tabId)) {
    const existing = trackedTabs.get(tabId);
    if (existing.domain !== domain) {
      await stopTrackingTab(tabId);
    } else {
      // Already tracking this domain for this tab
      return;
    }
  }

  // Start tracking
  trackedTabs.set(tabId, {
    domain: domain,
    startTime: Date.now()
  });
}

// Stop tracking a tab and save its time
async function stopTrackingTab(tabId) {
  if (!trackedTabs.has(tabId)) {
    return;
  }

  const tracking = trackedTabs.get(tabId);
  const duration = Math.floor((Date.now() - tracking.startTime) / 1000);
  
  if (duration > 0) {
    await saveTimeToStorage(tracking.domain, duration);
  }
  
  trackedTabs.delete(tabId);
}

// Track when a tab is created
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.url) {
    await startTrackingTab(tab.id, tab.url);
  }
});

// Track when a tab is updated (URL changes or page loads)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when URL is available and page is complete
  if (changeInfo.url || (changeInfo.status === 'complete' && tab.url)) {
    await startTrackingTab(tabId, tab.url);
  }
});

// Track when a tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await stopTrackingTab(tabId);
});

// Periodically save time for all tracked tabs (every 30 seconds)
// This ensures we don't lose time if tabs are closed unexpectedly
setInterval(async () => {
  const now = Date.now();
  for (const [tabId, tracking] of trackedTabs.entries()) {
    const duration = Math.floor((now - tracking.startTime) / 1000);
    if (duration >= 30) {
      // Save accumulated time and reset start time to continue tracking
      await saveTimeToStorage(tracking.domain, duration);
      tracking.startTime = now; // Reset to continue tracking from this point
    }
  }
}, 30000); // Every 30 seconds

// Save time to storage
async function saveTimeToStorage(domain, seconds) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const result = await chrome.storage.local.get([storageKey]);
    const data = result[storageKey] || {};
    
    if (!data[today]) {
      data[today] = {};
    }
    
    if (!data[today][domain]) {
      data[today][domain] = 0;
    }
    
    data[today][domain] += seconds;
    
    await chrome.storage.local.set({ [storageKey]: data });
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
}

// Get current session time for a domain across all tabs
async function getCurrentSessionTime(domain) {
  let totalTime = 0;
  const now = Date.now();
  
  for (const [tabId, tracking] of trackedTabs.entries()) {
    if (tracking.domain === domain) {
      const duration = Math.floor((now - tracking.startTime) / 1000);
      totalTime += duration;
    }
  }
  
  return totalTime;
}

// Get total time for a domain today (stored + current sessions)
async function getTodayTimeForDomain(domain) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await chrome.storage.local.get([storageKey]);
    const data = result[storageKey] || {};
    
    const todayData = data[today] || {};
    const storedTime = todayData[domain] || 0;
    const currentSession = await getCurrentSessionTime(domain);
    
    return storedTime + currentSession;
  } catch (error) {
    console.error('Error getting time for domain:', error);
    return 0;
  }
}

// Calculate environmental impact from time spent on a site
function calculateImpact(totalSeconds) {
  // Calculate estimated page views
  const minutes = totalSeconds / 60;
  const pageViews = minutes * PAGES_PER_MINUTE;
  
  // Calculate CO2 (in grams)
  const co2Grams = pageViews * CO2_PER_PAGE_VIEW;
  
  // Convert CO2 to energy (Wh)
  const energyWh = co2Grams * CO2_TO_WH;
  
  // Convert energy to water (Liters)
  const waterLiters = energyWh * WH_TO_WATER;
  
  return {
    co2_grams: parseFloat(co2Grams.toFixed(4)),
    energy_wh: parseFloat(energyWh.toFixed(4)),
    water_liters: parseFloat(waterLiters.toFixed(6))
  };
}

// Check authentication status on startup
async function checkAuthOnStartup() {
  try {
    console.log('Background script: Checking auth on startup...');
    
    // Check both sync and local storage
    const [syncResult, localResult] = await Promise.all([
      chrome.storage.sync.get(['authUser', 'authToken']),
      chrome.storage.local.get(['authUser', 'authToken'])
    ]);
    
    console.log('Background script: Startup storage check:', {
      syncKeys: Object.keys(syncResult),
      localKeys: Object.keys(localResult),
      syncHasUser: !!syncResult.authUser,
      localHasUser: !!localResult.authUser
    });
    
    // Prefer local storage if both exist
    let result = localResult.authUser && localResult.authToken ? localResult : syncResult;
    
    if (result.authUser && result.authToken) {
      console.log('Background script: Auth data found on startup:', {
        userId: result.authUser.id,
        email: result.authUser.email,
        name: result.authUser.name,
        source: localResult.authUser ? 'local' : 'sync'
      });
      isAuthenticated = true;
      authToken = result.authToken;
      userId = result.authUser.id;
      startDataSync();
    } else {
      console.log('Background script: No auth data found on startup');
    }
  } catch (error) {
    console.error('Background script: Error checking auth on startup:', error);
  }
}

// Initialize auth check
checkAuthOnStartup();

// Start periodic data sync when authenticated
function startDataSync() {
  // Clear any existing sync interval
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Sync immediately, then every 30 seconds
  syncDataToBackend();
  syncInterval = setInterval(() => {
    syncDataToBackend();
  }, 30 * 1000); // 30 seconds
}

// Stop data sync
function stopDataSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// Sync local data to backend
async function syncDataToBackend() {
  if (!isAuthenticated || !authToken || !SUPABASE_URL) {
    return;
  }

  try {
    // Get all local tracking data
    const result = await chrome.storage.local.get([storageKey]);
    const localData = result[storageKey] || {};

    // Transform data for backend
    const syncData = [];
    for (const [date, domains] of Object.entries(localData)) {
      for (const [domain, seconds] of Object.entries(domains)) {
        if (seconds > 0) {
          // Calculate environmental impact
          const impact = calculateImpact(seconds);
          
          syncData.push({
            date: date,
            domain: domain,
            total_seconds: seconds,
            user_id: userId,
            energy_wh: impact.energy_wh,
            water_liters: impact.water_liters,
            co2_grams: impact.co2_grams
          });
        }
      }
    }

    if (syncData.length === 0) {
      return; // Nothing to sync
    }

    // Send to backend
    // Note: You'll need to create a database function or API endpoint
    // that handles bulk upsert of tracking data
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tracking_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': SUPABASE_ANON_KEY,
        'Prefer': 'resolution=merge-duplicates' // Upsert behavior
      },
      body: JSON.stringify(syncData)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    // Mark as synced (optional: track last sync time)
    await chrome.storage.sync.set({ lastSyncAt: Date.now() });
  } catch (error) {
    console.error('Error syncing data to backend:', error);
    // Don't throw - allow local storage to continue working
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTimeForDomain') {
    getTodayTimeForDomain(request.domain).then(time => {
      sendResponse({ time: time });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getCurrentSessionTime') {
    getCurrentSessionTime(request.domain).then(time => {
      sendResponse({ time: time });
    });
    return true;
  }

  // Save auth data - this persists even when popup closes during OAuth
  if (request.action === 'saveAuthData') {
    console.log('Background script: Received saveAuthData request', {
      hasAuthUser: !!request.authUser,
      hasAuthToken: !!request.authToken,
      userId: request.authUser?.id
    });
    
    // Use async IIFE to handle await
    (async () => {
      try {
        const authData = {
          authUser: request.authUser,
          authToken: request.authToken,
          refreshToken: request.refreshToken || null
        };
        
        console.log('Background script: Saving auth data to storage...');
        
        // Save to BOTH sync and local storage for reliability
        await Promise.all([
          chrome.storage.sync.set(authData).catch(err => {
            console.error('Background script: Sync save failed:', err);
            throw err;
          }),
          chrome.storage.local.set(authData).catch(err => {
            console.error('Background script: Local save failed:', err);
            throw err;
          })
        ]);
        
        console.log('Background script: Storage saves completed, verifying...');
        
        // Verify it was saved
        const [verifySync, verifyLocal] = await Promise.all([
          chrome.storage.sync.get(['authUser', 'authToken']),
          chrome.storage.local.get(['authUser', 'authToken'])
        ]);
        
        console.log('Background script: Verification results:', {
          syncHasUser: !!verifySync.authUser,
          syncHasToken: !!verifySync.authToken,
          localHasUser: !!verifyLocal.authUser,
          localHasToken: !!verifyLocal.authToken
        });
        
        const savedInSync = verifySync.authUser && verifySync.authToken;
        const savedInLocal = verifyLocal.authUser && verifyLocal.authToken;
        
        if (savedInSync || savedInLocal) {
          console.log('✓ Background script: Auth data saved successfully to', savedInSync ? 'sync' : 'local');
          // Update local state
          isAuthenticated = true;
          authToken = request.authToken;
          userId = request.authUser.id;
          
          // Notify any open popups that auth data was saved
          // This ensures popup updates even if it reopens after OAuth
          try {
            chrome.runtime.sendMessage({
              action: 'authDataSaved',
              location: savedInSync ? 'sync' : 'local'
            }).catch(err => {
              // Ignore errors if no popup is listening
              if (err.message && !err.message.includes('Could not establish connection')) {
                console.warn('Background script: Could not notify popup:', err);
              }
            });
          } catch (notifyError) {
            // Ignore if no popup open
          }
          
          sendResponse({ success: true, location: savedInSync ? 'sync' : 'local' });
        } else {
          console.error('✗ Background script: Auth data NOT saved! Verification failed.');
          console.error('Background script: Sync result:', verifySync);
          console.error('Background script: Local result:', verifyLocal);
          sendResponse({ success: false, error: 'Failed to verify save' });
        }
      } catch (error) {
        console.error('Background script: Error saving auth data:', error);
        console.error('Background script: Error stack:', error.stack);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (request.action === 'authStateChanged') {
    isAuthenticated = request.isAuthenticated;
    if (request.isAuthenticated) {
      authToken = request.token;
      userId = request.userId;
      startDataSync();
    } else {
      authToken = null;
      userId = null;
      stopDataSync();
    }
    sendResponse({ success: true });
    return true;
  }
});

