import * as fs from "fs";
import * as path from "path";
import { chromium } from "playwright";
import { Announcement } from "../../utils";
import config from "../../config";
import axios from "axios";
import { JSDOM } from "jsdom";

interface AnnouncementAdapter {
  fetchAnnouncements: () => Promise<Announcement[]>;
}

const binanceAdapter: AnnouncementAdapter = {
  async fetchAnnouncements(): Promise<Announcement[]> {
    console.log("Starting Binance announcement fetch...");

    let browser = null;
    try {
      // Use several known working URLs to maximize chances of success
      const announcementUrls = [
        "https://www.binance.com/en/support/announcement/list/48",
        "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing",
        "https://www.binance.com/en/support/announcement/c-48",
        "https://www.binance.com/en/support/announcement/latest-binance-news",
      ];

      // Log environment info
      console.log("Fetching Binance announcements using Playwright...");
      console.log(`Current directory: ${process.cwd()}`);
      console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(
        `PLAYWRIGHT_BROWSERS_PATH: ${
          process.env.PLAYWRIGHT_BROWSERS_PATH || "not set"
        }`
      );
      console.log(`DISPLAY: ${process.env.DISPLAY || "not set"}`);

      // Log detailed browser information for debugging
      const possibleBrowserPaths = [
        "/app/.playwright-browsers",
        "/root/.cache/ms-playwright",
        path.join(process.cwd(), "node_modules/playwright/.local-browsers"),
      ];

      for (const browserPath of possibleBrowserPaths) {
        console.log(`Checking for browser in: ${browserPath}`);
        if (fs.existsSync(browserPath)) {
          console.log(`✅ Directory exists: ${browserPath}`);
          try {
            const files = fs.readdirSync(browserPath);
            console.log(`Files in ${browserPath}: ${files.join(", ")}`);
          } catch (e) {
            console.log(`Error reading directory: ${e.message}`);
          }
        } else {
          console.log(`❌ Directory does not exist: ${browserPath}`);
        }
      }

      // Install browser on demand if needed
      try {
        const { execSync } = require("child_process");
        console.log("Installing Playwright browser on demand...");
        const output = execSync("npx playwright install chromium --with-deps", {
          encoding: "utf8",
        });
        console.log("Playwright install output:", output);
      } catch (installError) {
        console.error("Error installing browser:", installError.message);
      }

      // Path for storing cookies
      const cookiesPath = path.join(process.cwd(), "data/binance-cookies.json");

      // Launch browser with stealth mode settings - using same settings as old implementation
      console.log("Launching Playwright browser for Binance...");
      browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--hide-scrollbars",
          "--mute-audio",
          "--disable-web-security",
          "--disable-notifications",
          "--disable-extensions",
          "--disable-infobars",
        ],
      });

      console.log("Successfully launched Playwright browser");
      console.log(`Browser version: ${await browser.version()}`);

      // Create a browser context with stealth settings
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        viewport: { width: 1920, height: 1080 },
        screen: { width: 1920, height: 1080 },
        hasTouch: false,
        isMobile: false,
        deviceScaleFactor: 1,
        acceptDownloads: true,
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
        locale: "en-US",
        timezoneId: "America/New_York",
        permissions: ["geolocation"],
        colorScheme: "light",
      });

      // Load cookies if they exist
      try {
        if (fs.existsSync(cookiesPath)) {
          console.log("Loading saved cookies...");
          const cookiesString = fs.readFileSync(cookiesPath, "utf8");
          const cookies = JSON.parse(cookiesString);
          await context.addCookies(cookies);
          console.log("Cookies loaded successfully");
        }
      } catch (cookieError) {
        console.log(
          "No cookies found or error loading cookies:",
          cookieError.message
        );
      }

      const page = await context.newPage();
      console.log("Created new page");

      // Add human-like behavior
      await page.addInitScript(() => {
        // Override the navigator properties
        const newProto = (navigator as any).__proto__;
        delete newProto.webdriver;
        (navigator as any).__proto__ = newProto;
      });

      // Random sleep function for human-like timing
      const randomSleep = async (min: number, max: number) => {
        const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
        console.log(`Waiting for ${sleepTime}ms...`);
        await page.waitForTimeout(sleepTime);
      };

      // Go to binance homepage first
      console.log("Navigating to Binance homepage...");
      await page.goto("https://www.binance.com/en", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      console.log("Loaded Binance homepage");
      await randomSleep(2000, 3000);

      // Pick a random announcement URL from our list
      const url =
        announcementUrls[Math.floor(Math.random() * announcementUrls.length)];
      console.log(`Going to announcement page: ${url}`);

      // Go to announcements page
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      console.log(`Loaded page: ${url}`);

      // Take a screenshot for debugging
      try {
        const screenshotPath = path.join(
          process.cwd(),
          "data/binance-debug.png"
        );
        await page.screenshot({ path: screenshotPath });
        console.log(`Saved debug screenshot to ${screenshotPath}`);
      } catch (screenshotError) {
        console.error("Failed to save screenshot:", screenshotError);
      }

      // Simulate human scrolling
      console.log("Simulating human-like scrolling...");
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= document.body.scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });

      await randomSleep(2000, 3000);

      // Check for verification page
      const pageContent = await page.content();
      if (
        pageContent.includes("Human Verification") ||
        pageContent.includes("verify") ||
        pageContent.includes("captcha")
      ) {
        console.log(
          "DETECTED HUMAN VERIFICATION PAGE - attempting to bypass..."
        );
        try {
          await page
            .click('button:has-text("Verify")', { timeout: 5000 })
            .catch(() => {});
          await page
            .click('button:has-text("I am human")', { timeout: 5000 })
            .catch(() => {});
          await page.click(".slider", { timeout: 5000 }).catch(() => {});
          await randomSleep(5000, 8000);
        } catch (verifyError) {
          console.log("Error during verification bypass attempt:", verifyError);
        }
      }

      // Extract announcements using the page.evaluate method from old.index.js
      console.log("Extracting announcement data...");
      const announcements = await page.evaluate(() => {
        const results = [];

        // Log element counts
        function logElementCount(selector, name) {
          const elements = document.querySelectorAll(selector);
          console.log(`Found ${elements.length} ${name} elements`);
          return elements;
        }

        // Extract symbols from title
        const extractSymbols = (text) => {
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
          return symbols;
        };

        // Method 1: Target the specific structure
        const headlines = logElementCount(
          'h2.typography-headline5, h2[class*="typography"], .typography-headline5',
          "headline"
        );

        headlines.forEach((headline) => {
          const text = headline.textContent.trim();
          console.log(`Found headline text: "${text}"`);
          if (text && text.includes("Listing")) {
            // Found a listing headline, now find the actual announcements
            const parentSection = headline.closest(".bn-flex");
            if (parentSection) {
              // Find all announcement links in this section
              const links = parentSection.querySelectorAll(
                'a[class*="text-Primary"], a.text-PrimaryText'
              );
              links.forEach((link) => {
                const title = link.textContent.trim();
                if (!title || title.length < 10) return;

                // Check if it contains listing-related keywords
                const keywords = [
                  "list",
                  "add",
                  "adds",
                  "adding",
                  "added",
                  "will list",
                  "support",
                  "new crypto",
                ];
                const hasKeyword = keywords.some((kw) =>
                  title.toLowerCase().includes(kw)
                );

                if (hasKeyword) {
                  const url = link.href;
                  const symbols = extractSymbols(title);
                  results.push({
                    title,
                    url,
                    symbols,
                  });
                }
              });
            }
          }
        });

        // Method 2: Direct targeting of announcement items
        const announcementItems = logElementCount(
          'a[href*="/support/announcement/"], a[href*="/support/announcement/detail/"]',
          "direct announcement links"
        );

        announcementItems.forEach((item) => {
          const title = item.textContent.trim();
          if (!title || title.length < 10) return;

          const url = item.href;
          const symbols = extractSymbols(title);

          // Check for duplicates before adding
          const isDuplicate = results.some(
            (existing) =>
              existing.title === title || (existing.url === url && url !== "")
          );

          if (!isDuplicate) {
            results.push({
              title,
              url,
              symbols,
            });
          }
        });

        // Method 3: Target the specific bn-flex structure
        const flexItems = logElementCount(
          ".bn-flex.flex-col.gap-6, .bn-flex.flex-col.gap-4, div[class*='bn-flex']",
          "flex container"
        );

        flexItems.forEach((container) => {
          // Look for links within these containers
          const links = container.querySelectorAll("a");
          links.forEach((link) => {
            const title = link.textContent.trim();
            if (!title || title.length < 10) return;

            // Check if it contains listing-related keywords
            const keywords = [
              "list",
              "add",
              "adds",
              "adding",
              "added",
              "will list",
              "support",
              "new crypto",
            ];
            const hasKeyword = keywords.some((kw) =>
              title.toLowerCase().includes(kw)
            );

            if (hasKeyword) {
              const url = link.href;
              const symbols = extractSymbols(title);

              // Check for duplicates before adding
              const isDuplicate = results.some(
                (item) =>
                  item.title === title || (item.url === url && url !== "")
              );

              if (!isDuplicate) {
                results.push({
                  title,
                  url,
                  symbols,
                });
              }
            }
          });
        });

        console.log(
          `Total results found in browser context: ${results.length}`
        );
        return results;
      });

      console.log(
        `Extracted ${announcements.length} announcements from page content`
      );

      // Save cookies for future use
      try {
        const cookies = await context.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies));
        console.log("Cookies saved for future use");
      } catch (cookieError) {
        console.error("Failed to save cookies:", cookieError.message);
      }

      // Convert to standard announcement format
      const results: Announcement[] = [];
      for (const announcement of announcements) {
        try {
          const title = announcement.title;
          const fullUrl = announcement.url;
          const symbols = announcement.symbols || [];

          // Filter out delistings
          const isDelisting = [
            "delist",
            "remov",
            "deprecat",
            "discontinu",
          ].some((word) => title.toLowerCase().includes(word));

          if (!isDelisting && title.length > 10) {
            // Create a unique ID based on title and URL
            const id = `binance-${Buffer.from(`${title}-${fullUrl}`).toString(
              "base64"
            )}`;

            // Add to results if not a duplicate
            if (!results.some((a) => a.id === id)) {
              results.push({
                id,
                exchange: "binance",
                title,
                link: fullUrl,
                date: new Date().toISOString(),
                symbols,
              });

              console.log(
                `Added Binance announcement: "${title.substring(0, 50)}..."`
              );
            }
          }
        } catch (announcementError) {
          console.log(`Error processing announcement: ${announcementError}`);
        }
      }

      // Close browser
      await browser.close();
      console.log("Closed browser");

      return results;
    } catch (error) {
      console.error("Error in Playwright approach:", error);

      // Try to ensure browser is closed in case of error
      try {
        if (browser) await browser.close();
      } catch (e) {
        console.error("Error closing browser:", e);
      }

      console.log("Falling back to Axios method");
      return await fetchWithAxios();
    }
  },
};

// Axios fallback method
async function fetchWithAxios(): Promise<Announcement[]> {
  console.log("Fetching Binance announcements with Axios fallback...");
  const results: Announcement[] = [];

  // Try multiple URLs
  const announcementUrls = [
    "https://www.binance.com/en/support/announcement/list/48",
    "https://www.binance.com/en/support/announcement/c-48",
    "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing",
  ];

  for (const url of announcementUrls) {
    try {
      console.log(`Fetching Binance announcements from URL: ${url}`);

      // Try to mimic a real browser
      const response = await axios.get(url, {
        timeout: 60000,
        maxRedirects: 5,
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Connection: "keep-alive",
          "Cache-Control": "max-age=0",
          "Sec-Ch-Ua":
            '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
          Referer: "https://www.binance.com/en",
        },
      });

      console.log(`Binance response status for ${url}: ${response.status}`);

      if (response.status === 200 || response.status === 202) {
        const html = response.data;
        console.log(
          `Binance HTML loaded from ${url}, length: ${html?.length || 0} bytes`
        );

        // Handle possible JSON response
        if (typeof html === "object" && html !== null) {
          console.log("Received JSON response, processing...");
          try {
            // Extract from JSON structure
            if (html.data && Array.isArray(html.data.catalogs)) {
              console.log(
                `Found ${html.data.catalogs.length} announcements in JSON`
              );

              for (const item of html.data.catalogs) {
                if (item.title && item.code) {
                  const title = item.title;
                  const fullUrl = `https://www.binance.com/en/support/announcement/${item.code}`;

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

                  if (!isDelisting) {
                    // Create a unique ID
                    const id = `binance-${Buffer.from(
                      `${title}-${fullUrl}`
                    ).toString("base64")}`;

                    // Add to results if not a duplicate
                    if (!results.some((a) => a.id === id)) {
                      results.push({
                        id,
                        exchange: "binance",
                        title,
                        link: fullUrl,
                        date: new Date().toISOString(),
                        symbols,
                      });

                      console.log(
                        `Added Binance announcement (from JSON): "${title.substring(
                          0,
                          50
                        )}..."`
                      );
                    }
                  }
                }
              }

              if (results.length > 0) {
                continue; // If we found results from JSON, skip HTML parsing
              }
            }
          } catch (jsonError) {
            console.log("Error parsing JSON response:", jsonError);
          }
        }

        // Parse HTML using JSDOM
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Get all links on the page
        const links = document.querySelectorAll("a");
        console.log(`Found ${links.length} links on the page`);

        const processedUrls = new Set<string>();

        for (const link of links) {
          try {
            const href = link.getAttribute("href");
            const text = link.textContent;

            // Skip if no URL or text
            if (!href || !text) continue;

            // Normalize URL
            const fullUrl = href.startsWith("http")
              ? href
              : `https://www.binance.com${href}`;

            // Skip if we've already processed this URL
            if (processedUrls.has(fullUrl)) continue;
            processedUrls.add(fullUrl);

            // Check if the link looks like an announcement
            const isAnnouncement =
              href.includes("/support/announcement") ||
              href.includes("/listing") ||
              href.includes("/c-48");

            // Check if title has listing-related keywords
            const title = text.trim();
            const keywords = [
              "list",
              "add",
              "will list",
              "support",
              "new crypto",
              "spot trading",
              "trading pair",
              "token",
            ];
            const hasKeyword = keywords.some((kw) =>
              title.toLowerCase().includes(kw)
            );

            if (isAnnouncement && hasKeyword && title.length > 10) {
              // Extract symbols from the title
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

              if (!isDelisting) {
                // Create a unique ID based on title and URL
                const id = `binance-${Buffer.from(
                  `${title}-${fullUrl}`
                ).toString("base64")}`;

                // Add to results if not a duplicate
                if (!results.some((a) => a.id === id)) {
                  results.push({
                    id,
                    exchange: "binance",
                    title,
                    link: fullUrl,
                    date: new Date().toISOString(),
                    symbols,
                  });

                  console.log(
                    `Added Binance announcement (from HTML): "${title.substring(
                      0,
                      50
                    )}..."`
                  );
                }
              }
            }
          } catch (linkError) {
            console.log(`Error processing link: ${linkError}`);
            continue;
          }
        }
      }
    } catch (error) {
      console.log(`Error fetching Binance announcements from ${url}:`, error);
      continue;
    }
  }

  console.log(
    `Found ${results.length} Binance announcements total using Axios fallback`
  );
  return results;
}

export default binanceAdapter;
