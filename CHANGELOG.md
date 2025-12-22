# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-22

### Added
- Initial release
- `HLTBClient` class with Puppeteer-based key extraction
- `getGameDuration()` method for fetching game completion times
- `searchGame()` method for raw search results
- `formatDuration()` utility for human-readable time formatting
- `secondsToHours()` conversion utility
- Dual authentication methods (search key and auth token)
- Smart caching of API keys (default: 60 minutes)
- Auto-recovery on 404 errors with key refresh
- Fallback mechanism for when key extraction fails
- TypeScript type definitions
- Comprehensive documentation and examples
