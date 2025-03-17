const fs = require("fs").promises;
const config = require("../config");
const utils = require("../utils");
const announcementAdapters = require("../adapters/announcements");
const emailService = require("./email");

// Check for new announcements across exchanges
async function checkNewAnnouncements() {
  console.log("Checking for new announcements across exchanges...");

  let allNewAnnouncements = [];

  // Process each enabled announcement source
  for (const [exchangeName, exchangeConfig] of Object.entries(
    config.announcements
  )) {
    if (!exchangeConfig.enabled) {
      console.log(
        `Skipping ${exchangeName} announcements (disabled in config)`
      );
      continue;
    }

    try {
      console.log(`Checking for new announcements on ${exchangeName}...`);

      // Get the adapter for this exchange
      const adapter = announcementAdapters[exchangeName];
      if (!adapter) {
        console.error(`No announcement adapter found for ${exchangeName}`);
        continue;
      }

      // Load previous announcements
      const dataFilePath = adapter.getDataFilePath();
      let previousAnnouncements = [];
      try {
        const data = await fs.readFile(dataFilePath, "utf8");
        previousAnnouncements = JSON.parse(data);
      } catch (error) {
        // If file doesn't exist or has invalid JSON, use empty array
        console.log(`No previous announcements found for ${exchangeName}`);
      }

      // Create a set of known announcement URLs for faster lookup
      const knownUrls = new Set(previousAnnouncements.map((a) => a.url));

      // Fetch current announcements
      const currentAnnouncements = await adapter.fetchAnnouncements();

      // Filter out announcements without relevant information
      const filteredAnnouncements = currentAnnouncements.filter(
        (announcement) => {
          // Check for navigation items with 'ba-' prefix or 'footer' prefix (Binance menu items)
          if (
            announcement.title.startsWith("ba-") ||
            announcement.title.startsWith("footer") ||
            announcement.title.includes("_") ||
            announcement.title.length < 10
          ) {
            console.log(`Filtering out navigation item: ${announcement.title}`);
            return false;
          }

          // Check if the title contains listing-related keywords
          const listingKeywords = [
            "list",
            "add",
            "adds",
            "added",
            "adding",
            "support",
            "new cryptocurrency",
            "new token",
            "launch",
          ];
          const hasListingKeyword = listingKeywords.some((keyword) =>
            announcement.title.toLowerCase().includes(keyword)
          );

          if (!hasListingKeyword) {
            console.log(
              `Filtering out non-listing announcement: ${announcement.title}`
            );
          }

          return hasListingKeyword;
        }
      );

      console.log(
        `Filtered down to ${filteredAnnouncements.length} relevant listing announcements`
      );

      // Find new announcements
      const newAnnouncements = filteredAnnouncements.filter(
        (announcement) => !knownUrls.has(announcement.url)
      );

      if (newAnnouncements.length > 0) {
        console.log(
          `Found ${newAnnouncements.length} new announcements on ${exchangeName}!`
        );
        allNewAnnouncements = [...allNewAnnouncements, ...newAnnouncements];

        // Display the announcements in a table format for debugging
        utils.displayAnnouncementsTable(newAnnouncements);

        // Save updated announcements (combine old and new)
        await fs.writeFile(
          dataFilePath,
          JSON.stringify(
            [...previousAnnouncements, ...newAnnouncements],
            null,
            2
          ),
          "utf8"
        );
      } else {
        console.log(`No new announcements found on ${exchangeName}.`);
      }
    } catch (error) {
      console.error(`Error checking announcements on ${exchangeName}:`, error);
    }
  }

  // Send email if any new announcements were found
  if (allNewAnnouncements.length > 0) {
    console.log(
      `Found a total of ${allNewAnnouncements.length} new announcements!`
    );

    // Log the announcements
    utils.displayAnnouncementsTable(allNewAnnouncements);

    // Send email notification
    await emailService.sendAnnouncementEmail(allNewAnnouncements);
  } else {
    console.log("No new announcements found on any exchange.");
  }
}

module.exports = {
  checkNewAnnouncements,
};
