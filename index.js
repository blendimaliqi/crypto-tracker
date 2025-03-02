const axios = require("axios");
const sgMail = require("@sendgrid/mail");
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
    from: "noreply@blendimaliqi.com",
    to: "blendi.maliqi93@gmail.com",
    apiKey: process.env.SENDGRID_API_KEY || process.env.APP_PASSWORD,
  },
  checkInterval: "*/15 * * * *", // Check every 15 minutes
  binanceApiUrl: "https://api.binance.com/api/v3/exchangeInfo",
};

// Initialize SendGrid with API key
if (config.email.apiKey) {
  sgMail.setApiKey(config.email.apiKey);
  console.log("SendGrid initialized with API key");
} else {
  console.error("No SendGrid API key found in environment variables!");
}

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
  console.log("Attempting to send email notification via SendGrid...");
  console.log(
    `Using email configuration: From=${config.email.from}, To=${config.email.to}`
  );
  console.log(`SendGrid API key exists: ${!!config.email.apiKey}`);

  try {
    const symbolList = newListings
      .map(
        (symbol) =>
          `<li>${symbol.symbol} - Base Asset: ${symbol.baseAsset}, Quote Asset: ${symbol.quoteAsset}</li>`
      )
      .join("");

    const msg = {
      to: config.email.to,
      from: config.email.from, // Verified SendGrid sender
      replyTo: config.email.from, // Set reply-to to the same address
      subject: `🚨 URGENT: New Binance Listing Found! (${newListings.length})`,
      html: `
        <h2 style="color: #FF0000;">New Cryptocurrency Listings on Binance!</h2>
        <p style="font-weight: bold;">The following new symbols have been detected:</p>
        <ul>${symbolList}</ul>
        <p>Check Binance for more details.</p>
        <p style="font-size: 12px; color: #666;">This is an automated notification from your Crypto Tracker. Please do not reply to this email.</p>
      `,
    };

    console.log(
      "Sending email with the following options:",
      JSON.stringify(msg, null, 2)
    );
    const response = await sgMail.send(msg);
    console.log(
      "Email sent successfully via SendGrid:",
      response[0].statusCode
    );
    return true;
  } catch (error) {
    console.error("Error sending email via SendGrid:", error);
    if (error.response) {
      console.error("SendGrid API error details:", error.response.body);
    }
    return false;
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
  console.log("=== TESTING EMAIL SETUP ===");
  console.log("Environment variables:");
  console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`- SENDGRID_API_KEY exists: ${!!process.env.SENDGRID_API_KEY}`);
  console.log(
    `- Using fallback APP_PASSWORD: ${
      !process.env.SENDGRID_API_KEY && !!process.env.APP_PASSWORD
    }`
  );

  if (!config.email.apiKey) {
    console.error(
      "❌ No SendGrid API key found! Email functionality will not work."
    );
    return;
  }

  try {
    console.log("Attempting to send test email via SendGrid...");
    const success = await sendEmail([
      {
        symbol: "TEST-BTC",
        baseAsset: "TEST",
        quoteAsset: "BTC",
      },
    ]);

    if (success) {
      console.log(
        "✅ Test email sent successfully via SendGrid! Check your inbox."
      );
    } else {
      console.error(
        "❌ Test email failed to send (no error thrown but operation failed)."
      );
    }
  } catch (error) {
    console.error("❌ Error sending test email:", error);
    console.error("Stack trace:", error.stack);
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
