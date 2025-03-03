const axios = require("axios");
const sgMail = require("@sendgrid/mail");
const cron = require("node-cron");
const fs = require("fs").promises;
const path = require("path");
const dotenv = require("dotenv");
const cheerio = require("cheerio");
const nodemailer = require("nodemailer");

// Load environment variables from .env.local file
dotenv.config({ path: ".env.local" });

// Configuration
const config = {
  dataPath: path.join(__dirname, "data"),
  email: {
    enabled: true,
    from: "noreply@blendimaliqi.com",
    to: "blendi.maliqi93@gmail.com",
    apiKey: process.env.SENDGRID_API_KEY || process.env.APP_PASSWORD,
    testOnStartup: true,
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

// Add announcement monitoring config
const announcementConfig = {
  binance: {
    enabled: process.env.ENABLE_BINANCE_ANNOUNCEMENTS === "true",
    announcementUrl: "https://www.binance.com/en/support/announcement/list/48",
    dataFile: "binance_announcements.json",
  },
  okx: {
    enabled: process.env.ENABLE_OKX_ANNOUNCEMENTS === "true",
    announcementUrl:
      "https://www.okx.com/help/section/announcements-new-listings",
    dataFile: "okx_announcements.json",
  },
};

// Exchange announcement implementations - only keep Binance and OKX
const binance = {
  async fetchAnnouncements() {
    try {
      console.log("Fetching Binance announcements...");
      console.log(`Using URL: ${announcementConfig.binance.announcementUrl}`);

      // Add timeout and headers to avoid blocking
      const response = await axios.get(
        announcementConfig.binance.announcementUrl,
        {
          timeout: 30000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            Connection: "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
          },
        }
      );

      console.log(`Binance response status: ${response.status}`);

      const html = response.data;
      // Log a small sample of the HTML to verify we're getting content
      console.log(`HTML sample (first 200 chars): ${html.substring(0, 200)}`);

      const $ = cheerio.load(html);
      const announcements = [];

      // Count elements to verify selectors are working
      const totalElements = $(".bn-flex.w-full.flex-col.gap-4").length;
      console.log(`Found ${totalElements} potential announcement elements`);

      // Find announcement elements using the correct selectors based on current page structure
      $(".bn-flex.w-full.flex-col.gap-4").each((i, element) => {
        try {
          // Title is in an H3 with class typography-body1-1
          const titleElement = $(element).find("h3.typography-body1-1");
          const title = titleElement.text().trim();

          console.log(
            `Processing element ${i + 1}/${totalElements}, title: ${title}`
          );

          // Check if it's a listing-related announcement
          if (
            title.match(/list|will add|new trading|launch|added|trading pair/i)
          ) {
            console.log(`Found listing-related announcement: ${title}`);

            // URL is in an A tag parent of the title
            const linkElement = $(element).find("a");
            const url = linkElement.attr("href");
            const fullUrl = url
              ? url.startsWith("http")
                ? url
                : `https://www.binance.com${url}`
              : "";

            if (!fullUrl) {
              console.log(`Warning: No URL found for announcement: ${title}`);
              return; // Skip this announcement
            }

            // Extract date if available - usually in a div without children
            let date = new Date().toISOString();
            const dateText = $(element)
              .find(".bn-flex.flex-col.gap-1 div:not(:has(*))")
              .text()
              .trim();
            if (dateText) {
              try {
                console.log(`Found date text: ${dateText}`);
                // Check if the date has a year that seems like a future year (site formatting quirk)
                const dateMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (dateMatch) {
                  const year = parseInt(dateMatch[1]);
                  const currentYear = new Date().getFullYear();
                  // If the year is in the future, assume it's a typo and use current year
                  if (year > currentYear + 1) {
                    const correctedDate = dateText.replace(year, currentYear);
                    date = new Date(correctedDate).toISOString();
                    console.log(
                      `Corrected future date ${dateText} to ${correctedDate}`
                    );
                  } else {
                    date = new Date(dateText).toISOString();
                  }
                } else {
                  date = new Date(dateText).toISOString();
                }
              } catch (e) {
                // Keep default date
                console.log(
                  `Could not parse date: ${dateText}. Error: ${e.message}`
                );
              }
            } else {
              console.log(`No date text found for announcement: ${title}`);
            }

            // Extract potential coin symbols with improved filtering
            const titleText = title.toUpperCase();

            // Look for symbols in parentheses - most reliable source
            const symbolsInParentheses =
              titleText.match(/\(([A-Z0-9]{2,10})\)/g) || [];
            const extractedFromParentheses = symbolsInParentheses.map((s) =>
              s.replace(/[()]/g, "")
            );

            // Look for specific formats like: "Will Add X", "Launch X", etc.
            let extractedFromContext = [];

            if (title.match(/will add|listing|adds|list/i)) {
              const addMatch = title.match(
                /will add|adds|listing|list\s+([A-Z0-9]{2,10})/i
              );
              if (addMatch && addMatch[1]) {
                extractedFromContext.push(addMatch[1].toUpperCase());
              }
            }

            // Look for symbols that appear alongside the word "token" or "coin"
            const tokenMatches =
              titleText.match(
                /([A-Z0-9]{2,10})\s+TOKEN|TOKEN\s+([A-Z0-9]{2,10})/g
              ) || [];
            tokenMatches.forEach((match) => {
              const parts = match.split(/\s+/);
              parts.forEach((part) => {
                if (part !== "TOKEN" && /^[A-Z0-9]{2,10}$/.test(part)) {
                  extractedFromContext.push(part);
                }
              });
            });

            // Look for patterns like BTCUSDT, ETHUSDT (typical trading pair format)
            const tradingPairMatches =
              titleText.match(/[A-Z0-9]{2,8}(USDT|BTC|ETH|BNB)/g) || [];
            tradingPairMatches.forEach((pair) => {
              const base = pair.replace(/(USDT|BTC|ETH|BNB)$/, "");
              if (base.length >= 2 && base.length <= 8) {
                extractedFromContext.push(base);
              }
            });

            // General token symbols - with extensive filtering to remove common words
            const generalSymbolMatches =
              titleText.match(/\b[A-Z0-9]{2,8}\b/g) || [];

            // Combine all sources with priority to more reliable sources
            const allSymbols = [
              ...extractedFromParentheses,
              ...extractedFromContext,
              ...generalSymbolMatches,
            ];

            // More extensive filtering of common words and false positives
            const commonWords = [
              "BINANCE",
              "NEW",
              "ADD",
              "ADDS",
              "WILL",
              "THE",
              "FOR",
              "AND",
              "WITH",
              "USDⓈ",
              "USD",
              "USDT",
              "USDC",
              "BUSD",
              "EUR",
              "GBP",
              "JPY",
              "BTC",
              "ETH",
              "BNB",
              "SPOT",
              "MARGIN",
              "FUTURES",
              "EARN",
              "TRADING",
              "PAIRS",
              "PAIR",
              "ZERO",
              "FEE",
              "FEES",
              "BUY",
              "SELL",
              "CONVERT",
              "LAUNCH",
              "LIST",
              "NOTICE",
              "CAP",
              "PRE",
              "MARKET",
              "SERVICES",
              "BOTS",
              "COPY",
              "TOKEN",
              "TOKENS",
              "CRYPTO",
            ];

            // Keep only unique symbols after filtering
            const symbols = [...new Set(allSymbols)].filter(
              (s) =>
                !commonWords.includes(s) &&
                s.length >= 2 &&
                s.length <= 8 &&
                !/^\d+$/.test(s) // Filter out numbers-only strings
            );

            console.log(`Extracted symbols: ${symbols.join(", ")}`);

            if (fullUrl && symbols.length > 0) {
              console.log(`Adding Binance announcement: ${title}`);
              announcements.push({
                title,
                url: fullUrl,
                date,
                symbols,
                exchange: "binance",
                source: "announcement",
              });
            } else {
              console.log(
                `Skipping announcement (no URL or no symbols): ${title}`
              );
            }
          }
        } catch (elementError) {
          console.error(`Error processing element ${i}:`, elementError);
        }
      });

      console.log(`Total Binance announcements found: ${announcements.length}`);

      // Debug info - write to file if in development
      if (
        process.env.NODE_ENV === "development" ||
        announcements.length === 0
      ) {
        try {
          const debugInfo = {
            timestamp: new Date().toISOString(),
            totalElements,
            announcements,
          };
          // Write debug info to file
          const fs = require("fs");
          fs.writeFileSync(
            "binance-debug.json",
            JSON.stringify(debugInfo, null, 2)
          );
          console.log("Debug info written to binance-debug.json");
        } catch (debugError) {
          console.error("Error writing debug info:", debugError);
        }
      }

      return { announcements };
    } catch (error) {
      console.error("Error fetching Binance announcements:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error(
          "Response headers:",
          JSON.stringify(error.response.headers)
        );
      }
      return { announcements: [] };
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, announcementConfig.binance.dataFile);
  },
};

const okx = {
  async fetchAnnouncements() {
    try {
      console.log("Fetching OKX announcements...");
      console.log(`Using URL: ${announcementConfig.okx.announcementUrl}`);

      // Add timeout and headers to prevent blocking
      const response = await axios.get(announcementConfig.okx.announcementUrl, {
        timeout: 30000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Cache-Control": "max-age=0",
        },
      });

      console.log(`OKX response status: ${response.status}`);

      const html = response.data;
      const $ = cheerio.load(html);
      const announcements = [];

      // Find announcement elements on the new listings page
      let count = 0;
      $("a").each((i, element) => {
        const title = $(element).text().trim();
        const url = $(element).attr("href");

        // Filter by title to find listings
        if (
          title &&
          url &&
          (title.match(/OKX to list/i) ||
            title.match(/for spot trading/i) ||
            title.match(/perpetual/i) ||
            title.match(/listing/i))
        ) {
          count++;
          console.log(`Found OKX announcement #${count}: ${title}`);

          const fullUrl = url.startsWith("http")
            ? url
            : `https://www.okx.com${url}`;

          // Try to get the date from a sibling element containing date info
          let date = new Date().toISOString();
          const parent = $(element).parent();
          const siblings = parent.siblings();
          let dateFound = false;

          // Look for a sibling element with date information
          siblings.each((j, sibling) => {
            const siblingText = $(sibling).text().trim();
            if (siblingText.includes("Published on")) {
              try {
                console.log(`Found date text: ${siblingText}`);
                const dateText = siblingText.replace("Published on", "").trim();

                // Check if there's a future year issue
                const dateMatch = dateText.match(
                  /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/
                );
                if (dateMatch) {
                  const year = parseInt(dateMatch[3]);
                  const currentYear = new Date().getFullYear();

                  // If the year is in the future by more than one year, assume it's a formatting issue
                  if (year > currentYear + 1) {
                    const correctedDateText = dateText.replace(
                      year,
                      currentYear
                    );
                    console.log(
                      `Correcting future date ${dateText} to ${correctedDateText}`
                    );
                    date = new Date(correctedDateText).toISOString();
                  } else {
                    date = new Date(dateText).toISOString();
                  }
                } else {
                  date = new Date(dateText).toISOString();
                }
                dateFound = true;
              } catch (e) {
                console.log(`Error parsing date: ${e.message}`);
                // Keep default date
              }
            }
          });

          if (!dateFound) {
            console.log(`No date found for: ${title}, using current date`);
          }

          // Extract potential coin symbols with improved filtering
          const titleText = title.toUpperCase();

          // Extract main coins with targeted approaches
          let mainCoins = [];

          // Method 1: Extract from "OKX to list X" pattern
          if (titleText.includes("OKX TO LIST")) {
            const listMatch = titleText.match(/OKX TO LIST ([A-Z0-9]{2,10})\s/);
            if (listMatch && listMatch[1]) {
              mainCoins.push(listMatch[1]);
            }
          }

          // Method 2: Extract from "OKX to list X (Full Name)" pattern
          const parenthesesSymbols =
            titleText.match(/\(([A-Z0-9]{2,10})\)/g) || [];
          mainCoins.push(
            ...parenthesesSymbols.map((s) => s.replace(/[()]/g, ""))
          );

          // Method 3: Extract from paired words - X Network, X Protocol, etc.
          const pairedSymbols =
            titleText.match(
              /([A-Z0-9]{2,10})\s+(NETWORK|PROTOCOL|CHAIN|TOKEN)/g
            ) || [];
          pairedSymbols.forEach((match) => {
            const parts = match.split(/\s+/);
            if (parts[0] && parts[0].length >= 2 && parts[0].length <= 10) {
              mainCoins.push(parts[0]);
            }
          });

          // Method 4: Look for trading pairs like XUSDT
          const tradingPairs =
            titleText.match(/([A-Z0-9]{2,8})(USDT|BTC|ETH|USD)/g) || [];
          tradingPairs.forEach((pair) => {
            const base = pair.replace(/(USDT|BTC|ETH|USD)$/, "");
            if (base.length >= 2 && base.length <= 8) {
              mainCoins.push(base);
            }
          });

          // Backup method: Extract all potential symbols
          const generalSymbols = titleText.match(/\b[A-Z0-9]{2,8}\b/g) || [];

          // Filter common words and non-tokens
          const commonWords = [
            "OKX",
            "NEW",
            "AND",
            "FOR",
            "THE",
            "WILL",
            "LIST",
            "TO",
            "ADD",
            "SPOT",
            "TRADING",
            "MARGIN",
            "FUTURES",
            "WITH",
            "ALONG",
            "ITS",
            "SIMPLE",
            "EARN",
            "CRYPTO",
            "PERPETUAL",
            "PUBLISH",
            "ON",
            "FEB",
            "JAN",
            "MAR",
            "APR",
            "MAY",
            "JUN",
            "JUL",
            "AUG",
            "SEP",
            "OCT",
            "NOV",
            "DEC",
            "PUBLISHED",
            "USD",
            "USDT",
            "BTC",
            "ETH",
          ];

          // When no main coins found, use general symbols with filtering
          let symbols =
            mainCoins.length > 0
              ? [...new Set(mainCoins)]
              : [...new Set(generalSymbols)].filter(
                  (s) =>
                    !commonWords.includes(s) &&
                    s.length >= 2 &&
                    s.length <= 8 &&
                    !/^\d+$/.test(s) // Filter out numbers-only
                );

          console.log(`Extracted symbols: ${symbols.join(", ") || "none"}`);

          // Final filter to remove any residual noise
          symbols = symbols.filter((s) => !commonWords.includes(s));

          if (symbols.length > 0) {
            console.log(
              `Adding announcement with symbols: ${symbols.join(", ")}`
            );
            announcements.push({
              title,
              url: fullUrl,
              date,
              symbols,
              exchange: "okx",
              source: "announcement",
            });
          } else {
            console.log(`Skipping announcement (no symbols found): ${title}`);
          }
        }
      });

      console.log(`Total OKX announcements found: ${announcements.length}`);
      return { announcements };
    } catch (error) {
      console.error("Error fetching OKX announcements:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error(
          "Response headers:",
          JSON.stringify(error.response.headers)
        );
      }
      return { announcements: [] };
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, announcementConfig.okx.dataFile);
  },
};

// Modify checkNewAnnouncements to only check Binance and OKX
async function checkNewAnnouncements() {
  console.log("Checking for new announcements...");

  const allNewAnnouncements = [];
  // Only check Binance and OKX announcements
  const exchanges = ["binance", "okx"];

  for (const exchange of exchanges) {
    if (
      !announcementConfig[exchange] ||
      !announcementConfig[exchange].enabled
    ) {
      continue;
    }

    console.log(`Checking ${exchange} announcements...`);
    const exchangeImpl = eval(exchange);

    try {
      // Load previous announcements
      const previousAnnouncements = await loadPreviousAnnouncements(exchange);

      // Fetch new announcements
      const result = await exchangeImpl.fetchAnnouncements();
      const newAnnouncements = result.announcements.filter((announcement) => {
        return !previousAnnouncements.some(
          (prev) =>
            prev.url === announcement.url || prev.title === announcement.title
        );
      });

      if (newAnnouncements.length > 0) {
        console.log(
          `Found ${newAnnouncements.length} new ${exchange} announcements!`
        );

        // Save all announcements (new and old)
        await saveAnnouncements(
          exchange,
          [...previousAnnouncements, ...newAnnouncements].slice(-100) // Keep only the last 100
        );

        allNewAnnouncements.push(...newAnnouncements);
      } else {
        console.log(`No new ${exchange} announcements found.`);
      }
    } catch (error) {
      console.error(`Error checking ${exchange} announcements:`, error);
    }
  }

  if (allNewAnnouncements.length > 0) {
    console.log(
      `Found a total of ${allNewAnnouncements.length} new announcements across all exchanges.`
    );

    // Send email notification
    try {
      await sendAnnouncementEmail(allNewAnnouncements);
    } catch (error) {
      console.error("Error sending announcement email:", error);
    }
  } else {
    console.log("No new announcements found on any exchange.");
  }
}

// Helper functions for announcements
async function loadPreviousAnnouncements(exchange) {
  try {
    const dataFilePath = eval(exchange).getDataFilePath();
    const data = await fs.readFile(dataFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.log(
      `No previous ${exchange} announcements found, creating new file...`
    );
    return [];
  }
}

async function saveAnnouncements(exchange, announcements) {
  try {
    const dataFilePath = eval(exchange).getDataFilePath();
    await fs.writeFile(dataFilePath, JSON.stringify(announcements, null, 2));
    console.log(
      `Saved ${announcements.length} ${exchange} announcements to ${dataFilePath}`
    );
    return true;
  } catch (error) {
    console.error(`Error saving ${exchange} announcements:`, error);
    return false;
  }
}

// Send email about new listing announcements
async function sendAnnouncementEmail(newAnnouncements) {
  if (!config.email.enabled) {
    console.log("Email notifications are disabled. Skipping notification.");
    return false;
  }

  console.log("Preparing email for new listing announcements...");

  // Create HTML for the email body
  let emailBodyHtml = `
    <h2>New Cryptocurrency Listing Announcements Detected</h2>
    <p>The following new listing announcements were detected:</p>
    <table border="1" cellpadding="5" style="border-collapse: collapse;">
      <tr style="background-color: #f0f0f0;">
        <th>Exchange</th>
        <th>Title</th>
        <th>Potential Coins</th>
        <th>Announcement Date</th>
      </tr>
  `;

  // Plain text version
  let emailBodyText = "New Cryptocurrency Listing Announcements Detected\n\n";

  // Sort by exchange name
  newAnnouncements.sort((a, b) => a.exchange.localeCompare(b.exchange));

  // Add each announcement to the email
  for (const announcement of newAnnouncements) {
    const symbolsText =
      announcement.symbols.length > 0
        ? announcement.symbols.join(", ")
        : "Unknown";

    // Add to HTML email
    emailBodyHtml += `
      <tr>
        <td>${announcement.exchange.toUpperCase()}</td>
        <td><a href="${announcement.url}">${announcement.title}</a></td>
        <td>${symbolsText}</td>
        <td>${new Date(announcement.date).toLocaleString()}</td>
      </tr>
    `;

    // Add to plain text email
    emailBodyText += `
Exchange: ${announcement.exchange.toUpperCase()}
Title: ${announcement.title}
Potential Coins: ${symbolsText}
Date: ${new Date(announcement.date).toLocaleString()}
URL: ${announcement.url}
-------------------
    `;
  }

  emailBodyHtml += `
    </table>
    <p>These coins may experience price movements soon due to these announcements.</p>
    <p><small>This email was sent by the Crypto Listing Announcements Monitor.</small></p>
  `;

  emailBodyText +=
    "\nThese coins may experience price movements soon due to these announcements.";

  // Prepare email
  const subject = `🚨 ${newAnnouncements.length} New Crypto Listing Announcements Detected`;

  try {
    if (process.env.SENDGRID_API_KEY) {
      // Use SendGrid
      await sgMail.send({
        to: config.email.to,
        from: config.email.from,
        subject: subject,
        text: emailBodyText,
        html: emailBodyHtml,
      });
      console.log(
        "Announcement notification email sent successfully via SendGrid!"
      );
    } else if (process.env.APP_PASSWORD) {
      // Use Nodemailer as fallback
      let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: config.email.from,
          pass: process.env.APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: config.email.from,
        to: config.email.to,
        subject: subject,
        text: emailBodyText,
        html: emailBodyHtml,
      });
      console.log(
        "Announcement notification email sent successfully via Nodemailer!"
      );
    } else {
      console.error("No email credentials available.");
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending announcement email:", error);
    return false;
  }
}

// Modify the init function to better check configuration
async function init() {
  try {
    console.log("Starting cryptocurrency listing monitor...");

    await ensureDataDirExists();

    // Test email setup if enabled
    if (config.email.testOnStartup && config.email.enabled) {
      await testEmailSetup();
    }

    // Verify exchange settings
    console.log("Checking configuration...");
    let issuesFound = false;

    // Check announcement settings
    if (
      !announcementConfig.binance.enabled &&
      !announcementConfig.okx.enabled
    ) {
      console.warn(
        "⚠️ Warning: Both Binance and OKX announcement monitoring are disabled. Set ENABLE_BINANCE_ANNOUNCEMENTS=true and/or ENABLE_OKX_ANNOUNCEMENTS=true in the .env.local file to enable them."
      );
      issuesFound = true;
    } else {
      const enabledCount =
        (announcementConfig.binance.enabled ? 1 : 0) +
        (announcementConfig.okx.enabled ? 1 : 0);
      console.log(`✓ ${enabledCount} announcement source(s) enabled.`);

      // Check individual settings
      if (announcementConfig.binance.enabled) {
        console.log("✓ Binance announcement monitoring enabled.");
      } else {
        console.log("ℹ️ Binance announcement monitoring is disabled.");
      }

      if (announcementConfig.okx.enabled) {
        console.log("✓ OKX announcement monitoring enabled.");
      } else {
        console.log("ℹ️ OKX announcement monitoring is disabled.");
      }
    }

    // Run initial check for listings and announcements
    console.log("Running initial checks for new listings and announcements...");

    if (issuesFound) {
      console.log(
        "⚠️ Some issues were found with the configuration. See warnings above."
      );
    }

    // Check for announcements if at least one is enabled
    if (announcementConfig.binance.enabled || announcementConfig.okx.enabled) {
      await checkNewAnnouncements();
    }

    // Check for new exchange listings
    await checkNewListings();

    // Schedule periodic checks
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

    // Log enabled announcement sources
    const enabledAnnouncementSources = Object.entries(announcementConfig)
      .filter(([_, config]) => config.enabled)
      .map(([name, _]) => name.toUpperCase());

    if (enabledAnnouncementSources.length > 0) {
      console.log(
        `Monitoring announcements from: ${enabledAnnouncementSources.join(
          ", "
        )}`
      );
    }

    // Schedule regular checks using node-cron
    cron.schedule(config.checkInterval, async () => {
      try {
        console.log("\n--- Running scheduled check ---");
        await checkNewListings();
        if (
          announcementConfig.binance.enabled ||
          announcementConfig.okx.enabled
        ) {
          await checkNewAnnouncements();
        }
      } catch (error) {
        console.error("Error during scheduled check:", error);
      }
    });
  } catch (error) {
    console.error("Error initializing the application:", error);
    process.exit(1);
  }
}

// Start the application
init();
