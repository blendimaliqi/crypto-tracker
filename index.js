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
  dataPath: path.join(__dirname, "data"),
  email: {
    from: "noreply@blendimaliqi.com",
    to: "blendi.maliqi93@gmail.com",
    apiKey: process.env.SENDGRID_API_KEY || process.env.APP_PASSWORD,
  },
  checkInterval: "*/15 * * * *", // Check every 15 minutes
  exchanges: {
    binance: {
      enabled: true,
      apiUrl: "https://api.binance.com/api/v3/exchangeInfo",
      dataFile: "binance_listings.json",
    },
    coinbase: {
      enabled: process.env.ENABLE_COINBASE === "true",
      apiUrl: "https://api.exchange.coinbase.com/products",
      dataFile: "coinbase_listings.json",
    },
    kraken: {
      enabled: process.env.ENABLE_KRAKEN === "true",
      apiUrl: "https://api.kraken.com/0/public/AssetPairs",
      dataFile: "kraken_listings.json",
    },
    okx: {
      enabled: process.env.ENABLE_OKX === "true",
      apiUrl: "https://www.okx.com/api/v5/public/instruments?instType=SPOT",
      dataFile: "okx_listings.json",
    },
    bybit: {
      enabled: process.env.ENABLE_BYBIT === "true",
      apiUrl: "https://api.bybit.com/v5/market/instruments-info?category=spot",
      dataFile: "bybit_listings.json",
    },
    cryptocom: {
      enabled: false,
      apiUrl: "https://api.crypto.com/v2/public/get-instruments",
      dataFile: "cryptocom_listings.json",
    },
    kucoin: {
      enabled: process.env.ENABLE_KUCOIN === "true",
      apiUrl: "https://api.kucoin.com/api/v1/symbols",
      dataFile: "kucoin_listings.json",
    },
    gateio: {
      enabled: process.env.ENABLE_GATEIO === "true",
      apiUrl: "https://api.gateio.ws/api/v4/spot/currency_pairs",
      dataFile: "gateio_listings.json",
    },
    mexc: {
      enabled: process.env.ENABLE_MEXC === "true",
      apiUrl: "https://api.mexc.com/api/v3/exchangeInfo",
      dataFile: "mexc_listings.json",
    },
    bitget: {
      enabled: false,
      apiUrl: "https://api.bitget.com/api/spot/v2/public/symbols",
      dataFile: "bitget_listings.json",
    },
  },
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
    await fs.mkdir(config.dataPath, { recursive: true });
  } catch (error) {
    console.error("Error creating data directory:", error);
  }
}

// Exchange adapters
const exchangeAdapters = {
  binance: {
    async fetchListings() {
      try {
        const response = await axios.get(config.exchanges.binance.apiUrl);
        if (!response.data || !response.data.symbols) {
          console.warn(
            "Binance API response doesn't contain expected data structure"
          );
          return { symbols: [] };
        }
        return {
          symbols: response.data.symbols.map((item) => ({
            symbol: item.symbol,
            baseAsset: item.baseAsset,
            quoteAsset: item.quoteAsset,
            exchange: "binance",
          })),
        };
      } catch (error) {
        console.error("Error fetching data from Binance:", error);
        return { symbols: [] };
      }
    },
    getDataFilePath() {
      return path.join(config.dataPath, config.exchanges.binance.dataFile);
    },
  },

  coinbase: {
    async fetchListings() {
      try {
        const response = await axios.get(config.exchanges.coinbase.apiUrl);
        if (!response.data || !Array.isArray(response.data)) {
          console.warn(
            "Coinbase API response doesn't contain expected data structure"
          );
          return { symbols: [] };
        }
        return {
          symbols: response.data.map((item) => ({
            symbol: item.id || "",
            baseAsset: item.base_currency || "",
            quoteAsset: item.quote_currency || "",
            exchange: "coinbase",
          })),
        };
      } catch (error) {
        console.error("Error fetching data from Coinbase:", error);
        return { symbols: [] };
      }
    },
    getDataFilePath() {
      return path.join(config.dataPath, config.exchanges.coinbase.dataFile);
    },
  },

  kraken: {
    async fetchListings() {
      try {
        const response = await axios.get(config.exchanges.kraken.apiUrl);
        if (!response.data || !response.data.result) {
          console.warn(
            "Kraken API response doesn't contain expected data structure"
          );
          return { symbols: [] };
        }
        return {
          symbols: Object.entries(response.data.result).map(([key, value]) => ({
            symbol: key,
            baseAsset: value.base || "",
            quoteAsset: value.quote || "",
            exchange: "kraken",
          })),
        };
      } catch (error) {
        console.error("Error fetching data from Kraken:", error);
        return { symbols: [] };
      }
    },
    getDataFilePath() {
      return path.join(config.dataPath, config.exchanges.kraken.dataFile);
    },
  },

  okx: {
    async fetchListings() {
      try {
        const response = await axios.get(config.exchanges.okx.apiUrl);
        if (!response.data || !response.data.data) {
          console.warn(
            "OKX API response doesn't contain expected data structure"
          );
          return { symbols: [] };
        }
        return {
          symbols: response.data.data.map((item) => ({
            symbol: item.instId || "",
            baseAsset: item.baseCcy || "",
            quoteAsset: item.quoteCcy || "",
            exchange: "okx",
          })),
        };
      } catch (error) {
        console.error("Error fetching data from OKX:", error);
        return { symbols: [] };
      }
    },
    getDataFilePath() {
      return path.join(config.dataPath, config.exchanges.okx.dataFile);
    },
  },

  bybit: {
    async fetchListings() {
      try {
        const response = await axios.get(config.exchanges.bybit.apiUrl);
        if (
          !response.data ||
          !response.data.result ||
          !response.data.result.list
        ) {
          console.warn(
            "Bybit API response doesn't contain expected data structure"
          );
          return { symbols: [] };
        }
        return {
          symbols: response.data.result.list.map((item) => ({
            symbol: item.symbol || "",
            baseAsset: item.baseCoin || "",
            quoteAsset: item.quoteCoin || "",
            exchange: "bybit",
          })),
        };
      } catch (error) {
        console.error("Error fetching data from Bybit:", error);
        return { symbols: [] };
      }
    },
    getDataFilePath() {
      return path.join(config.dataPath, config.exchanges.bybit.dataFile);
    },
  },

  kucoin: {
    async fetchListings() {
      try {
        const response = await axios.get(config.exchanges.kucoin.apiUrl);
        if (!response.data || !response.data.data) {
          console.warn(
            "KuCoin API response doesn't contain expected data structure"
          );
          return { symbols: [] };
        }
        return {
          symbols: response.data.data.map((item) => ({
            symbol: item.symbol || "",
            baseAsset: item.baseCurrency || "",
            quoteAsset: item.quoteCurrency || "",
            exchange: "kucoin",
          })),
        };
      } catch (error) {
        console.error("Error fetching data from KuCoin:", error);
        return { symbols: [] };
      }
    },
    getDataFilePath() {
      return path.join(config.dataPath, config.exchanges.kucoin.dataFile);
    },
  },

  gateio: {
    async fetchListings() {
      try {
        const response = await axios.get(config.exchanges.gateio.apiUrl);
        if (!response.data || !Array.isArray(response.data)) {
          console.warn(
            "Gate.io API response doesn't contain expected data structure"
          );
          return { symbols: [] };
        }
        return {
          symbols: response.data.map((item) => ({
            symbol: item.id || "",
            baseAsset: item.base || "",
            quoteAsset: item.quote || "",
            exchange: "gateio",
          })),
        };
      } catch (error) {
        console.error("Error fetching data from Gate.io:", error);
        return { symbols: [] };
      }
    },
    getDataFilePath() {
      return path.join(config.dataPath, config.exchanges.gateio.dataFile);
    },
  },

  mexc: {
    async fetchListings() {
      try {
        const response = await axios.get(config.exchanges.mexc.apiUrl);
        if (!response.data || !response.data.symbols) {
          console.warn(
            "MEXC API response doesn't contain expected data structure"
          );
          return { symbols: [] };
        }
        return {
          symbols: response.data.symbols.map((item) => ({
            symbol: item.symbol || "",
            baseAsset: item.baseAsset || "",
            quoteAsset: item.quoteAsset || "",
            exchange: "mexc",
          })),
        };
      } catch (error) {
        console.error("Error fetching data from MEXC:", error);
        return { symbols: [] };
      }
    },
    getDataFilePath() {
      return path.join(config.dataPath, config.exchanges.mexc.dataFile);
    },
  },
};

// Load previously stored listings for a specific exchange
async function loadPreviousListings(exchange) {
  try {
    const dataFilePath = exchangeAdapters[exchange].getDataFilePath();
    const data = await fs.readFile(dataFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or has invalid JSON, return empty array
    return { symbols: [] };
  }
}

// Save current listings for a specific exchange
async function saveListings(exchange, data) {
  const dataFilePath = exchangeAdapters[exchange].getDataFilePath();
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), "utf8");
}

// Send email notification
async function sendEmail(newListings) {
  console.log("Attempting to send email notification via SendGrid...");
  console.log(
    `Using email configuration: From=${config.email.from}, To=${config.email.to}`
  );
  console.log(`SendGrid API key exists: ${!!config.email.apiKey}`);

  try {
    // Group listings by exchange
    const listingsByExchange = {};
    newListings.forEach((listing) => {
      if (!listingsByExchange[listing.exchange]) {
        listingsByExchange[listing.exchange] = [];
      }
      listingsByExchange[listing.exchange].push(listing);
    });

    // Create HTML content for each exchange
    let emailContent = "";
    Object.entries(listingsByExchange).forEach(([exchange, listings]) => {
      const symbolList = listings
        .map(
          (symbol) =>
            `<li>${symbol.symbol} - Base Asset: ${symbol.baseAsset}, Quote Asset: ${symbol.quoteAsset}</li>`
        )
        .join("");

      emailContent += `
        <h3 style="color: #2b5278; margin-top: 20px;">${exchange.toUpperCase()} (${
        listings.length
      } new listings)</h3>
        <ul>${symbolList}</ul>
      `;
    });

    const msg = {
      to: config.email.to,
      from: config.email.from, // Verified SendGrid sender
      replyTo: config.email.from, // Set reply-to to the same address
      subject: `🚨 URGENT: New Crypto Listings Found! (${
        newListings.length
      } across ${Object.keys(listingsByExchange).length} exchanges)`,
      html: `
        <h2 style="color: #FF0000;">New Cryptocurrency Listings Detected!</h2>
        <p style="font-weight: bold;">The following new symbols have been detected across exchanges:</p>
        ${emailContent}
        <p>Check the respective exchanges for more details.</p>
        <p style="font-size: 12px; color: #666;">This is an automated notification from your Multi-Exchange Crypto Tracker. Please do not reply to this email.</p>
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

      // Load previous data for this exchange
      const previousData = await loadPreviousListings(exchangeName);
      const previousSymbols = new Set(
        previousData.symbols.map((s) => s.symbol)
      );

      // Fetch current data using the appropriate adapter
      const adapter = exchangeAdapters[exchangeName];
      if (!adapter) {
        console.error(`No adapter found for ${exchangeName}`);
        continue;
      }

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
      await saveListings(exchangeName, currentData);
    } catch (error) {
      console.error(`Error checking listings on ${exchangeName}:`, error);
    }
  }

  // Send email if any new listings were found
  if (allNewListings.length > 0) {
    console.log(
      `Found a total of ${allNewListings.length} new listings across all exchanges!`
    );
    await sendEmail(allNewListings);
  } else {
    console.log("No new listings found on any exchange.");
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
    const testListings = [
      {
        symbol: "TEST-BTC",
        baseAsset: "TEST",
        quoteAsset: "BTC",
        exchange: "binance",
      },
      {
        symbol: "TEST-USD",
        baseAsset: "TEST",
        quoteAsset: "USD",
        exchange: "coinbase",
      },
    ];

    const success = await sendEmail(testListings);

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
    `Crypto listing monitor started. Checking every ${config.checkInterval} (cron format).`
  );

  // Log enabled exchanges
  const enabledExchanges = Object.entries(config.exchanges)
    .filter(([_, config]) => config.enabled)
    .map(([name, _]) => name.toUpperCase());

  console.log(
    `Monitoring the following exchanges: ${enabledExchanges.join(", ")}`
  );
}

// Start the application
init();
