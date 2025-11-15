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

// Use chrome.alarms API for persistent periodic sync
// Alarms persist even when service worker is terminated (Manifest V3)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    console.log('Sync alarm fired, syncing data...');
    syncDataToBackend();
  }
});

// Initialize storage and load existing tabs
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated, initializing...');
  await initializeAllTabs();
  // Restart sync if authenticated
  await checkAuthOnStartup();
});

// Also initialize when extension starts (service worker wakes up)
chrome.runtime.onStartup.addListener(async () => {
  console.log('Service worker started, initializing...');
  await initializeAllTabs();
  // Restart sync if authenticated (service worker was terminated)
  await checkAuthOnStartup();
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
// Uses chrome.alarms API for persistence across service worker restarts
// This function restarts sync and should be called:
// 1. When auth state changes
// 2. When service worker wakes up (checkAuthOnStartup)
function startDataSync() {
  // Clear any existing sync interval (legacy)
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  if (!isAuthenticated || !authToken) {
    console.log('Cannot start sync: not authenticated');
    // Clear alarm if not authenticated
    chrome.alarms.clear('syncData');
    return;
  }

  console.log('Starting periodic data sync (every 30 seconds)...');
  
  // Clear any existing alarm first
  chrome.alarms.clear('syncData');
  
  // Sync immediately
  syncDataToBackend();
  
  // Create alarm that persists even when service worker terminates
  chrome.alarms.create('syncData', {
    periodInMinutes: 0.5 // 30 seconds (0.5 minutes)
  });
  
  console.log('✓ Sync alarm created (persists across service worker restarts)');
  
  // Also keep interval as backup (only runs while service worker is alive)
  syncInterval = setInterval(() => {
    if (isAuthenticated && authToken) {
      syncDataToBackend();
    } else {
      console.log('Sync stopped: no longer authenticated');
      stopDataSync();
    }
  }, 30 * 1000);
}

// Stop data sync
function stopDataSync() {
  // Clear interval
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  
  // Clear alarm
  chrome.alarms.clear('syncData');
  console.log('Sync stopped: interval and alarm cleared');
}

// Sync local data to backend
async function syncDataToBackend() {
  if (!isAuthenticated || !authToken || !SUPABASE_URL) {
    console.log('Sync skipped: not authenticated or missing config', {
      isAuthenticated,
      hasToken: !!authToken,
      hasUrl: !!SUPABASE_URL
    });
    return;
  }

  try {
    console.log(`[${new Date().toLocaleTimeString()}] Starting data sync to backend...`);
    
    // Get all local tracking data
    const result = await chrome.storage.local.get([storageKey]);
    const localData = result[storageKey] || {};

    if (Object.keys(localData).length === 0) {
      console.log('Sync skipped: no local data to sync');
      return;
    }
    
    console.log(`Local data found: ${Object.keys(localData).length} dates with tracking data`);

    // Transform data for backend
    const syncData = [];
    const currentTimestamp = new Date().toISOString();
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
            co2_grams: impact.co2_grams,
            synced_at: currentTimestamp
          });
        }
      }
    }

    if (syncData.length === 0) {
      console.log('Sync skipped: no data to sync (all zero seconds)');
      return;
    }

    console.log(`Syncing ${syncData.length} records to backend...`);

    // Use UPSERT for each record
    // For Supabase/PostgREST, we need to:
    // 1. Try PATCH first (update existing record)
    // 2. If 404/not found, use POST (insert new record)
    let successCount = 0;
    let errorCount = 0;
    
    // Process records one by one for better error handling
    for (const record of syncData) {
      try {
        // First, try to PATCH (update) existing record
        // Use the unique constraint columns in the query
        const patchUrl = `${SUPABASE_URL}/rest/v1/tracking_data?user_id=eq.${record.user_id}&date=eq.${record.date}&domain=eq.${encodeURIComponent(record.domain)}`;
        
        const patchResponse = await fetch(patchUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            total_seconds: record.total_seconds,
            energy_wh: record.energy_wh,
            water_liters: record.water_liters,
            co2_grams: record.co2_grams,
            synced_at: record.synced_at
          })
        });

        if (patchResponse.ok) {
          const updatedRecords = await patchResponse.json();
          // If we updated an existing record, success
          if (updatedRecords && updatedRecords.length > 0) {
            successCount++;
            continue; // Move to next record
          }
          // If PATCH returned 200 but empty array, record doesn't exist, try POST
        } else if (patchResponse.status === 404) {
          // PATCH 404 means record doesn't exist, try POST
          console.log(`Record not found, inserting new record for ${record.domain} on ${record.date}`);
        } else {
          // PATCH failed with other error, log and try POST anyway
          const patchError = await patchResponse.text();
          console.warn(`PATCH failed for ${record.domain}, trying POST:`, patchResponse.status, patchError);
        }
        
        // If PATCH didn't find a record (404 or empty), try POST (insert)
        const postResponse = await fetch(`${SUPABASE_URL}/rest/v1/tracking_data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(record)
        });

        if (postResponse.ok) {
          successCount++;
        } else {
          const errorText = await postResponse.text();
          const status = postResponse.status;
          
          // 409 Conflict = duplicate, means record exists (shouldn't happen after PATCH, but handle it)
          // 404 = table not found or RLS blocking
          if (status === 409) {
            // Record exists but PATCH didn't find it (race condition?) - retry PATCH
            console.warn(`409 Conflict for ${record.domain} on ${record.date} - record exists, retrying PATCH...`);
            // Retry PATCH with the full URL
            const retryPatchUrl = `${SUPABASE_URL}/rest/v1/tracking_data?user_id=eq.${record.user_id}&date=eq.${record.date}&domain=eq.${encodeURIComponent(record.domain)}`;
            const retryPatch = await fetch(retryPatchUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                'apikey': SUPABASE_ANON_KEY,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({
                total_seconds: record.total_seconds,
                energy_wh: record.energy_wh,
                water_liters: record.water_liters,
                co2_grams: record.co2_grams,
                synced_at: record.synced_at
              })
            });
            if (retryPatch.ok) {
              const retryResult = await retryPatch.json();
              if (retryResult && retryResult.length > 0) {
                console.log(`✓ Retry PATCH succeeded for ${record.domain}`);
                successCount++;
              } else {
                errorCount++;
              }
            } else {
              errorCount++;
            }
          } else if (status === 404) {
            console.error(`404: Table might not exist or RLS policy is blocking: ${record.domain} on ${record.date}`);
            errorCount++;
          } else {
            console.error(`Sync failed for ${record.domain} on ${record.date}:`, status, errorText);
            errorCount++;
          }
        }
      } catch (recordError) {
        console.error(`Error syncing record for ${record.domain}:`, recordError);
        errorCount++;
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (successCount > 0) {
      console.log(`✓ Sync complete: ${successCount} records synced, ${errorCount} failed at ${new Date().toLocaleTimeString()}`);
    } else if (errorCount > 0) {
      console.error(`✗ Sync failed: ${errorCount} records failed to sync at ${new Date().toLocaleTimeString()}`);
    } else {
      console.log(`Sync complete: No records to sync at ${new Date().toLocaleTimeString()}`);
    }

    // Mark as synced with timestamp
    const syncTimestamp = Date.now();
    await chrome.storage.local.set({ lastSyncAt: syncTimestamp });
    console.log(`Last sync timestamp saved: ${new Date(syncTimestamp).toLocaleTimeString()}`);
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

