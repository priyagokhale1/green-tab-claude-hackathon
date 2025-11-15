// Background script to track time spent on each domain across all tabs

// Store tracking data for all tabs: { tabId: { domain, startTime } }
let trackedTabs = new Map();

// Storage structure: { date: { domain: totalSeconds } }
const storageKey = 'greenTabTracking';

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
});

