const config = require("../config");
const utils = require("../utils");
const exchangeAdapters = require("../adapters/exchanges");
const emailService = require("./email");

// Check for new listings across all enabled exchanges
async function checkNewListings() {
  console.log("Checking for new listings across all enabled exchanges...");

  let allNewListings = [];

  // Process each enabled exchange
  for (const [exchangeName, exchangeConfig] of Object.entries(
    config.exchanges
  )) {
    if (!exchangeConfig.enabled) {
      console.log(`Skipping ${exchangeName} (disabled in config)`);
      continue;
    }

    try {
      console.log(`Checking for new listings on ${exchangeName}...`);

      // Get the adapter for this exchange
      const adapter = exchangeAdapters[exchangeName];
      if (!adapter) {
        console.error(`No adapter found for ${exchangeName}`);
        continue;
      }

      // Load previous data for this exchange
      const previousData = await utils.loadPreviousListings(
        exchangeName,
        adapter
      );
      const previousSymbols = new Set(
        previousData.symbols.map((s) => s.symbol)
      );

      // Fetch current data using the adapter
      const currentData = await adapter.fetchListings();

      // Find new listings
      const newListings = currentData.symbols.filter(
        (symbol) => !previousSymbols.has(symbol.symbol)
      );

      if (newListings.length > 0) {
        console.log(
          `Found ${newListings.length} new listings on ${exchangeName}!`
        );
        allNewListings = [...allNewListings, ...newListings];
      } else {
        console.log(`No new listings found on ${exchangeName}.`);
      }

      // Save current data for next comparison
      await utils.saveListings(exchangeName, currentData, adapter);
    } catch (error) {
      console.error(`Error checking listings on ${exchangeName}:`, error);
    }
  }

  // Send email if any new listings were found
  if (allNewListings.length > 0) {
    console.log(
      `Found a total of ${allNewListings.length} new listings across all exchanges!`
    );
    await emailService.sendEmail(allNewListings);
  } else {
    console.log("No new listings found on any exchange.");
  }
}

module.exports = {
  checkNewListings,
};
