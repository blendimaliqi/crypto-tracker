import * as fs from "fs";
import * as path from "path";
import { Announcement } from "../../utils";
import config from "../../config";
import axios from "axios";
import { JSDOM } from "jsdom";
import * as xml2js from "xml2js";

interface AnnouncementAdapter {
  fetchAnnouncements: () => Promise<Announcement[]>;
}

const binanceAdapter: AnnouncementAdapter = {
  async fetchAnnouncements(): Promise<Announcement[]> {
    console.log("Starting Binance announcement fetch...");

    // Create data directory if it doesn't exist
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`Created data directory: ${dataDir}`);
      }
    } catch (dirError) {
      console.error("Error creating data directory:", dirError);
    }

    try {
      // Try multiple public sources in sequence
      console.log(
        "Trying multiple public sources for Binance announcements..."
      );

      // Try each method and combine results, eliminating duplicates
      const methods = [
        fetchFromRSS,
        fetchFromPublicAPI,
        fetchFromArchiveAPI,
        fetchFromMarketData,
      ];

      const allResults: Announcement[] = [];
      const seenIds = new Set<string>();
      const seenTitlesAndSymbols = new Set<string>();

      for (const method of methods) {
        try {
          console.log(`Trying method: ${method.name}...`);
          const results = await method();
          console.log(
            `Method ${method.name} returned ${results.length} results`
          );

          // Process each result and only add if not a duplicate
          for (const announcement of results) {
            // Create a unique key based on title and symbols
            const titleAndSymbols = `${
              announcement.title
            }-${announcement.symbols.sort().join(",")}`;

            // Add only if we haven't seen this ID or title+symbols combination before
            if (
              !seenIds.has(announcement.id) &&
              !seenTitlesAndSymbols.has(titleAndSymbols)
            ) {
              seenIds.add(announcement.id);
              seenTitlesAndSymbols.add(titleAndSymbols);
              allResults.push(announcement);
              console.log(`Added unique announcement: "${announcement.title}"`);
            } else {
              console.log(`Skipping duplicate: "${announcement.title}"`);
            }
          }
        } catch (error) {
          console.error(`Error with method ${method.name}:`, error.message);
          // Continue to next method
        }
      }

      console.log(`Found ${allResults.length} unique announcements total`);
      return allResults;
    } catch (error) {
      console.error("All Binance fetch methods failed:", error);
      return [];
    }
  },
};

// Method 1: Fetch from Binance RSS feed
async function fetchFromRSS(): Promise<Announcement[]> {
  console.log("Fetching Binance announcements from public RSS feed...");
  const results: Announcement[] = [];

  // RSS feed URLs (trying multiple in case some are blocked)
  const RSS_URLS = [
    "https://www.binance.com/en/support/announcement/rss/c-48",
    "https://www.binance.com/en/rss",
    "https://binance.zendesk.com/hc/en-us/categories/115000056351-Announcements.atom",
  ];

  for (const url of RSS_URLS) {
    try {
      console.log(`Fetching from RSS URL: ${url}`);

      const response = await axios.get(url, {
        timeout: 20000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept:
            "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        },
      });

      // Save response for debugging
      try {
        fs.writeFileSync(
          path.join(process.cwd(), "data", "binance-rss-response.xml"),
          response.data
        );
        console.log("Saved RSS response for debugging");
      } catch (saveError) {
        console.error("Failed to save RSS response:", saveError.message);
      }

      if (response.status === 200) {
        console.log(`RSS feed loaded, parsing XML...`);

        try {
          // Parse XML
          const parser = new xml2js.Parser({ explicitArray: false });
          const result = await parser.parseStringPromise(response.data);

          // Extract based on RSS or Atom format
          let items = [];

          if (result.rss && result.rss.channel && result.rss.channel.item) {
            // Standard RSS format
            items = Array.isArray(result.rss.channel.item)
              ? result.rss.channel.item
              : [result.rss.channel.item];

            console.log(`Found ${items.length} items in RSS feed`);
          } else if (result.feed && result.feed.entry) {
            // Atom format
            items = Array.isArray(result.feed.entry)
              ? result.feed.entry
              : [result.feed.entry];

            console.log(`Found ${items.length} items in Atom feed`);
          }

          // Process each item
          for (const item of items) {
            try {
              // Extract data (handling both RSS and Atom formats)
              const title = item.title || "";
              const link = item.link?.href || item.link || "";
              const pubDate =
                item.pubDate ||
                item.published ||
                item.updated ||
                new Date().toISOString();

              if (title && link && title.length > 10) {
                // Extract symbols from title
                const symbols: string[] = [];
                const symbolMatches = title.match(/\(([A-Z0-9]{2,10})\)/g);

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

                // Filter out delistings
                const isDelisting = [
                  "delist",
                  "remov",
                  "deprecat",
                  "discontinu",
                ].some((word) => title.toLowerCase().includes(word));

                // Check if it contains listing-related keywords
                const isListing = [
                  "list",
                  "add",
                  "will list",
                  "support",
                  "new crypto",
                  "trading",
                  "new pair",
                ].some((word) => title.toLowerCase().includes(word));

                if (!isDelisting && (isListing || symbols.length > 0)) {
                  // Simplify the title for better deduplication
                  const simplifiedTitle = title.includes("Will Add")
                    ? `Binance Lists ${symbols.join(", ")}`
                    : title;

                  // Create a unique ID based on symbols and link
                  const id = `binance-${Buffer.from(
                    `${symbols.sort().join(",")}-${link}`
                  ).toString("base64")}`;

                  // Add to results if not a duplicate
                  if (!results.some((a) => a.id === id)) {
                    results.push({
                      id,
                      exchange: "binance",
                      title: simplifiedTitle,
                      link,
                      date: new Date(pubDate).toISOString(),
                      symbols,
                    });

                    console.log(
                      `Added Binance announcement (from RSS): "${simplifiedTitle}"`
                    );
                  }
                }
              }
            } catch (itemError) {
              console.log("Error processing RSS item:", itemError.message);
            }
          }
        } catch (parseError) {
          console.error("Error parsing RSS XML:", parseError.message);
        }
      }
    } catch (rssError) {
      console.error(`Error fetching from RSS URL ${url}:`, rssError.message);
    }
  }

  return results;
}

// Method 2: Fetch from public CoinGecko or CoinMarketCap API
async function fetchFromPublicAPI(): Promise<Announcement[]> {
  console.log("Fetching Binance announcements from public APIs...");
  const results: Announcement[] = [];

  // Try CoinGecko's exchange endpoint
  try {
    console.log("Fetching from CoinGecko API...");

    const response = await axios.get(
      "https://api.coingecko.com/api/v3/exchanges/binance/status_updates",
      {
        timeout: 20000,
        params: {
          per_page: 50,
          page: 1,
        },
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      }
    );

    // Save response for debugging
    try {
      fs.writeFileSync(
        path.join(process.cwd(), "data", "coingecko-response.json"),
        JSON.stringify(response.data, null, 2)
      );
    } catch (saveError) {
      console.error("Failed to save CoinGecko response:", saveError.message);
    }

    if (response.data && response.data.status_updates) {
      console.log(
        `Found ${response.data.status_updates.length} status updates from CoinGecko`
      );

      for (const update of response.data.status_updates) {
        try {
          if (update.description && update.category === "listing") {
            const title = update.description;
            const link =
              update.url || "https://www.binance.com/en/support/announcement";
            const pubDate = update.created_at;

            // Extract symbols - for CoinGecko we can use their provided data
            const symbols: string[] = [];
            if (update.project && update.project.symbol) {
              symbols.push(update.project.symbol.toUpperCase());
            } else {
              // Extract from title as fallback
              const symbolMatches = title.match(/\(([A-Z0-9]{2,10})\)/g);
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
            }

            // Simplify the title for better deduplication
            const simplifiedTitle = `Binance Lists ${symbols.join(", ")}`;

            // Create ID based on symbols for better deduplication
            const id = `binance-${Buffer.from(
              `${symbols.sort().join(",")}-listing`
            ).toString("base64")}`;

            if (!results.some((a) => a.id === id)) {
              results.push({
                id,
                exchange: "binance",
                title: simplifiedTitle,
                link,
                date: new Date(pubDate).toISOString(),
                symbols,
              });

              console.log(
                `Added Binance announcement (from CoinGecko): "${simplifiedTitle}"`
              );
            }
          }
        } catch (updateError) {
          console.error(
            "Error processing CoinGecko update:",
            updateError.message
          );
        }
      }
    }
  } catch (coinGeckoError) {
    console.error("Error fetching from CoinGecko:", coinGeckoError.message);
  }

  return results;
}

// Method 3: Fetch from public crypto news aggregators
async function fetchFromArchiveAPI(): Promise<Announcement[]> {
  console.log("Fetching Binance announcements from crypto news archives...");
  const results: Announcement[] = [];

  // Try Crypto Panic API
  try {
    console.log("Fetching from Crypto News API...");

    const response = await axios.get("https://cryptopanic.com/api/v1/posts/", {
      timeout: 20000,
      params: {
        auth_token: "cd28d97be1973e96fdad55a3c066845cab2e9788", // Free public token
        currencies: "BTC",
        kind: "news",
        filter: "binance",
        public: true,
      },
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    });

    if (response.data && response.data.results) {
      console.log(
        `Found ${response.data.results.length} news items from Crypto Panic`
      );

      for (const post of response.data.results) {
        try {
          if (post.title && post.url) {
            const title = post.title;
            const link = post.url;
            const pubDate = post.created_at;

            // Check if it's relevant to Binance listings
            const isBinance =
              (post.source && post.source.domain === "binance.com") ||
              title.toLowerCase().includes("binance") ||
              link.includes("binance.com");

            const isListing = [
              "list",
              "add",
              "will list",
              "support",
              "new crypto",
              "trading",
              "new pair",
            ].some((word) => title.toLowerCase().includes(word));

            if (isBinance && isListing) {
              // Extract symbols
              const symbols: string[] = [];
              if (post.currencies) {
                for (const currency of post.currencies) {
                  symbols.push(currency.code);
                }
              } else {
                // Extract from title as fallback
                const symbolMatches = title.match(/\(([A-Z0-9]{2,10})\)/g);
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
              }

              // Simplify the title for better deduplication
              const simplifiedTitle =
                symbols.length > 0
                  ? `Binance Lists ${symbols.join(", ")}`
                  : title;

              // Create ID based on symbols for better deduplication
              const id = `binance-${Buffer.from(
                `${symbols.sort().join(",")}-news`
              ).toString("base64")}`;

              if (!results.some((a) => a.id === id)) {
                results.push({
                  id,
                  exchange: "binance",
                  title: simplifiedTitle,
                  link,
                  date: new Date(pubDate).toISOString(),
                  symbols,
                });

                console.log(
                  `Added Binance announcement (from CryptoPanic): "${simplifiedTitle}"`
                );
              }
            }
          }
        } catch (postError) {
          console.error(
            "Error processing Crypto Panic post:",
            postError.message
          );
        }
      }
    }
  } catch (cryptoPanicError) {
    console.error(
      "Error fetching from Crypto Panic:",
      cryptoPanicError.message
    );
  }

  return results;
}

// Method 4: Fetch directly from market data
async function fetchFromMarketData(): Promise<Announcement[]> {
  console.log("Fetching Binance announcements by analyzing market data...");
  const results: Announcement[] = [];

  try {
    // Get Binance exchange info with all trading pairs
    console.log("Fetching Binance exchange info...");

    const response = await axios.get(
      "https://api.binance.com/api/v3/exchangeInfo",
      {
        timeout: 20000,
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      }
    );

    if (response.data && response.data.symbols) {
      console.log(
        `Found ${response.data.symbols.length} trading pairs from Binance API`
      );

      // Try to identify recently added pairs
      const symbols = response.data.symbols;

      // Get the most recent pairs (status is BREAK in or TRADING)
      const activePairs = symbols.filter(
        (s) =>
          (s.status === "TRADING" || s.status === "BREAK") &&
          !s.baseAsset.includes("USD") &&
          !s.baseAsset.includes("BTC") &&
          !s.baseAsset.includes("ETH")
      );

      console.log(`Found ${activePairs.length} active trading pairs`);

      // We can't directly get the listing date from the exchangeInfo
      // Instead, we'll check the first candlestick data to estimate listing date
      const recentPairs = [];

      // Check a small sample of pairs (recent ones are likely to be at the end)
      // We don't want to make too many requests to avoid rate limiting
      const samplesToCheck = Math.min(10, activePairs.length);
      for (let i = 0; i < samplesToCheck; i++) {
        const pair = activePairs[activePairs.length - 1 - i]; // Check from the end

        try {
          // Get the first candlestick to estimate listing date
          const candleResponse = await axios.get(
            `https://api.binance.com/api/v3/klines`,
            {
              params: {
                symbol: pair.symbol,
                interval: "1d",
                limit: 1,
                startTime: 0, // Get oldest data
              },
              timeout: 10000,
            }
          );

          if (candleResponse.data && candleResponse.data.length > 0) {
            const firstCandleTime = new Date(candleResponse.data[0][0]);
            const now = new Date();
            const daysSinceListing = Math.floor(
              (now.getTime() - firstCandleTime.getTime()) /
                (1000 * 60 * 60 * 24)
            );

            // If the pair was listed in the last 7 days, consider it recent
            if (daysSinceListing <= 7) {
              recentPairs.push({
                pair: pair.symbol,
                baseAsset: pair.baseAsset,
                quoteAsset: pair.quoteAsset,
                listingDate: firstCandleTime,
              });
            }
          }
        } catch (candleError) {
          console.error(
            `Error fetching candle data for ${pair.symbol}:`,
            candleError.message
          );
        }

        // Add a small delay to avoid hitting rate limits
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      console.log(`Found ${recentPairs.length} recently listed pairs`);

      // Create announcement entries for recent pairs
      for (const pair of recentPairs) {
        const title = `Binance Lists ${pair.baseAsset}`;
        const link = `https://www.binance.com/en/trade/${pair.baseAsset}_${pair.quoteAsset}`;
        const symbols = [pair.baseAsset];

        // Create ID based on symbols for better deduplication
        const id = `binance-${Buffer.from(
          `${symbols.sort().join(",")}-market`
        ).toString("base64")}`;

        if (!results.some((a) => a.id === id)) {
          results.push({
            id,
            exchange: "binance",
            title,
            link,
            date: pair.listingDate.toISOString(),
            symbols,
          });

          console.log(
            `Added Binance announcement (from market data): "${title}"`
          );
        }
      }
    }
  } catch (marketError) {
    console.error(
      "Error fetching from Binance market data:",
      marketError.message
    );
  }

  return results;
}

export default binanceAdapter;
