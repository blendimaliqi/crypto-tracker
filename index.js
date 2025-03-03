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
  console.error("No SendGrid API key found in environment variables! ");
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
            Referer: "https://www.binance.com/",
            "sec-ch-ua":
              '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
          },
          // Try to use a proxy if the URL is likely to be blocked
          ...(process.env.HTTPS_PROXY
            ? {
                proxy: false,
                httpsAgent: new require("https").Agent({
                  proxy: process.env.HTTPS_PROXY,
                  rejectUnauthorized: false,
                }),
              }
            : {}),
        }
      );

      console.log(`Binance response status: ${response.status}`);

      if (response.status !== 200) {
        console.error(
          `Binance returned non-200 status code: ${response.status}`
        );
        return [];
      }

      const $ = cheerio.load(response.data);
      console.log("Successfully loaded Binance HTML with cheerio");

      const announcements = [];

      // Log the number of announcement elements found
      const announcementElements = $(".css-wpq04z");
      console.log(
        `Found ${announcementElements.length} announcement elements on Binance page`
      );

      $(".css-wpq04z").each((i, element) => {
        try {
          const titleElement = $(element).find(".css-1ej4hfo");
          const title = titleElement.text().trim();

          // Skip if no title found
          if (!title) {
            console.log(
              `Skipping Binance announcement #${i + 1}: No title found`
            );
            return;
          }

          console.log(`Processing Binance announcement: "${title}"`);

          // Only process announcements with "list" or "add" in title
          const keywords = [
            "list",
            "add ",
            "adds ",
            "added ",
            "adding ",
            "support",
            "delist",
          ];
          const hasKeyword = keywords.some((keyword) =>
            title.toLowerCase().includes(keyword)
          );

          if (!hasKeyword) {
            console.log(
              `Skipping Binance announcement: "${title}" - No relevant keywords`
            );
            return;
          }

          const url = $(element).find("a").attr("href");
          const fullUrl = url ? `https://www.binance.com${url}` : "";

          if (!fullUrl) {
            console.log(
              `Skipping Binance announcement: "${title}" - No URL found`
            );
            return;
          }

          const dateText = $(element).find(".css-1fhwoir").text().trim();
          console.log(`Binance announcement date text: "${dateText}"`);

          // Parse date from text
          let date = new Date();
          const matches = dateText.match(/(\d{4}-\d{2}-\d{2})/);
          if (matches && matches[1]) {
            const dateStr = matches[1];
            date = new Date(dateStr);

            // Check for invalid future dates (sometimes Binance shows 2025 incorrectly)
            const currentYear = new Date().getFullYear();
            if (date.getFullYear() > currentYear + 1) {
              console.log(
                `Correcting future date ${date.toISOString()} to current year`
              );
              date.setFullYear(currentYear);
            }
          } else {
            console.log(
              `Could not parse date from "${dateText}", using current date`
            );
          }

          // Extract potential symbols from title
          const symbols = [];

          // Look for symbols in parentheses
          const symbolMatches = title.match(/\(([A-Z0-9]{2,10})\)/g);
          if (symbolMatches) {
            symbolMatches.forEach((match) => {
              const symbol = match.replace(/[()]/g, "");
              if (symbol.length >= 2 && symbol.length <= 10) {
                symbols.push(symbol);
              }
            });
          }

          // Extract tokens mentioned as "Token Name (SYMBOL)"
          const tokenSymbolMatch = title.match(/(\w+)\s+\(([A-Z0-9]{2,10})\)/g);
          if (tokenSymbolMatch) {
            tokenSymbolMatch.forEach((match) => {
              const symbolMatch = match.match(/\(([A-Z0-9]{2,10})\)/);
              if (symbolMatch && symbolMatch[1]) {
                const symbol = symbolMatch[1];
                if (
                  symbol.length >= 2 &&
                  symbol.length <= 10 &&
                  !symbols.includes(symbol)
                ) {
                  symbols.push(symbol);
                }
              }
            });
          }

          // Look for general symbols by word pattern
          const words = title.split(/\s+/);
          words.forEach((word) => {
            // Match typical crypto symbols: all caps, 2-10 chars, may contain numbers
            if (/^[A-Z0-9]{2,10}$/.test(word) && !symbols.includes(word)) {
              if (!["FOR", "AND", "THE", "NEW", "USD", "USDT"].includes(word)) {
                symbols.push(word);
              }
            }
          });

          console.log(
            `Extracted symbols for "${title}": ${
              symbols.join(", ") || "none found"
            }`
          );

          announcements.push({
            title,
            url: fullUrl,
            date,
            symbols,
            exchange: "Binance",
            source: "announcement",
          });

          console.log(`Successfully added Binance announcement: "${title}"`);
        } catch (error) {
          console.error(
            `Error processing Binance announcement element #${i + 1}:`,
            error
          );
        }
      });

      console.log(
        `Total Binance announcements processed: ${announcements.length}`
      );
      return announcements;
    } catch (error) {
      console.error("Error fetching Binance announcements:", error.message);
      // Log more details about the error
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Binance error response data:", error.response.data);
        console.error("Binance error response status:", error.response.status);
        console.error(
          "Binance error response headers:",
          error.response.headers
        );
      } else if (error.request) {
        // The request was made but no response was received
        console.error("Binance no response received:", error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Binance error config:", error.config);
      }
      return [];
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, announcementConfig.binance.dataFile);
  },
};
