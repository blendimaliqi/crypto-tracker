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
      const response = await axios.get(
        announcementConfig.binance.announcementUrl
      );
      const html = response.data;

      const $ = cheerio.load(html);
      const announcements = [];

      // Find announcement elements using the correct selectors based on current page structure
      $(".bn-flex.w-full.flex-col.gap-4").each((i, element) => {
        // Title is in an H3 with class typography-body1-1
        const titleElement = $(element).find("h3.typography-body1-1");
        const title = titleElement.text().trim();

        // Check if it's a listing-related announcement
        if (
          title.match(/list|will add|new trading|launch|added|trading pair/i)
        ) {
          // URL is in an A tag parent of the title
          const linkElement = $(element).find("a");
          const url = linkElement.attr("href");
          const fullUrl = url
            ? url.startsWith("http")
              ? url
              : `https://www.binance.com${url}`
            : "";

          // Extract date if available - usually in a div without children
          let date = new Date().toISOString();
          const dateText = $(element)
            .find(".bn-flex.flex-col.gap-1 div:not(:has(*))")
            .text()
            .trim();
          if (dateText) {
            try {
              // Check if the date has a year that seems like a future year (site formatting quirk)
              const dateMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
              if (dateMatch) {
                const year = parseInt(dateMatch[1]);
                const currentYear = new Date().getFullYear();
                // If the year is in the future, assume it's a typo and use current year
                if (year > currentYear + 1) {
                  const correctedDate = dateText.replace(year, currentYear);
                  date = new Date(correctedDate).toISOString();
                } else {
                  date = new Date(dateText).toISOString();
                }
              } else {
                date = new Date(dateText).toISOString();
              }
            } catch (e) {
              // Keep default date
              console.log(`Could not parse date: ${dateText}`);
            }
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

          if (fullUrl && symbols.length > 0) {
            console.log(`Found Binance announcement: ${title}`);
            announcements.push({
              title,
              url: fullUrl,
              date,
              symbols,
              exchange: "binance",
              source: "announcement",
            });
          }
        }
      });

      console.log(`Total Binance announcements found: ${announcements.length}`);
      return { announcements };
    } catch (error) {
      console.error("Error fetching Binance announcements:", error);
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
      const response = await axios.get(announcementConfig.okx.announcementUrl);
      const html = response.data;

      const $ = cheerio.load(html);
      const announcements = [];

      // Find announcement elements on the new listings page
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
          const fullUrl = url.startsWith("http")
            ? url
            : `https://www.okx.com${url}`;

          // Try to get the date from a sibling element containing date info
          let date = new Date().toISOString();
          const parent = $(element).parent();
          const siblings = parent.siblings();

          // Look for a sibling element with date information
          siblings.each((j, sibling) => {
            const siblingText = $(sibling).text().trim();
            if (siblingText.includes("Published on")) {
              try {
                const dateText = siblingText.replace("Published on", "").trim();
                date = new Date(dateText).toISOString();
              } catch (e) {
                // Keep default date
              }
            }
          });

          // Extract potential coin symbols
          const titleText = title.toUpperCase();

          // Look for symbols in parentheses
          const symbolsInParentheses =
            titleText.match(/\(([A-Z0-9]+)\)/g) || [];
          const extractedFromParentheses = symbolsInParentheses.map((s) =>
            s.replace(/[()]/g, "")
          );

          // Look for tokens mentioned directly
          const generalSymbolMatches =
            titleText.match(/\b[A-Z0-9]{2,10}\b/g) || [];

          // Combine and filter symbols
          const allSymbols = [
            ...extractedFromParentheses,
            ...generalSymbolMatches,
          ];
          const symbols = allSymbols.filter(
            (s) =>
              ![
                "OKX",
                "NEW",
                "USD",
                "USDT",
                "USDC",
                "EUR",
                "GBP",
                "THE",
                "FOR",
                "AND",
                "WILL",
                "LIST",
                "SPOT",
                "TRADING",
              ].includes(s)
          );

          if (symbols.length > 0) {
            announcements.push({
              title,
              url: fullUrl,
              date,
              symbols,
              exchange: "okx",
              source: "announcement",
            });
          }
        }
      });

      return { announcements };
    } catch (error) {
      console.error("Error fetching OKX announcements:", error);
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

// Initialize and start the monitor
async function init() {
  try {
    // Ensure data directory exists
    await ensureDataDirExists();

    // Test email functionality if applicable
    if (config.email.enabled && config.testOnStartup) {
      await testEmailSetup();
    }

    // Run initial check
    console.log("Running initial checks for new listings and announcements...");
    await checkNewListings();
    await checkNewAnnouncements();

    // Schedule recurring checks
    cron.schedule(config.checkInterval, async () => {
      await checkNewListings();
      await checkNewAnnouncements();
    });
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
  } catch (error) {
    console.error("Error initializing the application:", error);
    process.exit(1);
  }
}

// Start the application
init();
