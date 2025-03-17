const fs = require("fs").promises;
const path = require("path");
const config = require("../config");

// Ensure data directory exists
async function ensureDataDirExists() {
  try {
    await fs.mkdir(config.dataPath, { recursive: true });
  } catch (error) {
    console.error("Error creating data directory:", error);
  }
}

// Load previously stored listings for a specific exchange
async function loadPreviousListings(exchange, adapter) {
  try {
    const dataFilePath = adapter.getDataFilePath();
    const data = await fs.readFile(dataFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or has invalid JSON, return empty array
    return { symbols: [] };
  }
}

// Save current listings for a specific exchange
async function saveListings(exchange, data, adapter) {
  const dataFilePath = adapter.getDataFilePath();
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), "utf8");
}

// Function to display announcements in table format
function displayAnnouncementsTable(announcements) {
  if (!announcements || announcements.length === 0) {
    console.log("No announcements to display.");
    return;
  }

  console.log("\nANNOUNCEMENTS TABLE:");
  console.log(
    "┌─────────────────┬─────────────────────────────────────────────┬────────────────────┬───────────────────────────┐"
  );
  console.log(
    "│ Exchange        │ Title                                       │ Date               │ Symbols                   │"
  );
  console.log(
    "├─────────────────┼─────────────────────────────────────────────┼────────────────────┼───────────────────────────┤"
  );

  announcements.forEach((announcement) => {
    const exchange = (announcement.exchange || "Unknown")
      .padEnd(15)
      .substring(0, 15);
    const title = (announcement.title || "No title")
      .padEnd(43)
      .substring(0, 43);
    const date = (
      announcement.date
        ? new Date(announcement.date)
            .toISOString()
            .substring(0, 16)
            .replace("T", " ")
        : "Unknown"
    )
      .padEnd(18)
      .substring(0, 18);
    const symbols = (
      announcement.symbols && announcement.symbols.length > 0
        ? announcement.symbols.join(", ")
        : "None"
    )
      .padEnd(25)
      .substring(0, 25);

    console.log(`│ ${exchange} │ ${title} │ ${date} │ ${symbols} │`);
  });

  console.log(
    "└─────────────────┴─────────────────────────────────────────────┴────────────────────┴───────────────────────────┘"
  );
  console.log(`Total: ${announcements.length} announcements\n`);
}

module.exports = {
  ensureDataDirExists,
  loadPreviousListings,
  saveListings,
  displayAnnouncementsTable,
};
