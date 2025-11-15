// Conversion factors
// 0.5 kg CO2 per kWh = 500g CO2 per 1000 Wh = 0.5g CO2 per Wh
// So 1g CO2 = 2 Wh
const CO2_TO_WH = 2; // Wh per gram CO2 (average)
// 1.0 L per kWh = 1.0 L per 1000 Wh = 0.001 L per Wh
const WH_TO_WATER = 0.001; // Liters per Wh (average, varies by region)

// Claude API configuration (set your API key here or use environment variable)
// For production, you'd want to store this securely
const CLAUDE_API_KEY = null; // Set this to your Claude API key if you have one
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Cache for equivalencies to avoid too many API calls
let equivalencyCache = new Map();

// Store current domain and update interval
let currentDomain = null;
let timeUpdateInterval = null;
// Store carbon data for real-time updates
let storedCo2PerPageView = null;
let isEstimateValue = false;
// Store last time for smooth updates
let lastTimeSpent = 0;
let lastUpdateTime = Date.now();

// Get current active tab and check green hosting status
async function initPopup() {
  console.log('=== GreenTab Popup Initialized ===');
  
  try {
    console.log('Attempting to query tabs...');
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Tabs query result:', tabs);
    console.log('Number of tabs returned:', tabs.length);
    
    const [tab] = tabs;
    console.log('First tab object:', tab);
    console.log('Tab URL:', tab?.url);
    console.log('Tab ID:', tab?.id);
    console.log('Tab title:', tab?.title);
    
    if (!tab) {
      console.error('No tab returned from query');
      document.getElementById('current-domain').textContent = 'No tab found';
      showError('Unable to access current tab - no tab returned');
      return;
    }
    
    if (!tab.url) {
      console.error('Tab exists but has no URL. Tab object:', JSON.stringify(tab, null, 2));
      document.getElementById('current-domain').textContent = 'Tab has no URL';
      showError(`Unable to access tab URL. Tab ID: ${tab.id}`);
      return;
    }

    console.log('Tab URL found:', tab.url);
    
    // Check if it's a special Chrome page
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      console.log('Special Chrome page detected');
      document.getElementById('current-domain').textContent = 'Chrome internal page';
      showError('Cannot check green hosting for Chrome internal pages');
      return;
    }

    // Extract domain from URL
    console.log('Parsing URL:', tab.url);
    const url = new URL(tab.url);
    const domain = url.hostname;
    console.log('Extracted domain:', domain);
    
    // Store current domain for time updates
    // Reset carbon data if domain changed
    if (currentDomain !== domain) {
      storedCo2PerPageView = null;
      isEstimateValue = false;
    }
    currentDomain = domain;
    
    // Remove 'www.' prefix if present for cleaner display
    const displayDomain = domain.replace(/^www\./, '');
    console.log('Display domain:', displayDomain);
    document.getElementById('current-domain').textContent = displayDomain;

    // Get time spent on this domain
    const timeSpent = await getTimeForDomain(domain);
    console.log('Time spent on domain (seconds):', timeSpent);
    updateTimeDisplay(timeSpent);

    // Start updating time every second
    startTimeUpdates();

    // Check green hosting status and get carbon data
    console.log('Checking green hosting for domain:', domain);
    await Promise.all([
      checkGreenHosting(domain),
      checkWebsiteCarbon(tab.url, timeSpent)
    ]);
  } catch (error) {
    console.error('Error initializing popup:', error);
    console.error('Error stack:', error.stack);
    showError(`Error loading extension: ${error.message}`);
  }
}

// Get time spent on domain from background script
async function getTimeForDomain(domain) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getTimeForDomain',
      domain: domain
    });
    return response?.time || 0;
  } catch (error) {
    console.error('Error getting time for domain:', error);
    return 0;
  }
}

// Start updating time display frequently for smooth decimal changes
function startTimeUpdates() {
  // Clear any existing interval
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
  }
  
  // Update immediately
  updateTimeFromBackground();
  lastUpdateTime = Date.now();
  
  // Update every 100ms (10 times per second) for smooth decimal changes
  timeUpdateInterval = setInterval(() => {
    updateTimeFromBackground();
  }, 100);
}

// Stop time updates
function stopTimeUpdates() {
  if (timeUpdateInterval) {
    clearInterval(timeUpdateInterval);
    timeUpdateInterval = null;
  }
}

// Update time display by fetching from background
async function updateTimeFromBackground() {
  if (!currentDomain) return;
  
  try {
    const timeSpent = await getTimeForDomain(currentDomain);
    updateTimeDisplay(timeSpent);
    
    // Also update impact stats if we have carbon data
    // Use linear interpolation for smooth real-time updates
    if (storedCo2PerPageView !== null) {
      const now = Date.now();
      
      // If time changed from background, reset interpolation base
      if (timeSpent !== lastTimeSpent) {
        lastTimeSpent = timeSpent;
        lastUpdateTime = now;
      }
      
      // Calculate elapsed time since last background update
      const elapsedSeconds = (now - lastUpdateTime) / 1000;
      
      // Use interpolated time for smooth decimal changes
      const interpolatedTime = timeSpent + elapsedSeconds;
      updateImpactDisplay(interpolatedTime);
    }
  } catch (error) {
    console.error('Error updating time:', error);
  }
}

// Update time display
function updateTimeDisplay(seconds) {
  const timeElement = document.getElementById('time-spent');
  if (!timeElement) return;
  
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    timeElement.textContent = `${hours}h ${remainingMinutes} min ${remainingSeconds} sec today`;
  } else if (minutes > 0) {
    timeElement.textContent = `${minutes} min ${remainingSeconds} sec today`;
  } else {
    timeElement.textContent = `${remainingSeconds} sec today`;
  }
}

// Check if domain is on green hosting using Greencheck API
async function checkGreenHosting(domain) {
  const statusElement = document.getElementById('green-hosting-status');
  
  try {
    const apiUrl = `https://api.thegreenwebfoundation.org/greencheck/${encodeURIComponent(domain)}`;
    console.log('Calling Greencheck API:', apiUrl);
    
    // Call Greencheck API
    const response = await fetch(apiUrl);
    console.log('API response status:', response.status);
    console.log('API response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    console.log('Is green?', data.green);
    
    // Update UI based on response
    if (data.green === true) {
      console.log('Domain is on green hosting!');
      statusElement.className = 'status-pill status-good';
      statusElement.innerHTML = `
        <span class="status-dot"></span>
        Green
      `;
    } else {
      console.log('Domain is not on green hosting');
      statusElement.className = 'status-pill status-bad';
      statusElement.innerHTML = `
        <span class="status-dot"></span>
        Not Green
      `;
    }
  } catch (error) {
    console.error('Error checking green hosting:', error);
    console.error('Error stack:', error.stack);
    statusElement.className = 'status-pill status-loading';
    statusElement.innerHTML = `
      <span class="status-dot"></span>
      Unknown
    `;
  }
}

// Check Website Carbon API and calculate energy/water consumption
async function checkWebsiteCarbon(url, timeSpentSeconds) {
  const impactElement = document.getElementById('impact-stats');
  if (!impactElement) return;
  
  impactElement.className = 'card loading';
  impactElement.innerHTML = `
    <span class="loading-spinner"></span>
    <span>Calculating environmental impact...</span>
  `;
  
  try {
    // Call Website Carbon API
    const apiUrl = `https://api.websitecarbon.com/site?url=${encodeURIComponent(url)}`;
    console.log('Calling Website Carbon API:', apiUrl);
    
    const response = await fetch(apiUrl);
    console.log('Website Carbon API response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Website Carbon API response data:', data);
    
    // Extract carbon per page view (in grams CO2)
    // Try multiple possible response formats
    let co2PerPageView = 0;
    
    // Common response formats:
    // - data.c (direct carbon value)
    // - data.statistics.co2.grid.grams
    // - data.carbon
    // - data.url (with nested data)
    if (data.c) {
      co2PerPageView = data.c;
    } else if (data.statistics?.co2?.grid?.grams) {
      co2PerPageView = data.statistics.co2.grid.grams;
    } else if (data.carbon) {
      co2PerPageView = data.carbon;
    } else if (data.url && data.url.statistics?.co2?.grid?.grams) {
      co2PerPageView = data.url.statistics.co2.grid.grams;
    } else if (typeof data === 'number') {
      co2PerPageView = data;
    }
    
    console.log('Extracted CO2 per page view (grams):', co2PerPageView);
    
    // Convert to grams if it's in a different unit
    if (co2PerPageView > 100) {
      // Likely in milligrams, convert to grams
      co2PerPageView = co2PerPageView / 1000;
    }
    
    if (!co2PerPageView || co2PerPageView === 0) {
      // If API doesn't return usable data, use a default estimate
      // Average website: ~0.5g CO2 per page view
      console.log('Using default CO2 estimate');
      const defaultCo2PerPage = 0.5;
      storedCo2PerPageView = defaultCo2PerPage;
      isEstimateValue = true;
      calculateAndDisplayImpact(defaultCo2PerPage, timeSpentSeconds, true);
    } else {
      storedCo2PerPageView = co2PerPageView;
      isEstimateValue = false;
      calculateAndDisplayImpact(co2PerPageView, timeSpentSeconds, false);
    }
  } catch (error) {
    console.error('Error checking Website Carbon:', error);
    console.error('Error stack:', error.stack);
    
    // Fallback: use default estimate
    const defaultCo2PerPage = 0.5; // grams CO2 per page view
    storedCo2PerPageView = defaultCo2PerPage;
    isEstimateValue = true;
    calculateAndDisplayImpact(defaultCo2PerPage, timeSpentSeconds, true);
  }
}

// Calculate and display energy/water impact
async function calculateAndDisplayImpact(co2PerPageGrams, timeSpentSeconds, isEstimate) {
  const impactElement = document.getElementById('impact-stats');
  
  // Estimate page views per minute (average browsing: ~2-3 pages per minute)
  const pagesPerMinute = 2.5;
  const minutesSpent = timeSpentSeconds / 60;
  const estimatedPageViews = Math.max(1, Math.floor(minutesSpent * pagesPerMinute));
  
  // Total CO2 in grams
  const totalCo2Grams = co2PerPageGrams * estimatedPageViews;
  
  // Convert CO2 to energy (Wh)
  // Using average: 1g CO2 = 2 Wh
  const energyWh = totalCo2Grams * CO2_TO_WH;
  
  // Convert energy to water (Liters)
  const waterLiters = energyWh * WH_TO_WATER;
  
  console.log('Calculated impact:', {
    pageViews: estimatedPageViews,
    co2Grams: totalCo2Grams,
    energyWh: energyWh,
    waterLiters: waterLiters
  });
  
  // Format numbers for display
  const formatNumber = (num, decimals = 2) => {
    if (num < 0.01) return '<0.01';
    return num.toFixed(decimals);
  };
  
  impactElement.className = 'card';
  impactElement.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-title">Environmental impact</div>
        <div class="card-subtitle">Live estimate</div>
      </div>
      ${isEstimate ? '<span class="chip chip-soft">Estimate</span>' : ''}
    </div>
    <div class="metrics">
      <div class="metric">
        <div>
          <div class="metric-label">
            <span class="metric-dot energy"></span>
            Energy
          </div>
          <div class="metric-equivalency" id="energy-equivalency">Calculating...</div>
        </div>
        <div class="metric-value" id="energy-value">${formatNumber(energyWh)} Wh</div>
      </div>
      <div class="metric">
        <div>
          <div class="metric-label">
            <span class="metric-dot water"></span>
            Water
          </div>
          <div class="metric-equivalency" id="water-equivalency">Calculating...</div>
        </div>
        <div class="metric-value" id="water-value">${formatNumber(waterLiters)} L</div>
      </div>
      <div class="metric">
        <div>
          <div class="metric-label">
            <span class="metric-dot carbon"></span>
            CO₂
          </div>
          <div class="metric-equivalency" id="co2-equivalency">Calculating...</div>
        </div>
        <div class="metric-value" id="co2-value">${formatNumber(totalCo2Grams)} g</div>
      </div>
    </div>
    <div class="card-footer" id="impact-note">
      Based on ${estimatedPageViews} estimated page view${estimatedPageViews !== 1 ? 's' : ''} over ${Math.round(minutesSpent)} minute${Math.round(minutesSpent) !== 1 ? 's' : ''}.
    </div>
  `;
  
  // Get equivalencies for the metrics
  await updateEquivalencies(energyWh, waterLiters, totalCo2Grams);
}

// Get equivalency from Claude API or use local fallback
async function getEquivalency(type, value) {
  // Check cache first
  const cacheKey = `${type}-${value.toFixed(3)}`;
  if (equivalencyCache.has(cacheKey)) {
    return equivalencyCache.get(cacheKey);
  }

  // Try Claude API if key is available
  if (CLAUDE_API_KEY) {
    try {
      const equivalency = await getClaudeEquivalency(type, value);
      equivalencyCache.set(cacheKey, equivalency);
      return equivalency;
    } catch (error) {
      console.error(`Error getting Claude equivalency for ${type}:`, error);
      // Fall through to local calculation
    }
  }

  // Fallback to local calculation
  const equivalency = getLocalEquivalency(type, value);
  equivalencyCache.set(cacheKey, equivalency);
  return equivalency;
}

// Get equivalency from Claude API
async function getClaudeEquivalency(type, value) {
  const prompts = {
    energy: `Convert ${value} Wh of energy consumption into a relatable everyday comparison. Examples: "running a laptop for X minutes", "charging a phone X times", "powering a light bulb for X hours". Keep it concise (max 40 characters), start with "≈", and make it relatable.`,
    water: `Convert ${value} L of water consumption into a relatable everyday comparison. Examples: "one water bottle", "a glass of water", "a few drops", "a spoonful". Keep it concise (max 40 characters), start with "≈", and make it relatable.`,
    co2: `Convert ${value} g of CO₂ emissions into a relatable everyday comparison. Examples: "X km in a car", "X minutes of driving", "X km of walking". Keep it concise (max 40 characters), start with "≈", and make it relatable.`
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: prompts[type]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text.trim();
}

// Local fallback equivalency calculations
function getLocalEquivalency(type, value) {
  if (type === 'energy') {
    // Energy: 1 Wh ≈ 0.001 kWh
    // Laptop uses ~50W, so 1 Wh = 0.02 hours = 1.2 minutes
    const laptopMinutes = Math.round(value * 1.2);
    if (laptopMinutes < 1) {
      return '≈ <1 min of laptop usage';
    } else if (laptopMinutes < 60) {
      return `≈ ${laptopMinutes} min of laptop usage`;
    } else {
      const hours = (laptopMinutes / 60).toFixed(1);
      return `≈ ${hours} hours of laptop usage`;
    }
  } else if (type === 'water') {
    // Water: 1 L = 1000 mL
    // Standard water bottle = 500 mL
    if (value < 0.01) {
      return '≈ a few drops';
    } else if (value < 0.05) {
      return '≈ a spoonful';
    } else if (value < 0.2) {
      return '≈ a small glass';
    } else if (value < 0.5) {
      return '≈ half a water bottle';
    } else if (value < 1) {
      return '≈ one water bottle';
    } else {
      const bottles = (value / 0.5).toFixed(1);
      return `≈ ${bottles} water bottles`;
    }
  } else if (type === 'co2') {
    // CO2: Average car emits ~120g CO2 per km
    const km = (value / 120).toFixed(2);
    if (km < 0.01) {
      return '≈ <0.01 km in a car';
    } else if (km < 1) {
      return `≈ ${km} km in a car`;
    } else {
      return `≈ ${km} km in a car`;
    }
  }
  return '';
}

// Update equivalencies for all metrics
async function updateEquivalencies(energyWh, waterLiters, co2Grams) {
  const energyEl = document.getElementById('energy-equivalency');
  const waterEl = document.getElementById('water-equivalency');
  const co2El = document.getElementById('co2-equivalency');

  // Update all equivalencies in parallel
  const [energyEquiv, waterEquiv, co2Equiv] = await Promise.all([
    getEquivalency('energy', energyWh),
    getEquivalency('water', waterLiters),
    getEquivalency('co2', co2Grams)
  ]);

  if (energyEl) energyEl.textContent = energyEquiv;
  if (waterEl) waterEl.textContent = waterEquiv;
  if (co2El) co2El.textContent = co2Equiv;
}

// Update only the impact numbers without re-rendering the whole section
function updateImpactDisplay(timeSpentSeconds) {
  if (storedCo2PerPageView === null) return;
  
  const impactElement = document.getElementById('impact-stats');
  if (!impactElement) return;
  
  // Calculate new values using continuous time (not floored page views)
  const pagesPerMinute = 2.5;
  const minutesSpent = timeSpentSeconds / 60;
  // Use continuous page views for smooth decimal changes
  const continuousPageViews = Math.max(0.1, minutesSpent * pagesPerMinute);
  const totalCo2Grams = storedCo2PerPageView * continuousPageViews;
  const energyWh = totalCo2Grams * CO2_TO_WH;
  const waterLiters = energyWh * WH_TO_WATER;
  
  // Format numbers for display with more decimals for smooth changes
  const formatNumber = (num, decimals = 3) => {
    if (num < 0.001) return '<0.001';
    return num.toFixed(decimals);
  };
  
  // Update only the number values
  const energyElement = document.getElementById('energy-value');
  const waterElement = document.getElementById('water-value');
  const co2Element = document.getElementById('co2-value');
  const noteElement = document.getElementById('impact-note');
  
  if (energyElement) energyElement.textContent = `${formatNumber(energyWh)} Wh`;
  if (waterElement) waterElement.textContent = `${formatNumber(waterLiters)} L`;
  if (co2Element) co2Element.textContent = `${formatNumber(totalCo2Grams)} g`;
  if (noteElement) {
    const estimatedPageViews = Math.floor(continuousPageViews);
    noteElement.textContent = `Based on ${estimatedPageViews} estimated page view${estimatedPageViews !== 1 ? 's' : ''} over ${Math.round(minutesSpent)} minute${Math.round(minutesSpent) !== 1 ? 's' : ''}.`;
  }
  
  // Update equivalencies (throttle to avoid too many API calls)
  const now = Date.now();
  if (!window.lastEquivalencyUpdate || now - window.lastEquivalencyUpdate > 2000) {
    window.lastEquivalencyUpdate = now;
    updateEquivalencies(energyWh, waterLiters, totalCo2Grams).catch(err => {
      console.error('Error updating equivalencies:', err);
    });
  }
}

function showError(message) {
  const statusElement = document.getElementById('green-hosting-status');
  statusElement.className = 'status-pill status-loading';
  statusElement.innerHTML = `
    <span class="status-dot"></span>
    Error
  `;
}

// Clean up when popup is closed
window.addEventListener('beforeunload', () => {
  stopTimeUpdates();
});

// Also clean up on visibility change (when popup loses focus)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopTimeUpdates();
  } else if (currentDomain) {
    // Restart updates if popup becomes visible again
    startTimeUpdates();
  }
});

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}
