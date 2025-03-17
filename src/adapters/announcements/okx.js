const axios = require("axios");
const cheerio = require("cheerio");
const path = require("path");
const config = require("../../config");

// OKX announcement adapter
const okxAnnouncementAdapter = {
  async fetchAnnouncements() {
    try {
      console.log("Fetching OKX announcements...");
      console.log(`Using URL: ${config.announcements.okx.announcementUrl}`);

      const response = await axios.get(
        config.announcements.okx.announcementUrl,
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

      console.log(`Total OKX announcements processed: ${announcements.length}`);
      return announcements;
    } catch (error) {
      console.error("Error fetching OKX announcements:", error.message);
      return [];
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, config.announcements.okx.dataFile);
  },
};

module.exports = okxAnnouncementAdapter;
