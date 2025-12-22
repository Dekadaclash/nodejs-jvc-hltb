# jvc-hltb

A robust **HowLongToBeat API client** for Node.js that automatically extracts dynamic API keys using multiple methods (Puppeteer interception, token extraction) to ensure reliable access to HLTB data.

[![npm version](https://badge.fury.io/js/jvc-hltb.svg)](https://badge.fury.io/js/jvc-hltb)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Author:** [JavocSoft](https://javocsoft.com)

## 🎮 Features

- ✅ **Multiple extraction methods** - Uses Puppeteer to intercept AJAX calls and extract dynamic API keys and auth tokens
- ✅ **Dual authentication methods** - Supports both `/api/locate/<key>` and `/api/search` (with `x-auth-token`) endpoints
- ✅ **Smart caching** - Caches keys for configurable time (default 60 minutes) to minimize browser launches
- ✅ **Auto-recovery** - Automatically refreshes keys on 404 errors and retries with alternative methods
- ✅ **Clear error handling** - Provides descriptive errors when all extraction methods fail
- ✅ **Clean API** - Simple, promise-based interface
- ✅ **TypeScript support** - Includes type definitions

## 📦 Installation

```bash
npm install jvc-hltb
```

### Prerequisites

This library uses Puppeteer, which requires Chromium. On Linux servers, you may need to install additional dependencies:

```bash
# Ubuntu/Debian
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils
```

## 🚀 Quick Start

```javascript
const HLTBClient = require('jvc-hltb');

// Create a new client instance
const hltb = new HLTBClient();

// Search for a game
async function main() {
  // Get game duration
  const duration = await hltb.getGameDuration('The Legend of Zelda: Breath of the Wild');
  
  if (duration) {
    console.log(`Main Story: ${duration.mainStory} hours`);
    console.log(`Main + Extras: ${duration.mainExtras} hours`);
    console.log(`Completionist: ${duration.completionist} hours`);
    console.log(`HLTB URL: https://howlongtobeat.com/game/${duration.gameId}`);
  }
  
  // Clean up when done
  await hltb.destroy();
}

main();
```

## 📖 API Reference

### `new HLTBClient(options?)`

Creates a new HowLongToBeat client instance.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cacheMinutes` | number | 60 | How long to cache API keys (in minutes) |
| `enabled` | boolean | true | Enable/disable the service |

```javascript
const hltb = new HLTBClient({
  cacheMinutes: 120, // Cache keys for 2 hours
});
```

### `hltb.getGameDuration(gameName)`

Gets the completion times for a game.

#### Parameters

- `gameName` (string) - The name of the game to search for

#### Returns

Returns a `Promise<DurationData | null>`:

```typescript
interface DurationData {
  gameId: number;        // HLTB game ID (for building URLs)
  mainStory: number;     // Main story completion time in hours
  mainExtras: number;    // Main + extras completion time in hours  
  completionist: number; // 100% completion time in hours
}
```

Returns `null` if the game is not found or no exact match exists.

#### Example

```javascript
const duration = await hltb.getGameDuration('Mega Man');
// {
//   gameId: 5803,
//   mainStory: 2.78,
//   mainExtras: 3.05,
//   completionist: 3.11
// }
```

### `hltb.searchGame(gameName)`

Searches for games matching the given name. Returns raw results from HLTB API.

#### Parameters

- `gameName` (string) - The search query

#### Returns

Returns a `Promise<Array>` with raw game data from HLTB, or `null` on error.

```javascript
const results = await hltb.searchGame('Zelda');
// Returns array of game objects with properties like:
// - game_id
// - game_name
// - comp_main (seconds)
// - comp_plus (seconds)
// - comp_100 (seconds)
// - game_image
// - etc.
```

### `hltb.formatDuration(hours)`

Formats a duration in hours to a human-readable string.

#### Parameters

- `hours` (number) - Duration in hours

#### Returns

Returns a formatted string like `"12h 30m"` or `null` if hours is invalid.

```javascript
hltb.formatDuration(12.5);  // "12h 30m"
hltb.formatDuration(8);     // "8h"
hltb.formatDuration(0.75);  // "0h 45m"
```

### `hltb.destroy()`

Cleans up resources (closes any open Puppeteer browser instances).

```javascript
await hltb.destroy();
```

## 🔧 How It Works

HowLongToBeat.com uses dynamic API keys that change periodically. This library:

1. **Launches a headless browser** using Puppeteer
2. **Intercepts network requests** to capture the current API key
3. **Caches the key** for efficient reuse (default: 60 minutes)
4. **Uses dual methods** - tries `/api/locate/{key}` first, falls back to `/api/search` with auth token
5. **Auto-recovers** from 404 errors by refreshing the key

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Your Application                                           │
│  - hltb.getGameDuration('Game Name')                       │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│  jvc-hltb                                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Key Management                                      │   │
│  │ - Extract keys with Puppeteer (headless browser)   │   │
│  │ - Cache keys for 60 minutes                        │   │
│  │ - Auto-refresh on expiry or 404                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Search Methods                                      │   │
│  │ - Method 1: POST /api/locate/{searchKey}           │   │
│  │ - Method 2: POST /api/search with x-auth-token     │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│  HowLongToBeat API                                          │
│  - Returns game data with completion times                  │
│  - Times in seconds (converted to hours by library)        │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Testing

Run the included test:

```bash
npm test
```

Or test with a specific game:

```bash
node test/test.js "Super Mario Bros."
```

## 📝 Examples

### Basic Usage

```javascript
const HLTBClient = require('jvc-hltb');

async function main() {
  const hltb = new HLTBClient();
  
  const games = [
    'The Legend of Zelda: Breath of the Wild',
    'Super Mario Odyssey',
    'Hollow Knight'
  ];
  
  for (const game of games) {
    const duration = await hltb.getGameDuration(game);
    if (duration) {
      console.log(`\n${game}:`);
      console.log(`  Story: ${hltb.formatDuration(duration.mainStory)}`);
      console.log(`  Extras: ${hltb.formatDuration(duration.mainExtras)}`);
      console.log(`  100%: ${hltb.formatDuration(duration.completionist)}`);
    } else {
      console.log(`\n${game}: Not found`);
    }
  }
  
  await hltb.destroy();
}

main();
```

### With Custom Options

```javascript
const HLTBClient = require('jvc-hltb');

const hltb = new HLTBClient({
  cacheMinutes: 120,  // Cache keys for 2 hours
});

// Your code here...
```

### Error Handling

```javascript
const HLTBClient = require('jvc-hltb');

async function getGameTime(gameName) {
  const hltb = new HLTBClient();
  
  try {
    const duration = await hltb.getGameDuration(gameName);
    
    if (!duration) {
      console.log('Game not found or no exact match');
      return null;
    }
    
    return {
      name: gameName,
      hours: duration.mainStory,
      url: `https://howlongtobeat.com/game/${duration.gameId}`
    };
    
  } catch (error) {
    console.error('HLTB error:', error.message);
    return null;
  } finally {
    await hltb.destroy();
  }
}
```

## ⚠️ Important Notes

1. **Puppeteer requirement**: This library uses Puppeteer for key extraction, which downloads Chromium (~170MB). Consider this for deployment.

2. **Rate limiting**: While this library caches keys, avoid making too many requests in a short time to respect HLTB's servers.

3. **Exact matches only**: `getGameDuration()` returns data only for exact name matches (case-insensitive). Use `searchGame()` for fuzzy results.

4. **Headless browser**: The first request may take a few seconds as Puppeteer launches a browser. Subsequent requests use cached keys.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [JavocSoft](https://javocsoft.com)

This project is licensed under the MIT License - you are free to use, modify, distribute, and create your own versions of this library for any purpose, including commercial use.

## 🙏 Acknowledgments

- [HowLongToBeat.com](https://howlongtobeat.com) for providing game completion time data
- The gaming community for making this data available

---

**Note**: This library is not affiliated with HowLongToBeat.com. Please use responsibly and respect their terms of service.
