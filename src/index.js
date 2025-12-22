const axios = require('axios');
const puppeteer = require('puppeteer');

/**
 * HowLongToBeat Client
 * 
 * A robust client for the HowLongToBeat API that automatically extracts
 * dynamic API keys using multiple methods (Puppeteer interception, token extraction)
 * to ensure reliable access to HLTB data.
 * 
 * @author JavocSoft (https://javocsoft.com)
 * @license MIT
 * 
 * API Endpoints:
 * - Primary: POST https://howlongtobeat.com/api/locate/<search_key>
 * - Alternative: POST https://howlongtobeat.com/api/search (with x-auth-token header)
 * 
 * The <search_key> is a 16-character hexadecimal token that changes periodically.
 * Puppeteer intercepts network requests to capture this token automatically.
 * 
 * Response time format:
 * - comp_main: Main Story time (in seconds)
 * - comp_plus: Main + Extras time (in seconds)
 * - comp_100: Completionist time (in seconds)
 * 
 * Conversion: divide by 3600 to get hours
 */
class HLTBClient {
  /**
   * Creates a new HowLongToBeat client
   * @param {Object} options - Configuration options
   * @param {number} options.cacheMinutes - How long to cache API keys (default: 60)
   * @param {boolean} options.enabled - Enable/disable the service (default: true)
   */
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.baseUrl = 'https://howlongtobeat.com';
    this.searchKey = null;
    this.searchKeyExpiry = null;
    this.authToken = null;
    this.authTokenExpiry = null;
    this.cacheMinutes = options.cacheMinutes || 60;
    this.browser = null;
  }

  /**
   * Extracts the search key AND auth token by intercepting AJAX calls with Puppeteer
   * @returns {Promise<{searchKey: string|null, authToken: string|null}>}
   * @private
   */
  async _extractKeysWithPuppeteer() {
    let browser = null;
    let page = null;
    
    try {
      console.log('[HLTB] Launching headless browser to extract keys...');
      
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      let searchKey = null;
      let authToken = null;
      
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        const url = request.url();
        const headers = request.headers();
        
        // Look for API locate calls to extract search key
        if (url.includes('/api/locate/')) {
          const match = url.match(/\/api\/locate\/([a-f0-9]+)/i);
          if (match && match[1] && match[1].length >= 16) {
            searchKey = match[1];
            console.log(`[HLTB] ✓ Search key intercepted: ${searchKey}`);
          }
        }
        
        // Look for API search calls to extract x-auth-token
        if (url.includes('/api/search')) {
          if (headers['x-auth-token']) {
            authToken = headers['x-auth-token'];
            console.log(`[HLTB] ✓ Auth token intercepted: ${authToken}`);
          }
        }
        
        request.continue();
      });
      
      console.log('[HLTB] Loading HLTB search page...');
      await page.goto(`${this.baseUrl}/?q=test`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for AJAX calls to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await browser.close();
      browser = null;
      
      if (searchKey || authToken) {
        console.log(`[HLTB] ✓ Extraction results - SearchKey: ${searchKey || 'none'}, AuthToken: ${authToken || 'none'}`);
      } else {
        console.log('[HLTB] ⚠️ Could not extract any keys from network requests');
      }
      
      return { searchKey, authToken };
      
    } catch (error) {
      console.error('[HLTB] Error extracting keys with Puppeteer:', error.message);
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // Ignore close errors
        }
      }
      return { searchKey: null, authToken: null };
    }
  }

  /**
   * Gets or refreshes the API keys (searchKey and authToken)
   * @returns {Promise<{searchKey: string|null, authToken: string|null}>}
   * @private
   */
  async _getKeys() {
    try {
      const searchKeyValid = this.searchKey && this.searchKeyExpiry && Date.now() < this.searchKeyExpiry;
      const authTokenValid = this.authToken && this.authTokenExpiry && Date.now() < this.authTokenExpiry;
      
      if (searchKeyValid && authTokenValid) {
        console.log('[HLTB] Using cached keys');
        return { searchKey: this.searchKey, authToken: this.authToken };
      }

      console.log('[HLTB] Keys expired or missing, extracting new ones...');
      const { searchKey, authToken } = await this._extractKeysWithPuppeteer();
      
      if (searchKey) {
        this.searchKey = searchKey;
        this.searchKeyExpiry = Date.now() + (this.cacheMinutes * 60 * 1000);
        console.log(`[HLTB] ✓ Search key cached until: ${new Date(this.searchKeyExpiry).toLocaleString()}`);
      }
      
      if (authToken) {
        this.authToken = authToken;
        this.authTokenExpiry = Date.now() + (this.cacheMinutes * 60 * 1000);
        console.log(`[HLTB] ✓ Auth token cached until: ${new Date(this.authTokenExpiry).toLocaleString()}`);
      }
      
      // If no keys were extracted and none are cached, we cannot proceed
      if (!this.searchKey && !this.authToken) {
        throw new Error('Failed to extract API keys: Could not obtain search key or auth token from HowLongToBeat. The website structure may have changed.');
      }
      
      return { searchKey: this.searchKey, authToken: this.authToken };
      
    } catch (error) {
      console.error('[HLTB] Error getting keys:', error.message);
      throw error;
    }
  }

  /**
   * Performs a search using /api/locate/<searchKey>
   * @param {string} gameName - Name of the game
   * @param {string} searchKey - Search key to use
   * @returns {Promise<Array>}
   * @private
   */
  async _performSearchWithLocate(gameName, searchKey) {
    const searchTerms = gameName.trim().toLowerCase().split(/\s+/);

    const payload = {
      searchType: 'games',
      searchTerms: searchTerms,
      searchPage: 1,
      size: 20,
      searchOptions: {
        games: {
          userId: 0,
          platform: '',
          sortCategory: 'popular',
          rangeCategory: 'main',
          rangeTime: {
            min: null,
            max: null
          },
          gameplay: {
            perspective: '',
            flow: '',
            genre: '',
            difficulty: ''
          },
          rangeYear: {
            min: '',
            max: ''
          },
          modifier: ''
        },
        users: {
          sortCategory: 'postcount'
        },
        lists: {
          sortCategory: 'follows'
        },
        filter: '',
        sort: 0,
        randomizer: 0
      },
      useCache: false
    };

    const response = await axios.post(
      `${this.baseUrl}/api/locate/${searchKey}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': this.baseUrl,
          'Origin': this.baseUrl
        },
        timeout: 15000
      }
    );

    return response.data.data || [];
  }

  /**
   * Performs a search using /api/search with x-auth-token
   * @param {string} gameName - Name of the game
   * @param {string} authToken - Auth token to use
   * @returns {Promise<Array>}
   * @private
   */
  async _performSearchWithAuthToken(gameName, authToken) {
    const searchTerms = gameName.trim().toLowerCase().split(/\s+/);

    const payload = {
      searchType: 'games',
      searchTerms: searchTerms,
      searchPage: 1,
      size: 20,
      searchOptions: {
        games: {
          userId: 0,
          platform: '',
          sortCategory: 'popular',
          rangeCategory: 'main',
          rangeTime: {
            min: null,
            max: null
          },
          gameplay: {
            perspective: '',
            flow: '',
            genre: '',
            difficulty: ''
          },
          rangeYear: {
            min: '',
            max: ''
          },
          modifier: ''
        },
        users: {
          sortCategory: 'postcount'
        },
        lists: {
          sortCategory: 'follows'
        },
        filter: '',
        sort: 0,
        randomizer: 0
      },
      useCache: false
    };

    const response = await axios.post(
      `${this.baseUrl}/api/search`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': this.baseUrl,
          'Origin': this.baseUrl,
          'x-auth-token': authToken
        },
        timeout: 15000
      }
    );

    return response.data.data || [];
  }

  /**
   * Searches for a game on HowLongToBeat
   * Tries /api/locate/<searchKey> first, then falls back to /api/search with auth token
   * @param {string} gameName - Name of the game to search
   * @returns {Promise<Array|null>} - Array of search results or null on error
   */
  async searchGame(gameName) {
    let searchKey = null;
    let authToken = null;
    
    try {
      console.log(`[HLTB] Searching for: ${gameName}`);

      const keys = await this._getKeys();
      searchKey = keys.searchKey;
      authToken = keys.authToken;
      
      // METHOD 1: Try /api/locate/<searchKey>
      if (searchKey) {
        try {
          console.log('[HLTB] Trying method 1: /api/locate with search key');
          const results = await this._performSearchWithLocate(gameName, searchKey);
          console.log(`[HLTB] ✓ Method 1 successful, found ${results.length} results`);
          return results;
          
        } catch (error) {
          if (error.response?.status === 404) {
            const attemptedUrl = `${this.baseUrl}/api/locate/${searchKey}`;
            console.log(`[HLTB] Method 1 failed with 404 - URL: ${attemptedUrl}`);
            
            // Force key refresh
            this.searchKey = null;
            this.searchKeyExpiry = null;
            this.authToken = null;
            this.authTokenExpiry = null;
            
            const newKeys = await this._getKeys();
            
            // Retry with new search key
            if (newKeys.searchKey) {
              try {
                const results = await this._performSearchWithLocate(gameName, newKeys.searchKey);
                console.log(`[HLTB] ✓ Method 1 retry successful, found ${results.length} results`);
                return results;
              } catch (retryError) {
                console.log(`[HLTB] Method 1 retry also failed: ${retryError.message}`);
                authToken = newKeys.authToken;
              }
            } else {
              authToken = newKeys.authToken;
            }
          } else {
            console.log(`[HLTB] Method 1 failed: ${error.message}`);
          }
        }
      } else {
        console.log('[HLTB] No search key available, skipping method 1');
      }
      
      // METHOD 2: Try /api/search with x-auth-token as fallback
      if (authToken) {
        try {
          console.log('[HLTB] Trying method 2: /api/search with auth token');
          const results = await this._performSearchWithAuthToken(gameName, authToken);
          console.log(`[HLTB] ✓ Method 2 successful, found ${results.length} results`);
          return results;
        } catch (error) {
          console.log(`[HLTB] Method 2 failed: ${error.message}`);
          throw error;
        }
      } else {
        console.log('[HLTB] No auth token available, cannot use method 2');
        throw new Error('Both search methods unavailable - no valid keys');
      }

    } catch (error) {
      const methodInfo = searchKey 
        ? `Method 1 URL: ${this.baseUrl}/api/locate/${searchKey}` 
        : authToken 
          ? `Method 2 URL: ${this.baseUrl}/api/search` 
          : 'No methods available';
      console.error(`[HLTB] Error searching game: ${error.message} - ${methodInfo}`);
      return null;
    }
  }

  /**
   * Converts seconds to hours
   * Times from HLTB API are in seconds
   * @param {number} seconds - Time in seconds
   * @returns {number|null} - Hours with 2 decimal places, or null if invalid
   */
  secondsToHours(seconds) {
    if (!seconds || seconds <= 0) return null;
    const hours = seconds / 3600;
    return Math.round(hours * 100) / 100;
  }

  /**
   * Formats hours to a human-readable string
   * @param {number} hours - Hours as decimal
   * @returns {string|null} - Formatted string like "12h 30m", or null if invalid
   */
  formatDuration(hours) {
    if (!hours || hours <= 0) return null;
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (minutes === 0) {
      return `${wholeHours}h`;
    }
    
    return `${wholeHours}h ${minutes}m`;
  }

  /**
   * Gets the completion duration for a game from HowLongToBeat
   * @param {string} gameName - Name of the game (must match exactly, case-insensitive)
   * @returns {Promise<{gameId: number, mainStory: number, mainExtras: number, completionist: number}|null>}
   */
  async getGameDuration(gameName) {
    if (!this.enabled) {
      console.log('[HLTB] Service disabled');
      return null;
    }

    try {
      if (!gameName || typeof gameName !== 'string') {
        console.log('[HLTB] Invalid game name provided');
        return null;
      }

      console.log(`[HLTB] Getting duration for: ${gameName}`);

      const results = await this.searchGame(gameName);

      if (!results || results.length === 0) {
        console.log(`[HLTB] No results found for: ${gameName}`);
        return null;
      }

      // Log top results for debugging
      console.log(`[HLTB] Top 3 results:`, results.slice(0, 3).map(r => ({
        id: r.game_id,
        name: r.game_name,
        type: r.game_type,
        main: this.secondsToHours(r.comp_main),
        plus: this.secondsToHours(r.comp_plus),
        complete: this.secondsToHours(r.comp_100)
      })));

      // Find exact match (case-insensitive)
      const exactMatch = results.find(game => {
        const resultName = game.game_name.trim().toLowerCase();
        const searchName = gameName.trim().toLowerCase();
        return resultName === searchName;
      });

      if (!exactMatch) {
        console.log(`[HLTB] No exact match found for: ${gameName}`);
        console.log(`[HLTB] Available results:`, results.slice(0, 5).map(r => r.game_name));
        return null;
      }

      console.log(`[HLTB] Exact match found: ${exactMatch.game_name} (ID: ${exactMatch.game_id})`);

      const durationData = {
        gameId: exactMatch.game_id,
        mainStory: this.secondsToHours(exactMatch.comp_main),
        mainExtras: this.secondsToHours(exactMatch.comp_plus),
        completionist: this.secondsToHours(exactMatch.comp_100)
      };

      // Validate that at least one time is available
      if (!durationData.mainStory && !durationData.mainExtras && !durationData.completionist) {
        console.log(`[HLTB] No duration data available for: ${exactMatch.game_name}`);
        return null;
      }

      console.log(`[HLTB] Duration data found:`, durationData);
      return durationData;

    } catch (error) {
      console.error('[HLTB] Error fetching game duration:', error);
      console.error('[HLTB] Error stack:', error.stack);
      return null;
    }
  }

  /**
   * Cleans up resources (closes Puppeteer browser if open)
   */
  async destroy() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log('[HLTB] Browser closed');
      } catch (error) {
        console.error('[HLTB] Error closing browser:', error.message);
      }
    }
  }
}

module.exports = HLTBClient;
