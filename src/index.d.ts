/**
 * HowLongToBeat Client
 * A robust client for the HowLongToBeat API that automatically extracts
 * dynamic API keys using multiple methods to ensure reliable access to HLTB data.
 * 
 * @author JavocSoft (https://javocsoft.com)
 * @license MIT
 */

declare class HLTBClient {
  /**
   * Creates a new HowLongToBeat client
   * @param options - Configuration options
   */
  constructor(options?: HLTBClientOptions);

  /**
   * Whether the service is enabled
   */
  enabled: boolean;

  /**
   * Base URL for HowLongToBeat
   */
  baseUrl: string;

  /**
   * How long to cache API keys (in minutes)
   */
  cacheMinutes: number;

  /**
   * Searches for a game on HowLongToBeat
   * @param gameName - Name of the game to search
   * @returns Array of search results or null on error
   */
  searchGame(gameName: string): Promise<HLTBSearchResult[] | null>;

  /**
   * Gets the completion duration for a game
   * @param gameName - Name of the game (must match exactly, case-insensitive)
   * @returns Duration data or null if not found
   */
  getGameDuration(gameName: string): Promise<HLTBDuration | null>;

  /**
   * Converts seconds to hours
   * @param seconds - Time in seconds
   * @returns Hours with 2 decimal places, or null if invalid
   */
  secondsToHours(seconds: number): number | null;

  /**
   * Formats hours to a human-readable string
   * @param hours - Hours as decimal
   * @returns Formatted string like "12h 30m", or null if invalid
   */
  formatDuration(hours: number): string | null;

  /**
   * Cleans up resources (closes Puppeteer browser if open)
   */
  destroy(): Promise<void>;
}

interface HLTBClientOptions {
  /**
   * How long to cache API keys (in minutes)
   * @default 60
   */
  cacheMinutes?: number;

  /**
   * Enable/disable the service
   * @default true
   */
  enabled?: boolean;
}

interface HLTBDuration {
  /**
   * HLTB game ID (useful for building URLs)
   */
  gameId: number;

  /**
   * Main story completion time in hours
   */
  mainStory: number | null;

  /**
   * Main story + extras completion time in hours
   */
  mainExtras: number | null;

  /**
   * 100% completion time in hours
   */
  completionist: number | null;
}

interface HLTBSearchResult {
  /**
   * HLTB game ID
   */
  game_id: number;

  /**
   * Game name
   */
  game_name: string;

  /**
   * Game type (e.g., "game", "dlc")
   */
  game_type: string;

  /**
   * Game image filename
   */
  game_image: string;

  /**
   * Main story completion time in seconds
   */
  comp_main: number;

  /**
   * Main + extras completion time in seconds
   */
  comp_plus: number;

  /**
   * 100% completion time in seconds
   */
  comp_100: number;

  /**
   * Average completion time in seconds
   */
  comp_all: number;

  /**
   * Number of players who submitted data
   */
  count_comp: number;

  /**
   * Release year
   */
  release_world: number;
}

export = HLTBClient;
