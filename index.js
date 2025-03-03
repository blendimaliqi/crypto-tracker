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
    // Add nodemailer config as a fallback option
    nodemailer: {
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "",
        pass: process.env.APP_PASSWORD || "",
      },
    },
    useNodemailer: !process.env.SENDGRID_API_KEY && !!process.env.APP_PASSWORD,
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

// Initialize SendGrid with API key if available, otherwise setup nodemailer
let transporter = null;
if (config.email.apiKey && !config.email.useNodemailer) {
  sgMail.setApiKey(config.email.apiKey);
  console.log("SendGrid initialized with API key");
} else if (config.email.useNodemailer) {
  // Create nodemailer transporter
  transporter = nodemailer.createTransport({
    service: config.email.nodemailer.service,
    auth: config.email.nodemailer.auth,
  });
  console.log("Nodemailer transporter initialized");
} else {
  console.error("No email configuration found in environment variables!");
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
    announcementUrl:
      "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing?c=48&navId=48",
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

      // IMPORTANT: Binance uses a dynamic site with JavaScript that can't be properly scraped with Cheerio
      // Ideally, we'd use Puppeteer or similar here to handle JavaScript rendering
      console.log(
        "Note: For proper Binance scraping, we should use Puppeteer or similar to handle dynamic content"
      );

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
          },
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

      // Based on the screenshot, target specific typography elements that contain listings
      console.log(
        "Targeting specific typography elements for announcements..."
      );

      // Try to find h3 elements with typography class (seen in screenshot)
      const typographyElements = $(
        'h3.typography-body1-1, h3[class*="typography"], div[class*="typography"]'
      );
      console.log(`Found ${typographyElements.length} typography elements`);

      typographyElements.each((i, element) => {
        try {
          const text = $(element).text().trim();
          if (!text || text.length < 10) return;

          console.log(`Found typography text: "${text}"`);

          // Check if it's a listing announcement (contains "Add", "List", token names, etc.)
          const listingKeywords = [
            "will add",
            "adds",
            "adding",
            "will list",
            "lists",
            "listing",
            "added",
            "new cryptocurrency",
          ];

          const hasListingKeyword = listingKeywords.some((kw) =>
            text.toLowerCase().includes(kw)
          );

          if (hasListingKeyword) {
            // Get URL from parent a tag if possible
            let url = "";
            const parentLink = $(element).closest("a");
            if (parentLink.length) {
              url = $(parentLink).attr("href");
            }

            if (!url) {
              // Try to find nearby link with announcement details
              const nearbyLink = $(element).parent().find("a");
              if (nearbyLink.length) {
                url = $(nearbyLink).attr("href");
              }
            }

            // Fallback URL
            if (!url) {
              url = announcementConfig.binance.announcementUrl;
            }

            // Make sure URL is absolute
            if (url && !url.startsWith("http")) {
              url = `https://www.binance.com${url}`;
            }

            // Extract symbols using regex - look for (TOKEN) pattern
            const symbols = [];
            const symbolMatches = text.match(/\(([A-Z0-9]{2,10})\)/g);
            if (symbolMatches) {
              symbolMatches.forEach((match) => {
                const symbol = match.replace(/[()]/g, "");
                if (
                  symbol.length >= 2 &&
                  symbol.length <= 10 &&
                  !["FOR", "THE", "AND", "USD", "USDT", "BTC", "ETH"].includes(
                    symbol
                  )
                ) {
                  symbols.push(symbol);
                }
              });
            }

            console.log(
              `Found listing announcement: "${text}" with symbols: ${
                symbols.join(", ") || "none"
              }`
            );

            announcements.push({
              title: text,
              url,
              date: new Date(),
              symbols,
              exchange: "Binance",
              source: "announcement",
            });
          }
        } catch (err) {
          console.log(`Error processing typography element: ${err.message}`);
        }
      });

      // If no announcements found with primary method, try fallback methods
      if (announcements.length === 0) {
        // Method 1: Extract from script tags (existing code)
        const scriptTags = $("script");
        console.log(`Found ${scriptTags.length} script tags`);

        let foundJsonData = false;
        scriptTags.each((i, element) => {
          const scriptContent = $(element).html();
          if (!scriptContent) return;

          try {
            // Try to find any JSON data that looks like an array of announcements
            // This is a more aggressive approach to find data in script tags
            const jsonMatches = scriptContent.match(
              /(\[\s*\{\s*"[^"]+"\s*:\s*[^{]+\}\s*(?:,\s*\{[^}]+\}\s*)*\])/g
            );

            if (jsonMatches) {
              for (const match of jsonMatches) {
                try {
                  const jsonData = JSON.parse(match);

                  // Check if this looks like an array of announcement objects
                  if (
                    Array.isArray(jsonData) &&
                    jsonData.length > 0 &&
                    (jsonData[0].title ||
                      jsonData[0].name ||
                      jsonData[0].headline)
                  ) {
                    console.log(
                      `Found potential announcement data with ${jsonData.length} items`
                    );
                    foundJsonData = true;

                    jsonData.forEach((item) => {
                      // Extract title using various possible field names
                      const title =
                        item.title ||
                        item.name ||
                        item.headline ||
                        item.subject ||
                        "";
                      let url = item.url || item.link || item.href || "";

                      // Filter out navigational items
                      if (
                        title.startsWith("ba-") ||
                        title.startsWith("footer") ||
                        title.includes("_") ||
                        title.length < 10
                      ) {
                        return;
                      }

                      // Fix URL if needed
                      if (url && !url.startsWith("http")) {
                        url = `https://www.binance.com${url}`;
                      }

                      if (title && url) {
                        const symbols = [];

                        // Extract symbols from title
                        const symbolMatches =
                          title.match(/\(([A-Z0-9]{2,10})\)/g);
                        if (symbolMatches) {
                          symbolMatches.forEach((match) => {
                            const symbol = match.replace(/[()]/g, "");
                            if (
                              symbol.length >= 2 &&
                              symbol.length <= 10 &&
                              ![
                                "FOR",
                                "THE",
                                "AND",
                                "USD",
                                "USDT",
                                "BTC",
                                "ETH",
                              ].includes(symbol)
                            ) {
                              symbols.push(symbol);
                            }
                          });
                        }

                        announcements.push({
                          title,
                          url,
                          date: new Date(),
                          symbols,
                          exchange: "Binance",
                          source: "announcement",
                        });

                        console.log(
                          `Added Binance announcement from JSON: "${title}" with symbols: ${
                            symbols.join(", ") || "none"
                          }`
                        );
                      }
                    });
                  }
                } catch (e) {
                  // Ignore parsing errors for individual matches
                }
              }
            }

            // Look for patterns like "list":[{...announcement data...}]
            const listMatch = scriptContent.match(/"list":\s*(\[.+?\])/s);
            if (listMatch && listMatch[1]) {
              console.log("Found list data in script tag");
              foundJsonData = true;

              try {
                // Try to parse the JSON array
                const jsonStr = listMatch[1].replace(/\\"/g, '"');
                let announcementData = JSON.parse(jsonStr);

                if (
                  Array.isArray(announcementData) &&
                  announcementData.length > 0
                ) {
                  console.log(
                    `Found ${announcementData.length} announcements in JSON data`
                  );

                  announcementData.forEach((item) => {
                    // Extract relevant information from the JSON
                    // Log each item to see what's available
                    console.log(
                      "Processing announcement:",
                      JSON.stringify(item).substring(0, 200)
                    );

                    // Try multiple possible field names
                    const title =
                      item.title ||
                      item.name ||
                      item.summary ||
                      item.headline ||
                      item.subject ||
                      "";
                    let url =
                      item.url || item.link || item.href || item.path || "";

                    // Filter out menu and footer items
                    if (
                      title.startsWith("ba-") ||
                      title.startsWith("footer") ||
                      title.includes("_") ||
                      title.length < 10
                    ) {
                      return;
                    }

                    // If we have an ID but no URL, try to construct one
                    if (!url && item.id) {
                      url = `/en/support/announcement/${item.id}`;
                    }

                    // Fix URL if needed
                    if (url && !url.startsWith("http")) {
                      url = `https://www.binance.com${url}`;
                    }

                    console.log(`Extracted title: "${title}", url: ${url}`);

                    if (title && url) {
                      // Check if this looks like a listing announcement
                      const keywords = [
                        "list",
                        "add",
                        "adds",
                        "added",
                        "adding",
                        "support",
                        "delist",
                        "new",
                        "token",
                      ];

                      // Get content from code or content fields if available
                      let content = "";
                      if (item.content) content += item.content + " ";
                      if (item.code) content += item.code + " ";
                      if (item.description) content += item.description + " ";
                      if (item.text) content += item.text + " ";

                      // Check title and content for keywords
                      const fullText = (title + " " + content).toLowerCase();
                      const hasKeyword = keywords.some((kw) =>
                        fullText.includes(kw)
                      );

                      // Extract symbols
                      const symbols = [];

                      // Try to extract from tags if available
                      if (item.tags && Array.isArray(item.tags)) {
                        item.tags.forEach((tag) => {
                          if (
                            /^[A-Z0-9]{2,10}$/.test(tag) &&
                            !["BTC", "ETH", "USD", "USDT"].includes(tag)
                          ) {
                            symbols.push(tag);
                          }
                        });
                      }

                      // Extract from title as fallback
                      const symbolMatches =
                        title.match(/\(([A-Z0-9]{2,10})\)/g);
                      if (symbolMatches) {
                        symbolMatches.forEach((match) => {
                          const symbol = match.replace(/[()]/g, "");
                          if (
                            symbol.length >= 2 &&
                            symbol.length <= 10 &&
                            !symbols.includes(symbol) &&
                            !["BTC", "ETH", "USD", "USDT"].includes(symbol)
                          ) {
                            symbols.push(symbol);
                          }
                        });
                      }

                      announcements.push({
                        title,
                        url,
                        date: new Date(),
                        symbols,
                        exchange: "Binance",
                        source: "announcement",
                      });

                      console.log(
                        `Added Binance announcement from script: "${title}" with symbols: ${
                          symbols.join(", ") || "none"
                        }`
                      );
                    }
                  });
                }
              } catch (jsonError) {
                console.log(
                  "Error parsing JSON from script tag:",
                  jsonError.message
                );
              }
            }
          } catch (err) {
            // Ignore errors in individual script tags
          }
        });

        // Method 2: If no JSON data found, try direct extraction from links
        if (announcements.length === 0) {
          console.log(
            "No JSON data found, trying direct extraction from links"
          );

          // Find all links
          const links = $("a");
          console.log(`Found ${links.length} links on the page`);

          links.each((i, element) => {
            try {
              const href = $(element).attr("href");
              const text = $(element).text().trim();

              // If it looks like an announcement link with relevant keywords
              if (
                href &&
                text &&
                href.includes("/announcement") &&
                text.length > 10 &&
                !text.startsWith("ba-") &&
                !text.startsWith("footer") &&
                !text.includes("_")
              ) {
                const keywords = [
                  "list",
                  "add",
                  "adds",
                  "added",
                  "adding",
                  "support",
                  "delist",
                ];
                const hasKeyword = keywords.some((kw) =>
                  text.toLowerCase().includes(kw)
                );

                if (hasKeyword) {
                  const fullUrl = href.startsWith("http")
                    ? href
                    : `https://www.binance.com${href}`;

                  // Extract symbols
                  const symbols = [];
                  const symbolMatches = text.match(/\(([A-Z0-9]{2,10})\)/g);
                  if (symbolMatches) {
                    symbolMatches.forEach((match) => {
                      const symbol = match.replace(/[()]/g, "");
                      if (symbol.length >= 2 && symbol.length <= 10) {
                        symbols.push(symbol);
                      }
                    });
                  }

                  announcements.push({
                    title: text,
                    url: fullUrl,
                    date: new Date(),
                    symbols,
                    exchange: "Binance",
                    source: "announcement",
                  });

                  console.log(
                    `Added Binance announcement from link: "${text}" with symbols: ${
                      symbols.join(", ") || "none"
                    }`
                  );
                }
              }
            } catch (err) {
              // Ignore errors in individual links
            }
          });
        }
      }

      console.log(
        `Total Binance announcements processed: ${announcements.length}`
      );
      return announcements;
    } catch (error) {
      console.error("Error fetching Binance announcements:", error.message);
      return [];
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, announcementConfig.binance.dataFile);
  },
};

// Create announcement adapters object
const announcementAdapters = {
  binance: binance,
  // Add OKX adapter
  okx: {
    async fetchAnnouncements() {
      try {
        console.log("Fetching OKX announcements...");
        console.log(`Using URL: ${announcementConfig.okx.announcementUrl}`);

        const response = await axios.get(
          announcementConfig.okx.announcementUrl,
          {
            timeout: 30000,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
              Connection: "keep-alive",
              "Cache-Control": "max-age=0",
            },
          }
        );

        console.log(`OKX response status: ${response.status}`);

        if (response.status !== 200) {
          console.error(`OKX returned non-200 status code: ${response.status}`);
          return [];
        }

        const $ = cheerio.load(response.data);
        console.log("Successfully loaded OKX HTML with cheerio");

        // Print a sample of the page content
        console.log(
          "OKX Page content sample:",
          $("body").text().substring(0, 200)
        );

        const announcements = [];

        // Method 1: Try to find announcements in any container that seems to have listing info
        const possibleSelectors = [
          "article",
          ".listing-item",
          ".announcement-item",
          ".card",
          ".item",
          ".news-item",
          "li a",
          ".support-list-item",
          'a[href*="token"]',
          'a[href*="list"]',
          'a[href*="announcement"]',
        ];

        // Try each selector
        for (const selector of possibleSelectors) {
          const elements = $(selector);
          console.log(
            `Found ${elements.length} elements with selector "${selector}"`
          );

          if (elements.length > 0) {
            elements.each((i, element) => {
              try {
                // Get text from element or its children
                let text = $(element).text().trim();

                // If no text directly, try to find it in children
                if (!text) {
                  const title = $(element)
                    .find("h3, h2, strong, b, span, a")
                    .first();
                  if (title.length) {
                    text = title.text().trim();
                  }
                }

                if (!text || text.length < 10) return;

                // Check if the text contains relevant keywords
                const keywords = [
                  "list",
                  "add",
                  "adds",
                  "added",
                  "adding",
                  "support",
                  "delist",
                  "token",
                ];
                const hasKeyword = keywords.some((kw) =>
                  text.toLowerCase().includes(kw)
                );

                if (hasKeyword) {
                  // Get the URL
                  let url = $(element).is("a")
                    ? $(element).attr("href")
                    : $(element).find("a").attr("href");

                  if (url) {
                    const fullUrl = url.startsWith("http")
                      ? url
                      : `https://www.okx.com${url}`;

                    // Extract potential symbols with improved detection
                    const symbols = [];

                    // Look for symbols in parentheses like "(Symbol)" or "(Symbol Name)"
                    const symbolMatches = text.match(/\(([^)]+)\)/g);
                    if (symbolMatches) {
                      symbolMatches.forEach((match) => {
                        // Remove parentheses and get the content
                        const content = match.slice(1, -1).trim();

                        // If it's a single word in all caps, it's likely a token symbol
                        const words = content.split(/\s+/);
                        if (
                          words.length === 1 &&
                          /^[A-Z0-9]{2,10}$/.test(words[0])
                        ) {
                          symbols.push(words[0]);
                        } else {
                          // Look for capital words that might be symbols
                          const potentialSymbols =
                            content.match(/[A-Z0-9]{2,10}/g);
                          if (potentialSymbols) {
                            potentialSymbols.forEach((sym) => {
                              if (
                                ![
                                  "FOR",
                                  "THE",
                                  "AND",
                                  "OKX",
                                  "ETH",
                                  "BTC",
                                  "USD",
                                  "USDT",
                                ].includes(sym)
                              ) {
                                symbols.push(sym);
                              }
                            });
                          }
                        }
                      });
                    }

                    // Pattern matching for OKX announcements like "OKX to list SYMBOL" or "OKX to list perpetual futures for SYMBOL"
                    if (symbols.length === 0) {
                      const titleSymbols = text.match(
                        /list(?: perpetual(?: futures)? for)? ([A-Z0-9]{2,10})/i
                      );
                      if (titleSymbols && titleSymbols[1]) {
                        const symbol = titleSymbols[1].toUpperCase();
                        if (
                          ![
                            "FOR",
                            "THE",
                            "AND",
                            "OKX",
                            "ETH",
                            "BTC",
                            "USD",
                            "USDT",
                          ].includes(symbol)
                        ) {
                          symbols.push(symbol);
                        }
                      }
                    }

                    // Check if this announcement already exists
                    const exists = announcements.some(
                      (a) => a.title === text || a.url === fullUrl
                    );
                    if (!exists) {
                      announcements.push({
                        title: text,
                        url: fullUrl,
                        date: new Date(),
                        symbols,
                        exchange: "OKX",
                        source: "announcement",
                      });

                      console.log(
                        `Added OKX announcement: "${text}" with symbols: ${
                          symbols.join(", ") || "none"
                        }`
                      );
                    }
                  }
                }
              } catch (err) {
                // Ignore errors in individual elements
              }
            });
          }
        }

        console.log(
          `Total OKX announcements processed: ${announcements.length}`
        );
        return announcements;
      } catch (error) {
        console.error("Error fetching OKX announcements:", error.message);
        return [];
      }
    },
    getDataFilePath() {
      return path.join(config.dataPath, announcementConfig.okx.dataFile);
    },
  },
};

// Add function to check announcements
async function checkNewAnnouncements() {
  console.log("Checking for new announcements across exchanges...");

  let allNewAnnouncements = [];

  // Process each enabled announcement source
  for (const [exchangeName, exchangeConfig] of Object.entries(
    announcementConfig
  )) {
    if (!exchangeConfig.enabled) {
      console.log(
        `Skipping ${exchangeName} announcements (disabled in config)`
      );
      continue;
    }

    try {
      console.log(`Checking for new announcements on ${exchangeName}...`);

      // Load previous announcements
      const dataFilePath = announcementAdapters[exchangeName].getDataFilePath();
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
      const adapter = announcementAdapters[exchangeName];
      if (!adapter) {
        console.error(`No announcement adapter found for ${exchangeName}`);
        continue;
      }

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
        displayAnnouncementsTable(newAnnouncements);

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
    displayAnnouncementsTable(allNewAnnouncements);

    // Send email notification
    await sendAnnouncementEmail(allNewAnnouncements);
  } else {
    console.log("No new announcements found on any exchange.");
  }
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

// Add a function to send announcement email notifications
async function sendAnnouncementEmail(announcements) {
  if (!config.email.enabled) {
    console.log("Email notifications disabled in config.");
    return false;
  }

  console.log("Sending email notification for new announcements...");

  try {
    // Group announcements by exchange
    const announcementsByExchange = {};
    announcements.forEach((announcement) => {
      if (!announcementsByExchange[announcement.exchange]) {
        announcementsByExchange[announcement.exchange] = [];
      }
      announcementsByExchange[announcement.exchange].push(announcement);
    });

    // Create HTML content
    let emailContent = "";
    Object.entries(announcementsByExchange).forEach(([exchange, items]) => {
      const listItems = items
        .map((item) => {
          const symbolInfo =
            item.symbols && item.symbols.length > 0
              ? ` (${item.symbols.join(", ")})`
              : "";

          return `<li><a href="${item.url}" style="color: #0066cc; text-decoration: underline;">${item.title}</a>${symbolInfo}</li>`;
        })
        .join("");

      emailContent += `
        <h3 style="color: #2b5278; margin-top: 20px;">${exchange.toUpperCase()} (${
        items.length
      } new announcement${items.length > 1 ? "s" : ""})</h3>
        <ul>${listItems}</ul>
      `;
    });

    // Prepare email
    const emailSubject = `🚨 URGENT: New Crypto Listings Announced! (${
      announcements.length
    } across ${Object.keys(announcementsByExchange).length} exchanges)`;

    const htmlContent = `
      <h2 style="color: #FF0000;">New Cryptocurrency Listing Announcements!</h2>
      <p style="font-weight: bold;">The following new listing announcements have been detected:</p>
      ${emailContent}
      <p><strong>Note:</strong> These are announcements of upcoming listings. The tokens may not be available for trading yet.</p>
      <p style="font-size: 12px; color: #666;">This is an automated notification from your Multi-Exchange Crypto Tracker. Please do not reply to this email.</p>
    `;

    // Add a plain text table version for clients that don't support HTML
    let textContent = "New Cryptocurrency Listing Announcements!\n\n";
    Object.entries(announcementsByExchange).forEach(([exchange, items]) => {
      textContent += `${exchange.toUpperCase()} (${
        items.length
      } new announcement${items.length > 1 ? "s" : ""}):\n`;
      items.forEach((item) => {
        const symbolInfo =
          item.symbols && item.symbols.length > 0
            ? ` (${item.symbols.join(", ")})`
            : "";
        textContent += `- ${item.title}${symbolInfo}: ${item.url}\n`;
      });
      textContent += "\n";
    });

    let success = false;

    console.log("Sending announcement email with subject:", emailSubject);

    // Choose email sending method based on configuration
    if (config.email.useNodemailer && transporter) {
      // Use nodemailer
      console.log("Sending email using Nodemailer");
      const mailOptions = {
        from: config.email.from,
        to: config.email.to,
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully via Nodemailer:", info.response);
      success = true;
    } else if (config.email.apiKey) {
      // Use SendGrid
      console.log("Sending email using SendGrid");
      const msg = {
        to: config.email.to,
        from: config.email.from,
        replyTo: config.email.from,
        subject: emailSubject,
        text: textContent,
        html: htmlContent,
      };

      const response = await sgMail.send(msg);
      console.log(
        "Email sent successfully via SendGrid, status code:",
        response[0].statusCode
      );
      success = true;
    } else {
      console.error("No email sending method available!");
      return false;
    }

    return success;
  } catch (error) {
    console.error("Error sending announcement email:", error);
    return false;
  }
}

// Main application initialization function
async function initializeApp() {
  console.log("=== CRYPTO TRACKER INITIALIZING ===");

  try {
    // Create data directory if it doesn't exist
    await ensureDataDirExists();

    // Run initial test email if configured
    if (config.email.testOnStartup) {
      await testEmailSetup();
    }

    // Perform initial check
    console.log("Performing initial check for new listings...");
    await checkNewListings();

    // Also check for announcements
    console.log("Performing initial check for new announcements...");
    await checkNewAnnouncements();

    // Schedule recurring checks
    console.log(
      `Setting up scheduled checks with interval: ${config.checkInterval}`
    );
    cron.schedule(config.checkInterval, async () => {
      try {
        console.log(`Running scheduled check at ${new Date().toISOString()}`);
        await checkNewListings();
        await checkNewAnnouncements();
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
