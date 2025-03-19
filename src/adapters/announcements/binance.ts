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

    // Use only the main URL that is known to work
    const BINANCE_URL =
      "https://www.binance.com/en/support/announcement/list/48";

    let browser = null;
    try {
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

      // Path for storing cookies and debug files
      const dataDir = path.join(process.cwd(), "data");
      const cookiesPath = path.join(dataDir, "binance-cookies.json");
      const screenshotPath = path.join(dataDir, "binance-debug.png");
      const htmlDumpPath = path.join(dataDir, "binance-page.html");

      // Make sure data directory exists
      try {
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
          console.log(`Created data directory: ${dataDir}`);
        }
      } catch (dirError) {
        console.error("Error creating data directory:", dirError);
      }

      // Launch browser with stealth mode settings
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

      // Go directly to the announcements page - skipping homepage to simplify
      console.log(`Going directly to Binance announcements: ${BINANCE_URL}`);

      // Increase timeout for slow connections
      await page.goto(BINANCE_URL, {
        waitUntil: "domcontentloaded",
        timeout: 90000, // 90 seconds should be enough
      });
      console.log("Page loaded - checking if content is available");

      // Wait for some content to appear indicating page load success
      try {
        await page.waitForSelector("a, h1, h2, .bn-flex", { timeout: 10000 });
        console.log("Content found on page!");
      } catch (waitError) {
        console.warn("Warning: Timed out waiting for content selectors");
      }

      // Take a screenshot and save HTML for debugging
      try {
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Saved debug screenshot to ${screenshotPath}`);

        const html = await page.content();
        fs.writeFileSync(htmlDumpPath, html);
        console.log(
          `Saved page HTML to ${htmlDumpPath} (${html.length} bytes)`
        );

        // Log a preview of the HTML to see what we're getting
        console.log("HTML preview:");
        console.log(html.substring(0, 500) + "...");
      } catch (saveError) {
        console.error("Failed to save debug files:", saveError);
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

      // Check the whole page structure using DOM analysis - VERBOSE for debugging
      console.log("Analyzing page structure:");
      const pageStructure = await page.evaluate(() => {
        // Get page title
        const title = document.title;

        // Count all elements by type
        const elements = {
          divs: document.querySelectorAll("div").length,
          links: document.querySelectorAll("a").length,
          headings: document.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
          paragraphs: document.querySelectorAll("p").length,
          bnFlex: document.querySelectorAll(".bn-flex").length,
          sections: document.querySelectorAll("section").length,
        };

        // Check for common UI frameworks
        const frameworks = {
          react: document.querySelector("[data-reactroot]") !== null,
          styledComponents:
            document.querySelectorAll('[class^="sc-"]').length > 0,
          tailwind: document.querySelectorAll('[class*="text-"]').length > 0,
        };

        // Get some of the links
        const sampleLinks = Array.from(document.querySelectorAll("a"))
          .slice(0, 10)
          .map((link) => ({
            text: link.textContent?.trim() || "No text",
            href: link.getAttribute("href") || "No href",
            classes: link.className || "No class",
          }));

        return {
          title,
          url: window.location.href,
          elements,
          frameworks,
          sampleLinks,
        };
      });

      console.log(
        "Page structure analysis:",
        JSON.stringify(pageStructure, null, 2)
      );

      // Extract announcements
      console.log("Extracting announcement data...");
      const announcements = await page.evaluate(() => {
        const results = [];
        console.log("Starting in-browser announcement extraction");

        function logCount(selector, name) {
          const items = document.querySelectorAll(selector);
          console.log(`Found ${items.length} ${name}`);
          return items;
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

        // Method 1: Find all announcement cards directly
        console.log("Method 1: Looking for announcement cards");
        const cards = logCount(
          'div[class*="css"][class*="card"]',
          "announcement cards"
        );

        if (cards.length > 0) {
          cards.forEach((card) => {
            // Find the title and link elements within the card
            const linkElement = card.querySelector("a");
            if (linkElement) {
              const title = linkElement.textContent?.trim() || "";
              const url = linkElement.href || "";

              if (title && title.length > 10 && url) {
                const symbols = extractSymbols(title);
                results.push({ title, url, symbols });
                console.log(`Found announcement: ${title}`);
              }
            }
          });
        }

        // Method 2: Find headings and lists
        console.log("Method 2: Looking for headings and their containers");
        const headings = logCount("h1, h2, h3, h4", "headings");

        headings.forEach((heading) => {
          const text = heading.textContent?.trim() || "";
          console.log(`Checking heading: ${text}`);

          // Find related links under this heading
          const container = heading.closest("div[class], section");
          if (container) {
            const links = container.querySelectorAll("a");
            console.log(`Found ${links.length} links under this heading`);

            links.forEach((link) => {
              const title = link.textContent?.trim() || "";
              const url = link.href || "";

              if (title && title.length > 10 && url) {
                // Check if it's listing-related
                const keywords = [
                  "list",
                  "add",
                  "support",
                  "new",
                  "token",
                  "trading",
                ];
                const hasKeyword = keywords.some((kw) =>
                  title.toLowerCase().includes(kw)
                );

                if (hasKeyword) {
                  const symbols = extractSymbols(title);
                  results.push({ title, url, symbols });
                  console.log(`Found listing announcement: ${title}`);
                }
              }
            });
          }
        });

        // Method 3: Find any listing-related links directly
        console.log("Method 3: Looking for listing-related links");
        const allLinks = logCount("a", "links");
        let linkCount = 0;

        allLinks.forEach((link) => {
          const title = link.textContent?.trim() || "";
          const url = link.href || "";

          // Skip if already found or too short
          if (title.length < 10 || !url) return;

          // Look for listing-related announcements
          const keywords = [
            "list",
            "adds",
            "adding",
            "will list",
            "support",
            "new crypto",
          ];
          const hasKeyword = keywords.some((kw) =>
            title.toLowerCase().includes(kw)
          );

          if (hasKeyword) {
            // Check if it's a listing URL pattern
            const isAnnouncementUrl =
              url.includes("/support/announcement/") ||
              url.includes("/listing") ||
              url.includes("/c-48");

            if (isAnnouncementUrl) {
              linkCount++;
              const symbols = extractSymbols(title);

              // Check for duplicates
              const isDuplicate = results.some(
                (item) => item.title === title || item.url === url
              );

              if (!isDuplicate) {
                results.push({ title, url, symbols });
                console.log(`Found listing link: ${title}`);
              }
            }
          }
        });

        console.log(`Found ${linkCount} listing-related links`);
        console.log(`Total unique announcements found: ${results.length}`);
        return results;
      });

      console.log(
        `Extracted ${announcements.length} announcements from page content`
      );

      // Log each found announcement for debugging
      if (announcements.length > 0) {
        console.log("Found announcements:");
        announcements.forEach((a, i) => {
          console.log(
            `[${i + 1}] ${a.title} - URL: ${a.url} - Symbols: ${
              a.symbols?.join(", ") || "none"
            }`
          );
        });
      } else {
        console.warn("WARNING: No announcements found on the Binance page");
      }

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

              console.log(`Added Binance announcement: "${title}"`);
            }
          }
        } catch (announcementError) {
          console.log(`Error processing announcement: ${announcementError}`);
        }
      }

      // Close browser
      await browser.close();
      console.log("Closed browser");

      // If no results from direct method, try fallback
      if (results.length === 0) {
        console.log("No results from browser method, trying Axios fallback");
        const axiosResults = await fetchWithAxios();
        return axiosResults;
      }

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

  // Use only the main URL
  const BINANCE_URL = "https://www.binance.com/en/support/announcement/list/48";

  try {
    console.log(`Fetching Binance announcements from URL: ${BINANCE_URL}`);

    // Try to mimic a real browser
    const response = await axios.get(BINANCE_URL, {
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

    console.log(`Binance response status: ${response.status}`);

    // Save response to file for debugging
    try {
      const dataDir = path.join(process.cwd(), "data");
      const responsePath = path.join(dataDir, "binance-axios-response.html");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Write response to file
      if (typeof response.data === "string") {
        fs.writeFileSync(responsePath, response.data);
      } else {
        fs.writeFileSync(responsePath, JSON.stringify(response.data, null, 2));
      }
      console.log(`Saved Axios response to ${responsePath}`);
    } catch (saveError) {
      console.error("Failed to save Axios response:", saveError);
    }

    if (response.status === 200 || response.status === 202) {
      const html = response.data;
      console.log(
        `Binance HTML loaded, length: ${
          typeof html === "string" ? html.length : "JSON response"
        } bytes`
      );

      // Handle possible JSON response
      if (typeof html === "object" && html !== null) {
        console.log("Received JSON response, processing...");
        console.log(
          "JSON preview:",
          JSON.stringify(html).substring(0, 200) + "..."
        );

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
                      `Added Binance announcement (from JSON): "${title}"`
                    );
                  }
                }
              }
            }
          } else {
            console.log("JSON doesn't contain expected catalogs structure");

            // Log the actual structure for debugging
            if (html.data) {
              console.log("Data keys:", Object.keys(html.data));
            } else {
              console.log("Root keys:", Object.keys(html));
            }
          }
        } catch (jsonError) {
          console.log("Error parsing JSON response:", jsonError);
        }
      } else if (typeof html === "string") {
        // Parse HTML using JSDOM
        const dom = new JSDOM(html);
        const document = dom.window.document;

        console.log("Page title:", document.title);

        // Check for common selectors that might indicate if we're on the right page
        console.log("Page structure analysis:");
        console.log(
          `- Has main content: ${document.querySelector("main") !== null}`
        );
        console.log(
          `- Number of links: ${document.querySelectorAll("a").length}`
        );
        console.log(
          `- Has bn-flex elements: ${
            document.querySelectorAll(".bn-flex").length
          }`
        );

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
                    `Added Binance announcement (from HTML): "${title}"`
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
    }
  } catch (error) {
    console.log(`Error fetching Binance announcements:`, error);
  }

  console.log(
    `Found ${results.length} Binance announcements total using Axios fallback`
  );
  return results;
}

export default binanceAdapter;
