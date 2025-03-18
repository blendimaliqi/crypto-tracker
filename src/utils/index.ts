import * as fs from "fs/promises";
import * as path from "path";
import config from "../config";

// Define core interfaces
export interface Symbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  exchange: string;
}

export interface ListingData {
  symbols: Symbol[];
}

export interface Announcement {
  id: string;
  title: string;
  link: string;
  date: string;
  exchange: string;
  symbols?: string[]; // Optional array of symbols found in the announcement
}

export interface Adapter {
  fetchListings: () => Promise<ListingData>;
  getDataFilePath: () => string;
}

/**
 * Ensure the data directory exists
 */
export async function ensureDataDirExists(dataPath?: string): Promise<void> {
  const dirPath = dataPath || config.dataPath;
  try {
    await fs.access(dirPath);
  } catch (err) {
    console.log(`Creating data directory: ${dirPath}`);
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Load previous listings from file
 */
export async function loadPreviousListings(
  filePath: string,
  adapter?: Adapter
): Promise<ListingData> {
  try {
    // Try to read previous listings
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data) as ListingData;
  } catch (err) {
    console.log(
      `No previous listings found for ${filePath}, creating new file`
    );
    return { symbols: [] };
  }
}

/**
 * Save listings to file
 */
export async function saveListings(
  filePath: string,
  data: ListingData,
  adapter?: Adapter
): Promise<void> {
  // Ensure the directory exists
  const dir = path.dirname(filePath);
  await ensureDataDirExists(dir);

  // Write the data
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Display announcements in a formatted table
 */
export function displayAnnouncementsTable(announcements: Announcement[]): void {
  console.log("\nNew Announcements:");
  console.log("=================");

  announcements.forEach((announcement) => {
    console.log(`\nExchange: ${announcement.exchange}`);
    console.log(`Title: ${announcement.title}`);
    console.log(`Date: ${announcement.date}`);
    console.log(`Link: ${announcement.link}`);
    console.log("-----------------");
  });
}
