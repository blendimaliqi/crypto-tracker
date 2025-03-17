import * as fs from "fs/promises";
import * as path from "path";
import * as cron from "node-cron";
import config from "./config";
import exchangeAdapters from "./adapters/exchanges";
import {
  ensureDataDirExists,
  loadPreviousListings,
  saveListings,
} from "./utils";
import { checkAnnouncements } from "./services/announcements";
import {
  initEmail,
  testEmailSetup,
  sendEmailNotification,
} from "./services/email";

interface CryptoSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  exchange: string;
}

interface ListingData {
  symbols: CryptoSymbol[];
}

/**
 * Check for new crypto listings
 */
async function checkNewListings(): Promise<void> {
  try {
    console.log("Checking for new listings...");

    // Check each exchange for new listings
    for (const [exchangeName, adapter] of Object.entries(exchangeAdapters)) {
      if (!config.exchanges[exchangeName]?.enabled) {
        console.log(`Skipping ${exchangeName} (disabled in config)`);
        continue;
      }

      console.log(`Checking ${exchangeName} for new listings...`);

      try {
        // Load previous listings
        const previousData = await loadPreviousListings(
          adapter.getDataFilePath()
        );
        const previousSymbols = new Set(
          previousData.symbols.map((s: CryptoSymbol) => s.symbol)
        );

        // Fetch current listings
        const currentData = await adapter.fetchListings();

        // Find new symbols
        const newSymbols = currentData.symbols.filter(
          (symbol) => !previousSymbols.has(symbol.symbol)
        );

        if (newSymbols.length > 0) {
          console.log(
            `Found ${newSymbols.length} new listings on ${exchangeName}:`
          );
          newSymbols.forEach((symbol) => {
            console.log(
              `- ${symbol.baseAsset}/${symbol.quoteAsset} (${symbol.symbol})`
            );
          });

          // Send notification
          await sendEmailNotification(newSymbols);

          // Save updated listings
          await saveListings(adapter.getDataFilePath(), {
            symbols: [...previousData.symbols, ...newSymbols],
          });
        } else {
          console.log(`No new listings found on ${exchangeName}`);
        }
      } catch (error) {
        console.error(`Error checking ${exchangeName}:`, error);
      }
    }
  } catch (error) {
    console.error("Error checking for new listings:", error);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Initialize email service
    initEmail();

    // Test email setup
    await testEmailSetup();

    // Ensure data directory exists
    await ensureDataDirExists(config.dataPath);

    // Perform initial check
    console.log("Performing initial check for new listings...");
    await checkNewListings();

    console.log("Performing initial check for new announcements...");
    await checkAnnouncements();

    // Schedule regular checks
    console.log(
      `Scheduling checks to run every ${config.checkInterval} minutes`
    );

    cron.schedule(`*/${config.checkInterval} * * * *`, async () => {
      console.log("\n--- Running scheduled check ---");
      await checkNewListings();
      await checkAnnouncements();
    });

    console.log("Crypto tracker is now running...");
  } catch (error) {
    console.error("Error in main function:", error);
    process.exit(1);
  }
}

// Start the application
main();
