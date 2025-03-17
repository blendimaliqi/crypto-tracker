const cron = require("node-cron");
const config = require("./config");
const utils = require("./utils");
const emailService = require("./services/email");
const listingService = require("./services/listings");
const announcementService = require("./services/announcements");

// Main application initialization function
async function initializeApp() {
  console.log("=== CRYPTO TRACKER INITIALIZING ===");

  try {
    // Create data directory if it doesn't exist
    await utils.ensureDataDirExists();

    // Initialize email service
    emailService.initializeEmailService();

    // Run initial test email if configured
    if (config.email.testOnStartup) {
      await emailService.testEmailSetup();
    }

    // Perform initial check
    console.log("Performing initial check for new listings...");
    await listingService.checkNewListings();

    // Also check for announcements
    console.log("Performing initial check for new announcements...");
    await announcementService.checkNewAnnouncements();

    // Schedule recurring checks
    console.log(
      `Setting up scheduled checks with interval: ${config.checkInterval}`
    );
    cron.schedule(config.checkInterval, async () => {
      try {
        console.log(`Running scheduled check at ${new Date().toISOString()}`);
        await listingService.checkNewListings();
        await announcementService.checkNewAnnouncements();
      } catch (error) {
        console.error("Error during scheduled check:", error);
      }
    });

    console.log("=== CRYPTO TRACKER RUNNING ===");
    console.log(`Monitoring at interval: ${config.checkInterval}`);
  } catch (error) {
    console.error("Error during application initialization:", error);
    throw error; // Re-throw to be caught by the main error handler
  }
}

// Start the application
(async () => {
  try {
    await initializeApp();
  } catch (error) {
    console.error("Fatal application error:", error);
    process.exit(1);
  }
})();
