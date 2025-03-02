const axios = require("axios");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
const fs = require("fs").promises;
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from .env.local file
dotenv.config({ path: ".env.local" });

// Configuration
const config = {
  dataFile: path.join(__dirname, "data", "listings.json"),
  email: {
    from: "blendi.maliqi93@gmail.com",
    to: "blendi.maliqi93@gmail.com",
    service: "gmail",
    auth: {
      user: "blendi.maliqi93@gmail.com",
      pass: process.env.APP_PASSWORD, // Get password from environment variable
    },
  },
  checkInterval: "*/10 * * * *", // Check every 10 minutes
  binanceApiUrl: "https://api.binance.com/api/v3/exchangeInfo",
};

// Ensure data directory exists
async function ensureDataDirExists() {
  try {
    await fs.mkdir(path.join(__dirname, "data"), { recursive: true });
  } catch (error) {
    console.error("Error creating data directory:", error);
  }
}

// Load previously stored listings
async function loadPreviousListings() {
  try {
    const data = await fs.readFile(config.dataFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or has invalid JSON, return empty array
    return { symbols: [] };
  }
}

// Save current listings
async function saveListings(data) {
  await fs.writeFile(config.dataFile, JSON.stringify(data, null, 2), "utf8");
}

// Send email notification
async function sendEmail(newListings) {
  const transporter = nodemailer.createTransport({
    service: config.email.service,
    auth: config.email.auth,
  });

  const symbolList = newListings
    .map(
      (symbol) =>
        `<li>${symbol.symbol} - Base Asset: ${symbol.baseAsset}, Quote Asset: ${symbol.quoteAsset}</li>`
    )
    .join("");

  const mailOptions = {
    from: config.email.from,
    to: config.email.to,
    subject: `🚨 URGENT: New Binance Listing Found! (${newListings.length})`,
    priority: "high", // Set high priority
    headers: {
      Importance: "high",
      "X-Priority": "1",
    },
    html: `
      <h2 style="color: #FF0000;">New Cryptocurrency Listings on Binance!</h2>
      <p style="font-weight: bold;">The following new symbols have been detected:</p>
      <ul>${symbolList}</ul>
      <p>Check Binance for more details.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// Check for new listings
async function checkNewListings() {
  try {
    console.log("Checking for new Binance listings...");

    // Load previous data
    const previousData = await loadPreviousListings();
    const previousSymbols = new Set(previousData.symbols.map((s) => s.symbol));

    // Fetch current data
    const response = await axios.get(config.binanceApiUrl);
    const currentData = response.data;

    // Find new listings
    const newListings = currentData.symbols.filter(
      (symbol) => !previousSymbols.has(symbol.symbol)
    );

    if (newListings.length > 0) {
      console.log(`Found ${newListings.length} new listings!`);
      await sendEmail(newListings);
    } else {
      console.log("No new listings found.");
    }

    // Save current data for next comparison
    await saveListings(currentData);
  } catch (error) {
    console.error("Error checking listings:", error);
  }
}

// Test email function
async function testEmailSetup() {
  try {
    await sendEmail([
      {
        symbol: "TEST-BTC",
        baseAsset: "TEST",
        quoteAsset: "BTC",
      },
    ]);
    console.log("✅ Test email sent successfully! Check your inbox.");
  } catch (error) {
    console.error("❌ Error sending test email:", error);
  }
}

// Initialize and start the monitor
async function init() {
  await ensureDataDirExists();

  // Test email
  await testEmailSetup();

  // Run once immediately
  await checkNewListings();

  // Schedule recurring checks
  cron.schedule(config.checkInterval, checkNewListings);
  console.log(
    `Binance listing monitor started. Checking every ${config.checkInterval} (cron format).`
  );
}

// Start the application
init();
