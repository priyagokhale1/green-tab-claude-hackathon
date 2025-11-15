// Conversion factors
// 0.5 kg CO2 per kWh = 500g CO2 per 1000 Wh = 0.5g CO2 per Wh
// So 1g CO2 = 2 Wh
const CO2_TO_WH = 2; // Wh per gram CO2 (average)
// 1.0 L per kWh = 1.0 L per 1000 Wh = 0.001 L per Wh
const WH_TO_WATER = 0.001; // Liters per Wh (average, varies by region)

// Claude API configuration
// To use Claude API for intelligent equivalency comparisons:
// 1. Get your API key from https://console.anthropic.com/
// 2. Set CLAUDE_API_KEY below (for production, use secure storage/encryption)
// 3. If null, the extension will use local fallback calculations
const CLAUDE_API_KEY = null; // Set to your API key if you want to use Claude API
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
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const [tab] = tabs;
    
    if (!tab) {
      console.error('No tab returned from query');
      document.getElementById('current-domain').textContent = 'No tab found';
      showError('Unable to access current tab - no tab returned');
      return;
    }
    
    if (!tab.url) {
      console.error('Tab exists but has no URL');
      document.getElementById('current-domain').textContent = 'Tab has no URL';
      showError(`Unable to access tab URL. Tab ID: ${tab.id}`);
      return;
    }
    
    // Check if it's a special Chrome page
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      document.getElementById('current-domain').textContent = 'Chrome internal page';
      showError('Cannot check green hosting for Chrome internal pages');
      return;
    }

    // Extract domain from URL
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    // Store current domain for time updates
    // Reset carbon data if domain changed
    if (currentDomain !== domain) {
      storedCo2PerPageView = null;
      isEstimateValue = false;
    }
    currentDomain = domain;
    
    // Remove 'www.' prefix if present for cleaner display
    const displayDomain = domain.replace(/^www\./, '');
    document.getElementById('current-domain').textContent = displayDomain;

    // Get time spent on this domain
    const timeSpent = await getTimeForDomain(domain);
    updateTimeDisplay(timeSpent);

    // Start updating time every second
    startTimeUpdates();

    // Check green hosting status and get carbon data
    await Promise.all([
      checkGreenHosting(domain),
      checkWebsiteCarbon(tab.url, timeSpent)
    ]);
  } catch (error) {
    console.error('Error initializing popup:', error);
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
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Update UI based on response
    if (data.green === true) {
      statusElement.className = 'status-pill status-good';
      statusElement.innerHTML = `
        <span class="status-dot"></span>
        Green
      `;
    } else {
      statusElement.className = 'status-pill status-bad';
      statusElement.innerHTML = `
        <span class="status-dot"></span>
        Not Green
      `;
    }
  } catch (error) {
    console.error('Error checking green hosting:', error);
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
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
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
    
    // Convert to grams if it's in a different unit
    if (co2PerPageView > 100) {
      // Likely in milligrams, convert to grams
      co2PerPageView = co2PerPageView / 1000;
    }
    
    if (!co2PerPageView || co2PerPageView === 0) {
      // If API doesn't return usable data, use a default estimate
      // Average website: ~0.5g CO2 per page view
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
      console.error(`Error getting Claude equivalency for ${type}, falling back to local:`, error);
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
    energy: `Convert ${value} Wh (watt-hours) of energy consumption into a concise, relatable everyday comparison. 
    
Specifically compare it to: running a laptop (typical laptop uses 50W), charging phones, or other common devices.
Format: Start with "≈" followed by the comparison (e.g., "≈ X min of laptop usage" or "≈ X phone charges").
Keep it under 45 characters, use appropriate units (minutes/hours for time, count for charges), and make it easy to understand.
Output only the comparison text, nothing else.`,
    
    water: `Convert ${value} L (liters) of water consumption into a concise, relatable everyday comparison.
    
Specifically compare it to: standard water bottles (500ml each), glasses of water, or other common water containers.
Format: Start with "≈" followed by the comparison (e.g., "≈ X water bottles" or "≈ X glasses of water").
Keep it under 45 characters, use whole numbers or 1 decimal place, and make it easy to understand.
Output only the comparison text, nothing else.`,
    
    co2: `Convert ${value} g (grams) of CO₂ emissions into a concise, relatable everyday comparison.
    
Specifically compare it to: miles/kilometers driven in a typical car (average car emits ~120g CO2 per km or ~193g per mile).
Format: Start with "≈" followed by the comparison (e.g., "≈ X km in a car" or "≈ X miles driven").
Keep it under 45 characters, use appropriate distance units, and make it easy to understand.
Output only the comparison text, nothing else.`
  };

  try {
    const requestBody = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 60,
      messages: [{
        role: 'user',
        content: prompts[type]
      }]
    };

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Extract text from response - handle different possible response formats
    let equivalencyText = '';
    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      if (typeof data.content[0].text === 'string') {
        equivalencyText = data.content[0].text.trim();
      } else if (data.content[0].type === 'text' && data.content[0].text) {
        equivalencyText = data.content[0].text.trim();
      }
    }
    
    // Validate the response format
    if (!equivalencyText || equivalencyText.length === 0) {
      throw new Error('Invalid response format from Claude API');
    }
    
    // Ensure it starts with ≈ for consistency
    if (!equivalencyText.startsWith('≈') && !equivalencyText.startsWith('~')) {
      equivalencyText = '≈ ' + equivalencyText;
    }
    
    return equivalencyText;
  } catch (error) {
    console.error(`Claude API request failed for ${type}:`, error);
    throw error; // Re-throw to trigger fallback
  }
}

// Local fallback equivalency calculations
// These provide consistent, relatable comparisons when Claude API is unavailable
function getLocalEquivalency(type, value) {
  if (type === 'energy') {
    // Energy: Laptop comparison
    // Typical laptop uses ~50W (0.05 kW), so 1 Wh = 1/50 hours = 0.02 hours = 1.2 minutes
    const laptopMinutes = value * 1.2;
    
    if (laptopMinutes < 1) {
      return '≈ <1 min of laptop usage';
    } else if (laptopMinutes < 60) {
      // Round to nearest minute for readability
      const minutes = Math.round(laptopMinutes);
      return `≈ ${minutes} min of laptop usage`;
    } else {
      const hours = (laptopMinutes / 60).toFixed(1);
      // Remove trailing zero if whole number
      const displayHours = parseFloat(hours) === parseInt(hours) ? parseInt(hours) : hours;
      return `≈ ${displayHours} hr${displayHours === 1 ? '' : 's'} of laptop usage`;
    }
  } else if (type === 'water') {
    // Water: Water bottle comparison
    // Standard water bottle = 500 mL (0.5 L)
    const bottles = value / 0.5;
    
    if (value < 0.01) {
      return '≈ a few drops';
    } else if (value < 0.05) {
      return '≈ a spoonful';
    } else if (value < 0.2) {
      return '≈ a small glass';
    } else if (bottles < 0.5) {
      return '≈ half a water bottle';
    } else if (bottles < 1) {
      return '≈ one water bottle';
    } else if (bottles < 10) {
      // Show 1 decimal place for small numbers
      const displayBottles = bottles.toFixed(1);
      const cleanBottles = parseFloat(displayBottles) === parseInt(displayBottles) 
        ? parseInt(displayBottles) 
        : displayBottles;
      return `≈ ${cleanBottles} water bottle${cleanBottles === 1 ? '' : 's'}`;
    } else {
      // Round to whole number for larger amounts
      const wholeBottles = Math.round(bottles);
      return `≈ ${wholeBottles} water bottles`;
    }
  } else if (type === 'co2') {
    // CO2: Car driving comparison
    // Average car emits ~120g CO2 per km (or ~193g per mile)
    // Using metric: 120g CO2 per km
    const km = value / 120;
    
    if (km < 0.001) {
      return '≈ <0.001 km in a car';
    } else if (km < 0.01) {
      return `≈ ${km.toFixed(3)} km in a car`;
    } else if (km < 1) {
      // Show 2-3 decimals for small distances
      return `≈ ${km.toFixed(2)} km in a car`;
    } else if (km < 100) {
      // Show 1-2 decimals for medium distances
      const displayKm = km.toFixed(1);
      const cleanKm = parseFloat(displayKm) === parseInt(displayKm) 
        ? parseInt(displayKm) 
        : displayKm;
      return `≈ ${cleanKm} km in a car`;
    } else {
      // Round to whole number for large distances
      return `≈ ${Math.round(km)} km in a car`;
    }
  }
  return '';
}

// Update equivalencies for all metrics
async function updateEquivalencies(energyWh, waterLiters, co2Grams) {
  const energyEl = document.getElementById('energy-equivalency');
  const waterEl = document.getElementById('water-equivalency');
  const co2El = document.getElementById('co2-equivalency');

  try {
    // Update all equivalencies in parallel
    // Each getEquivalency will fallback to local calculation on error, so Promise.all is safe
    const [energyEquiv, waterEquiv, co2Equiv] = await Promise.all([
      getEquivalency('energy', energyWh).catch(err => {
        console.error('Error getting energy equivalency:', err);
        return getLocalEquivalency('energy', energyWh);
      }),
      getEquivalency('water', waterLiters).catch(err => {
        console.error('Error getting water equivalency:', err);
        return getLocalEquivalency('water', waterLiters);
      }),
      getEquivalency('co2', co2Grams).catch(err => {
        console.error('Error getting CO2 equivalency:', err);
        return getLocalEquivalency('co2', co2Grams);
      })
    ]);

    if (energyEl) energyEl.textContent = energyEquiv || '≈ calculating...';
    if (waterEl) waterEl.textContent = waterEquiv || '≈ calculating...';
    if (co2El) co2El.textContent = co2Equiv || '≈ calculating...';
  } catch (error) {
    console.error('Error updating equivalencies:', error);
    // Fallback to local calculations for all metrics
    if (energyEl) energyEl.textContent = getLocalEquivalency('energy', energyWh);
    if (waterEl) waterEl.textContent = getLocalEquivalency('water', waterLiters);
    if (co2El) co2El.textContent = getLocalEquivalency('co2', co2Grams);
  }
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
