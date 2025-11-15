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
// TEMPORARILY DISABLED FOR DEBUGGING
const CLAUDE_API_KEY = null; // Disabled to debug sign-in issues
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Supabase/Backend configuration
// Set these values when you set up your backend
const SUPABASE_URL = 'https://taaadgsnajjsmpidtusz.supabase.co'; // e.g., 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYWFkZ3NuYWpqc21waWR0dXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMDk5ODEsImV4cCI6MjA3ODc4NTk4MX0.QKFSl_WlrGVT8Wp3RsJWrqOC3WyEPmCi54xIinydBns'; // e.g., 'your-anon-key-here'
// If these are empty, authentication will be disabled

// Chrome Storage Adapter for Supabase
// This allows Supabase sessions to persist across popup/service worker restarts
const chromeStorageAdapter = {
  getItem: (key) => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        resolve(result[key] ?? null);
      });
    });
  },
  
  setItem: (key, value) => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  },
  
  removeItem: (key) => {
    return new Promise((resolve) => {
      chrome.storage.local.remove([key], () => {
        resolve();
      });
    });
  },
};

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

// Authentication state
let authUser = null;
let supabaseClient = null;

// Initialize Supabase client with Chrome storage adapter
// This ensures sessions persist across popup/service worker restarts
function initSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  
  // Check if Supabase is available (from CDN)
  let supabaseLib = null;
  
  // Try window.supabase first (CDN usually attaches it here)
  if (typeof window !== 'undefined' && window.supabase) {
    supabaseLib = window.supabase;
  } 
  // Try global supabase
  else if (typeof supabase !== 'undefined') {
    supabaseLib = supabase;
  }
  
  if (supabaseLib && supabaseLib.createClient) {
    try {
      // Create client with Chrome storage adapter for persistence
      const client = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          storage: chromeStorageAdapter,
          autoRefreshToken: true,
        },
      });
      console.log('✓ Supabase client created with Chrome storage adapter');
      return client;
    } catch (error) {
      console.error('Error creating Supabase client:', error);
      return null;
    }
  }
  
  console.warn('Supabase client not available. Make sure the CDN script is loaded before popup.js');
  return null;
}

// Check authentication status using Supabase session
// This uses Supabase's built-in session management with Chrome storage
async function checkAuthStatus(retryCount = 0, maxRetries = 3) {
  try {
    // If Supabase client is available, use its session management
    if (supabaseClient && supabaseClient.auth) {
      console.log(`checkAuthStatus: Using Supabase session (attempt ${retryCount + 1}/${maxRetries + 1})`);
      
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error('checkAuthStatus: Supabase session error:', error);
        authUser = null;
        return false;
      }
      
      if (session && session.user) {
        // Extract user info from Supabase session
        authUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || 
                session.user.user_metadata?.name || 
                session.user.email?.split('@')[0],
          avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
        };
        console.log('checkAuthStatus: ✓ User found via Supabase session:', {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name
        });
        return true;
      } else {
        console.log('checkAuthStatus: ✗ No Supabase session found');
        authUser = null;
        return false;
      }
    }
    
    // Fallback: Check manual storage (for backward compatibility)
    console.log(`checkAuthStatus: Checking chrome.storage (fallback, attempt ${retryCount + 1}/${maxRetries + 1})`);
    
    const [syncResult, localResult] = await Promise.all([
      chrome.storage.sync.get(['authUser', 'authToken', 'refreshToken']),
      chrome.storage.local.get(['authUser', 'authToken', 'refreshToken'])
    ]);
    
    console.log('checkAuthStatus: sync storage keys:', Object.keys(syncResult));
    console.log('checkAuthStatus: local storage keys:', Object.keys(localResult));
    
    let result = null;
    if (localResult.authUser && localResult.authToken) {
      result = localResult;
      console.log('checkAuthStatus: Found auth data in local storage (fallback)');
    } else if (syncResult.authUser && syncResult.authToken) {
      result = syncResult;
      console.log('checkAuthStatus: Found auth data in sync storage (fallback)');
    }
    
    if (result && result.authUser && result.authToken) {
      authUser = result.authUser;
      console.log('checkAuthStatus: ✓ User found (fallback):', {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name
      });
      return true;
    } else {
      // Retry if not found and we haven't exceeded max retries
      if (retryCount < maxRetries) {
        const delay = (retryCount + 1) * 500;
        console.log(`checkAuthStatus: ✗ No user found, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return checkAuthStatus(retryCount + 1, maxRetries);
      }
      
      console.log('checkAuthStatus: ✗ No user found after', maxRetries + 1, 'attempts');
      authUser = null;
      return false;
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    
    if (retryCount < maxRetries) {
      const delay = (retryCount + 1) * 500;
      console.log(`checkAuthStatus: Error occurred, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return checkAuthStatus(retryCount + 1, maxRetries);
    }
    
    authUser = null;
    return false;
  }
}

// Sign in with Google using OAuth
async function signInWithGoogle() {
  console.log('=== signInWithGoogle STARTED ===');
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    alert('Authentication is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in popup.js');
    return;
  }

  try {
    // Get extension redirect URL (Chrome requires this to be configured in Google Console)
    const extensionRedirectUrl = chrome.identity.getRedirectURL();
    console.log('Extension redirect URL:', extensionRedirectUrl);
    
    // For Chrome extensions: use the extension redirect URL
    // Then exchange the code with Supabase to get tokens
    const supabaseCallbackUrl = `${SUPABASE_URL}/auth/v1/callback`;
    console.log('Supabase callback URL:', supabaseCallbackUrl);
    
    // Use extension redirect URL for Chrome OAuth flow
    // We'll handle the callback and exchange with Supabase
    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(extensionRedirectUrl)}&apikey=${SUPABASE_ANON_KEY}`;
    console.log('Full Auth URL:', authUrl);
    
    // Launch OAuth flow
    console.log('Launching OAuth flow...');
    let responseUrl;
    try {
      responseUrl = await new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          {
            url: authUrl,
            interactive: true
          },
          (callbackUrl) => {
            const error = chrome.runtime.lastError;
            if (error) {
              const errorMsg = error.message || String(error);
              console.error('=== OAuth Flow Error ===');
              console.error('Error message:', errorMsg);
              console.error('Full error object:', error);
              
              // Handle specific error cases
              if (errorMsg.includes('Authorization page could not be loaded') || errorMsg.includes('could not be loaded')) {
                const helpfulMsg = `OAuth Configuration Error:\n\nThe extension redirect URL must be configured in TWO places:\n\n1. Google Cloud Console:\n   - Go to APIs & Services > Credentials\n   - Edit your OAuth 2.0 Client\n   - Add to "Authorized redirect URIs":\n     ${extensionRedirectUrl}\n\n2. Supabase Dashboard:\n   - Go to Authentication > URL Configuration\n   - Add to "Redirect URLs":\n     ${extensionRedirectUrl}\n\nSee FIX_REDIRECT_URI_MISMATCH.md for detailed instructions.`;
                console.error('=== OAuth Configuration Required ===');
                console.error('Extension Redirect URL:', extensionRedirectUrl);
                console.error('This URL must be configured in both Google Cloud Console and Supabase');
                alert(helpfulMsg);
                reject(new Error(errorMsg));
              } else {
                reject(new Error(errorMsg));
              }
            } else if (!callbackUrl) {
              console.error('OAuth flow returned empty URL');
              reject(new Error('OAuth flow completed but no callback URL received'));
            } else {
              console.log('✓ OAuth flow completed successfully');
              resolve(callbackUrl);
            }
          }
        );
      });
    } catch (flowError) {
      console.error('OAuth flow promise rejected:', flowError);
      throw flowError;
    }

    // Extract tokens from response URL
    console.log('=== OAuth Callback Received ===');
    console.log('OAuth response URL:', responseUrl);
    console.log('OAuth response URL length:', responseUrl?.length || 0);
    
    if (!responseUrl) {
      throw new Error('No response URL received from OAuth flow');
    }
    
    // Check if response URL contains Supabase callback (might redirect to extension URL)
    let accessToken = null;
    let refreshToken = null;
    let finalCallbackUrl = responseUrl;
    
    // If response URL is the extension redirect URL, we need to extract from fragment
    // Supabase might put tokens in URL fragment or query params
    try {
      const url = new URL(responseUrl);
      
      // Check hash/fragment first (most common for OAuth)
      if (url.hash && url.hash.length > 1) {
        const hash = url.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        accessToken = hashParams.get('access_token') || hashParams.get('#access_token');
        refreshToken = hashParams.get('refresh_token');
        
        // Also check for URL-encoded fragments
        if (!accessToken) {
          const decoded = decodeURIComponent(hash);
          const decodedParams = new URLSearchParams(decoded);
          accessToken = decodedParams.get('access_token');
          refreshToken = decodedParams.get('refresh_token');
        }
      }
      
      // Check query parameters as fallback
      if (!accessToken && url.search) {
        const searchParams = new URLSearchParams(url.search);
        accessToken = searchParams.get('access_token');
        refreshToken = searchParams.get('refresh_token');
      }
      
      // Check if URL contains Supabase callback (redirected back from Supabase)
      if (!accessToken && (url.hostname.includes('supabase.co') || url.pathname.includes('/auth/v1/callback'))) {
        // Supabase callback - tokens might be in different format
        const allParams = new URLSearchParams(url.search + url.hash.substring(1));
        accessToken = allParams.get('access_token');
        refreshToken = allParams.get('refresh_token');
      }
    } catch (urlError) {
      console.error('Error parsing OAuth URL:', urlError);
      // Try manual parsing as last resort
      const match = responseUrl.match(/[#&]access_token=([^&]*)/);
      if (match) {
        accessToken = decodeURIComponent(match[1]);
      }
      const refreshMatch = responseUrl.match(/[#&]refresh_token=([^&]*)/);
      if (refreshMatch) {
        refreshToken = decodeURIComponent(refreshMatch[1]);
      }
    }

    console.log('Extracted accessToken:', accessToken ? `Found (${accessToken.substring(0, 20)}...)` : 'Not found');
    console.log('Extracted refreshToken:', refreshToken ? 'Found' : 'Not found');
    
    // If still no token, log full URL for debugging (truncated)
    if (!accessToken) {
      console.error('Could not extract token from URL');
      console.error('URL hostname:', new URL(responseUrl).hostname);
      console.error('URL pathname:', new URL(responseUrl).pathname);
      console.error('URL hash:', new URL(responseUrl).hash?.substring(0, 100));
      console.error('URL search:', new URL(responseUrl).search);
      throw new Error('No access token received from OAuth flow. Check console for URL details.');
    }

    // Get user info
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const user = await userResponse.json();

    // Extract name from user metadata (Google provides full_name or name)
    let userName = null;
    if (user.user_metadata?.full_name) {
      userName = user.user_metadata.full_name;
    } else if (user.user_metadata?.name) {
      userName = user.user_metadata.name;
    } else if (user.user_metadata?.display_name) {
      userName = user.user_metadata.display_name;
    } else if (user.raw_user_meta_data?.full_name) {
      userName = user.raw_user_meta_data.full_name;
    }

    // Store auth data
    authUser = {
      id: user.id,
      email: user.email,
      name: userName || user.email.split('@')[0],
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || null
    };

    // CRITICAL: Use Supabase client to set session if available
    // This allows Supabase to manage session persistence via Chrome storage adapter
    if (supabaseClient && supabaseClient.auth) {
      console.log('Setting Supabase session...');
      try {
        const { data, error } = await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        
        if (error) {
          console.error('Error setting Supabase session:', error);
        } else {
          console.log('✓ Supabase session set successfully');
          // Supabase will automatically persist this to Chrome storage via the adapter
          // The onAuthStateChange listener will update the UI
          return; // Exit early - onAuthStateChange will handle UI update
        }
      } catch (sessionError) {
        console.error('Exception setting Supabase session:', sessionError);
      }
    }

    // Fallback: Manual storage save (for backward compatibility)
    console.log('Saving auth data to storage manually (fallback)...');
    console.log('authUser object:', JSON.stringify(authUser, null, 2));
    console.log('accessToken length:', accessToken?.length);
    
    // Save to BOTH sync and local storage for reliability
    // Chrome storage sync can have delays or size limits
    const authData = {
      authUser: authUser,
      authToken: accessToken,
      refreshToken: refreshToken || null
    };
    
    try {
      // Save to sync storage
      await chrome.storage.sync.set(authData);
      console.log('✓ Data saved to chrome.storage.sync');
    } catch (syncError) {
      console.warn('chrome.storage.sync failed:', syncError);
    }
    
    // ALWAYS also save to local storage as backup
    try {
      await chrome.storage.local.set(authData);
      console.log('✓ Data saved to chrome.storage.local (backup)');
    } catch (localError) {
      console.error('chrome.storage.local also failed:', localError);
      throw new Error('Failed to save authentication data to both sync and local storage');
    }
    
    // Verify it was saved to at least one storage location
    let verifySync = await chrome.storage.sync.get(['authUser', 'authToken']);
    let verifyLocal = await chrome.storage.local.get(['authUser', 'authToken']);
    
    const savedInSync = verifySync.authUser && verifySync.authToken;
    const savedInLocal = verifyLocal.authUser && verifyLocal.authToken;
    
    if (savedInSync || savedInLocal) {
      const savedData = savedInSync ? verifySync : verifyLocal;
      console.log('✓ Auth data verified in storage:', {
        location: savedInSync ? 'sync' : 'local',
        id: savedData.authUser.id,
        email: savedData.authUser.email,
        name: savedData.authUser.name
      });
    } else {
      console.error('✗ Auth data NOT found in either storage!');
      console.error('Sync storage:', verifySync);
      console.error('Local storage:', verifyLocal);
      throw new Error('Failed to verify authentication data in storage');
    }

    // CRITICAL: Send auth data to background script to save it there
    // The background script persists even when popup closes during OAuth
    // This ensures the data is saved even if the popup context is destroyed
    console.log('=== Sending auth data to background script ===');
    try {
      const saveResponse = await new Promise((resolve, reject) => {
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Background script save timeout'));
        }, 5000);
        
        chrome.runtime.sendMessage({
          action: 'saveAuthData',
          authUser: authUser,
          authToken: accessToken,
          refreshToken: refreshToken || null
        }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      console.log('Background script response:', saveResponse);
      if (saveResponse && saveResponse.success) {
        console.log('✓ Auth data saved by background script to', saveResponse.location);
      } else {
        console.error('✗ Background script save failed:', saveResponse);
      }
    } catch (saveError) {
      console.error('Error sending auth data to background script:', saveError);
      console.error('Save error details:', {
        message: saveError.message,
        stack: saveError.stack
      });
      // Don't throw - we already saved to popup storage, this is just backup
    }

    // Also notify background script to start syncing
    chrome.runtime.sendMessage({
      action: 'authStateChanged',
      isAuthenticated: true,
      userId: authUser.id,
      token: accessToken
    }).catch(err => console.error('Error notifying background script:', err));

    // Wait a moment for background script to save, then re-check
    console.log('=== Sign-in successful! Waiting for storage to be ready... ===');
    await new Promise(resolve => setTimeout(resolve, 800)); // Give storage time to sync
    
    // Re-check auth status from storage to ensure consistency
    console.log('=== Re-checking auth status after save ===');
    const verified = await checkAuthStatus();
    console.log('Re-check result:', { verified, authUser: authUser });
    
    // Update UI after reloading from storage
    console.log('authUser after re-check:', authUser);
    console.log('Updating UI...');
    
    // Force UI update - ensure DOM is ready and then update
    // Use multiple strategies to ensure UI updates
    const updateUI = () => {
      updateAuthUI();
      
      // Double-check after a small delay to catch any edge cases
      setTimeout(async () => {
        const verifiedAgain = await checkAuthStatus();
        console.log('Double-check result:', { verified: verifiedAgain, authUser: authUser });
        if (verifiedAgain && authUser) {
          updateAuthUI();
        }
      }, 500);
    };
    
    // Try immediate update
    updateUI();
    
    // Also schedule for next frame (in case DOM isn't ready)
    requestAnimationFrame(updateUI);
    
    // One more check after a longer delay to catch Chrome storage sync delays
    setTimeout(async () => {
      const finalCheck = await checkAuthStatus();
      if (finalCheck && authUser) {
        console.log('Final check passed, updating UI one more time');
        updateAuthUI();
      }
    }, 1500);
    
    console.log('=== signInWithGoogle COMPLETED ===');
  } catch (error) {
    console.error('=== signInWithGoogle ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    alert('Failed to sign in: ' + error.message);
  }
}

// Sign out
async function signOut() {
  try {
    // If Supabase client is available, use it to sign out
    // This will automatically clear the session from Chrome storage
    if (supabaseClient && supabaseClient.auth) {
      console.log('Signing out via Supabase client...');
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        console.error('Supabase sign out error:', error);
      } else {
        console.log('✓ Signed out via Supabase');
        // onAuthStateChange will handle UI update
        return;
      }
    }
    
    // Fallback: Manual sign out
    console.log('Signing out manually (fallback)...');
    // Clear stored auth data from both sync and local
    await chrome.storage.sync.remove(['authUser', 'authToken', 'refreshToken']);
    await chrome.storage.local.remove(['authUser', 'authToken', 'refreshToken']);
    authUser = null;

    // Notify background script to stop syncing
    chrome.runtime.sendMessage({
      action: 'authStateChanged',
      isAuthenticated: false
    }).catch(err => console.error('Error notifying background:', err));

    // Update UI
    updateAuthUI();
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

// Initialize authentication UI
async function initAuth() {
  console.log('initAuth called');
  
  // Always show auth section
  const authSection = document.getElementById('auth-section');
  if (authSection) {
    authSection.style.display = 'block';
  } else {
    console.error('auth-section element not found');
  }

  // Set up event listeners
  const signInButton = document.getElementById('sign-in-button');
  const signOutButton = document.getElementById('sign-out-button');

  if (signInButton) {
    signInButton.addEventListener('click', signInWithGoogle, { once: false });
    
    // Disable button if backend not configured
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      signInButton.disabled = true;
      signInButton.style.opacity = '0.5';
      signInButton.style.cursor = 'not-allowed';
      const subtitle = document.querySelector('.auth-subtitle');
      if (subtitle) {
        subtitle.textContent = 'Backend not configured (see AUTHENTICATION_SETUP.md)';
      }
    }
  } else {
    console.error('sign-in-button not found');
  }

  if (signOutButton) {
    signOutButton.addEventListener('click', signOut, { once: false });
  } else {
    console.error('sign-out-button not found');
  }

  // Initialize Supabase client if configured
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    console.log('Supabase configured, initializing client...');
    supabaseClient = initSupabaseClient();
    
    if (supabaseClient && supabaseClient.auth) {
      console.log('Supabase client initialized, setting up auth state listener...');
      
      // CRITICAL: Listen for auth state changes
      // This automatically fires when session changes (including after popup reopens)
      supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Supabase auth state changed:', event, session ? 'has session' : 'no session');
        
        if (session && session.user) {
          // Extract user info from Supabase session
          authUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name || 
                  session.user.email?.split('@')[0],
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
          };
          console.log('Auth state: Signed in as', authUser.name);
          updateAuthUI();
        } else {
          authUser = null;
          console.log('Auth state: Signed out');
          updateAuthUI();
        }
      });
      
      // Check initial session
      const isAuthenticated = await checkAuthStatus();
      console.log('Auth check complete, isAuthenticated:', isAuthenticated, 'authUser:', authUser);
    } else {
      // Fallback: manual auth check
      console.log('Supabase client not available, using manual auth check...');
      const isAuthenticated = await checkAuthStatus();
      console.log('Auth check complete, isAuthenticated:', isAuthenticated, 'authUser:', authUser);
    }
    
    // Update UI based on auth status
    updateAuthUI();
    // Also schedule for next frame to catch any edge cases
    requestAnimationFrame(() => {
      updateAuthUI();
    });
  } else {
    console.log('Supabase not configured');
    // Update UI even if not configured (show signed out state)
    updateAuthUI();
  }
}

// Update authentication UI
function updateAuthUI() {
  try {
    const signedOutDiv = document.getElementById('auth-signed-out');
    const signedInDiv = document.getElementById('auth-signed-in');

    if (!signedOutDiv || !signedInDiv) {
      console.warn('Auth UI elements not found yet, will retry...');
      // Retry after a short delay if elements aren't ready yet
      setTimeout(() => {
        updateAuthUI();
      }, 100);
      return;
    }

    console.log('Updating auth UI, authUser:', authUser);

    if (authUser && authUser.id) {
      // Show signed in UI
      console.log('Showing signed in UI for user:', authUser.name || authUser.email);
      
      // Use class-based approach for more reliable toggling
      signedOutDiv.classList.add('hide');
      signedOutDiv.classList.remove('show');
      signedOutDiv.style.display = 'none';
      
      signedInDiv.classList.add('show');
      signedInDiv.classList.remove('hide');
      signedInDiv.style.display = 'flex';
      
      // Force a reflow to ensure styles are applied
      signedInDiv.offsetHeight;
      
      // Verify the computed styles
      const computedStyle = window.getComputedStyle(signedInDiv);
      console.log('Computed display style for signed-in:', computedStyle.display);
      console.log('Has show class:', signedInDiv.classList.contains('show'));
      if (computedStyle.display === 'none') {
        console.error('ERROR: Display is still none! Element state:', {
          classList: Array.from(signedInDiv.classList),
          styleDisplay: signedInDiv.style.display,
          computedDisplay: computedStyle.display
        });
        // Force with inline style and !important as last resort
        signedInDiv.style.setProperty('display', 'flex', 'important');
      }

      // Update greeting with user's name
      const greetingEl = document.getElementById('auth-greeting-text');
      if (greetingEl) {
        // Use first name if available, otherwise use email username
        const firstName = authUser.name ? authUser.name.split(' ')[0] : null;
        const displayName = firstName || authUser.email?.split('@')[0] || 'there';
        greetingEl.textContent = `Hi ${displayName}!`;
        console.log('✓ Updated greeting to:', greetingEl.textContent);
      } else {
        console.warn('Greeting element not found, will retry...');
        // Retry after short delay if greeting element isn't ready
        setTimeout(() => {
          const retryGreetingEl = document.getElementById('auth-greeting-text');
          if (retryGreetingEl && authUser) {
            const firstName = authUser.name ? authUser.name.split(' ')[0] : null;
            const displayName = firstName || authUser.email?.split('@')[0] || 'there';
            retryGreetingEl.textContent = `Hi ${displayName}!`;
            console.log('✓ Updated greeting on retry:', retryGreetingEl.textContent);
          }
        }, 100);
      }
    } else {
      // Show signed out UI
      console.log('Showing signed out UI (authUser:', authUser, ')');
      signedOutDiv.classList.remove('hide');
      signedOutDiv.classList.add('show');
      signedOutDiv.style.display = 'flex';
      
      signedInDiv.classList.remove('show');
      signedInDiv.classList.add('hide');
      signedInDiv.style.display = 'none';
      
      // Verify computed styles
      const computedStyle = window.getComputedStyle(signedOutDiv);
      console.log('Computed display style for signed-out:', computedStyle.display);
    }
    
    // Ensure auth section is visible
    const authSection = document.getElementById('auth-section');
    if (authSection) {
      authSection.style.display = 'block';
    }
  } catch (error) {
    console.error('Error updating auth UI:', error);
    // Retry once after error
    setTimeout(() => {
      try {
        updateAuthUI();
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    }, 200);
  }
}

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

    // Initialize authentication UI
    // Give a small delay to ensure storage is ready (especially after popup reopen)
    await new Promise(resolve => setTimeout(resolve, 100));
    await initAuth();
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
    // Also reload auth state when popup becomes visible
    // This catches the case where popup reopens after OAuth
    console.log('Popup became visible, reloading auth state...');
    // Use a longer delay to give storage time to sync
    setTimeout(() => {
      reloadAuthAndUpdateUI();
    }, 300);
  }
});

// Helper to reload auth state and update UI with retry
async function reloadAuthAndUpdateUI() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    console.log('reloadAuthAndUpdateUI: Reloading auth state...');
    const authenticated = await checkAuthStatus(0, 5); // Try up to 6 times with delays
    console.log('reloadAuthAndUpdateUI: Auth check result:', authenticated, 'authUser:', authUser);
    
    if (authenticated && authUser) {
      updateAuthUI();
      // Also schedule for next frame to ensure it happens
      requestAnimationFrame(() => {
        updateAuthUI();
      });
      // One more check after a delay to catch Chrome storage sync delays
      setTimeout(() => {
        if (authUser) {
          updateAuthUI();
        }
      }, 1000);
    } else {
      // If not authenticated, still update UI to show sign-in button
      updateAuthUI();
    }
  }
}

// Initialize auth state early (but wait for DOM)
(async () => {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    console.log('Early auth init: Initializing Supabase client...');
    
    // Initialize Supabase client early
    supabaseClient = initSupabaseClient();
    
    if (supabaseClient && supabaseClient.auth) {
      console.log('Early auth init: Setting up auth state listener...');
      
      // CRITICAL: Set up auth state change listener early
      // This will automatically update UI when session changes
      supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Early auth: State changed:', event, session ? 'has session' : 'no session');
        
        if (session && session.user) {
          authUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name || 
                  session.user.email?.split('@')[0],
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
          };
          console.log('Early auth: Signed in as', authUser.name);
          
          // Wait for DOM, then update UI
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => updateAuthUI());
          } else {
            updateAuthUI();
            requestAnimationFrame(() => updateAuthUI());
          }
        } else {
          authUser = null;
          console.log('Early auth: Signed out');
          if (document.readyState !== 'loading') {
            updateAuthUI();
          }
        }
      });
      
      // Check initial session
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        console.log('Early auth init: Session found:', session.user.email);
      } else {
        console.log('Early auth init: No session found');
      }
    } else {
      // Fallback: manual check
      console.log('Early auth init: Using manual check (Supabase client not available)');
      const authenticated = await checkAuthStatus(0, 5);
      console.log('Early auth init: Result:', authenticated, 'authUser:', authUser);
    }
    
    // Wait for DOM to be ready before updating UI
    const updateUIWhenReady = () => {
      updateAuthUI();
      requestAnimationFrame(() => {
        updateAuthUI();
      });
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', updateUIWhenReady);
    } else {
      setTimeout(() => {
        updateUIWhenReady();
      }, 50);
    }
  }
})();

// Also reload on focus (when popup window gains focus)
window.addEventListener('focus', () => {
  console.log('Popup gained focus, reloading auth state...');
  reloadAuthAndUpdateUI();
});

// CRITICAL: Listen for storage changes to detect when auth data is saved
// This works even when popup reopens after OAuth - storage changes trigger immediately
chrome.storage.onChanged.addListener((changes, areaName) => {
  console.log('Storage changed detected:', {
    area: areaName,
    changedKeys: Object.keys(changes),
    hasAuthUser: !!changes.authUser,
    hasAuthToken: !!changes.authToken
  });
  
  // If auth data was added/changed, reload auth state and update UI
  if (changes.authUser || changes.authToken) {
    console.log('Auth data change detected in storage, reloading...');
    // Use a small delay to ensure the change is fully committed
    setTimeout(() => {
      reloadAuthAndUpdateUI();
    }, 100);
  }
});

// Listen for messages from background script when auth data is saved
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'authDataSaved') {
    console.log('Received authDataSaved message from background script');
    // Reload auth state immediately when background script confirms save
    reloadAuthAndUpdateUI();
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}
