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

    try {
      // Try direct API method first (most reliable) - this should be the primary approach
      console.log("Trying direct Binance API method first...");

      // Try multiple endpoints with retries
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`API attempt ${attempts} of ${maxAttempts}...`);
          const apiResults = await fetchWithAPI();

          if (apiResults.length > 0) {
            console.log(
              `Success! Found ${apiResults.length} announcements via API method`
            );
            return apiResults;
          } else {
            console.log(
              "API attempt returned no results, will retry or try alternate method"
            );
          }
        } catch (apiError) {
          console.error(`API attempt ${attempts} failed:`, apiError.message);
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      console.log(
        "All API attempts failed or returned no results, trying fallback methods"
      );

      // Try fallback methods
      try {
        // First try Axios as it's more lightweight
        console.log("Trying Axios fallback method...");
        const axiosResults = await fetchWithAxios();
        if (axiosResults.length > 0) {
          console.log(
            `Found ${axiosResults.length} announcements with Axios fallback`
          );
          return axiosResults;
        }

        console.log(
          "Axios fallback returned no results, trying browser method as last resort"
        );

        // Last resort - try browser approach
        const browserResults = await fetchWithBrowser();
        return browserResults;
      } catch (fallbackError) {
        console.error("All fallback methods failed:", fallbackError);
        return [];
      }
    } catch (error) {
      console.error("All Binance fetch methods failed:", error);
      return [];
    }
  },
};

// Direct API method - most reliable
async function fetchWithAPI(): Promise<Announcement[]> {
  console.log("Fetching Binance announcements with direct API approach...");
  const results: Announcement[] = [];

  // Binance API endpoints for announcements with randomized request ID to avoid caching
  const API_ENDPOINTS = [
    // Most reliable endpoint for new listings
    `https://www.binance.com/bapi/composite/v1/public/cms/article/catalog/list/query?catalogId=48&pageNo=1&pageSize=20&rnd=${Math.random()}`,
    // Secondary endpoint - latest announcements
    `https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&pageNo=1&pageSize=20&rnd=${Math.random()}`,
    // List/new trading pairs endpoint
    `https://www.binance.com/bapi/composite/v1/public/cms/article/catalog/list/query?catalogId=161&pageNo=1&pageSize=20&rnd=${Math.random()}`,
  ];

  // Make data directory if it doesn't exist
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory: ${dataDir}`);
    }
  } catch (dirError) {
    console.error("Error creating data directory:", dirError);
  }

  // Try each endpoint until one works
  for (const endpoint of API_ENDPOINTS) {
    try {
      console.log(`Fetching from Binance API: ${endpoint}`);

      // Generate random request ID and user agent
      const requestId = Math.random().toString(36).substring(2);
      const randomUserAgent = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      ][Math.floor(Math.random() * 4)];

      const response = await axios.get(endpoint, {
        timeout: 30000,
        headers: {
          Accept: "application/json",
          "User-Agent": randomUserAgent,
          Origin: "https://www.binance.com",
          Referer: "https://www.binance.com/en/support/announcement/list/48",
          lang: "en",
          "x-trace-id": "binance-" + requestId,
          "x-ui-request-trace": "binance-" + requestId,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      // Save response to file for debugging
      try {
        const dataDir = path.join(process.cwd(), "data");
        fs.writeFileSync(
          path.join(dataDir, "binance-api-response.json"),
          JSON.stringify(response.data, null, 2)
        );
        console.log("Saved API response for debugging");
      } catch (saveError) {
        console.error("Failed to save API response:", saveError.message);
      }

      console.log(`API response status: ${response.status}`);

      if (!response.data) {
        console.log("API response data is empty or null");
        continue;
      }

      console.log(
        `Response structure: ${JSON.stringify(Object.keys(response.data))}`
      );

      if (response.data && response.data.data) {
        let announcements = [];

        // Handle different API response structures
        if (Array.isArray(response.data.data.catalogs)) {
          console.log(
            `Found ${response.data.data.catalogs.length} announcements in catalogs`
          );
          announcements = response.data.data.catalogs;
        } else if (Array.isArray(response.data.data.articles)) {
          console.log(
            `Found ${response.data.data.articles.length} announcements in articles`
          );
          announcements = response.data.data.articles;
        } else if (Array.isArray(response.data.data)) {
          console.log(
            `Found ${response.data.data.length} announcements in data`
          );
          announcements = response.data.data;
        }

        if (announcements.length === 0) {
          console.log("No announcements found in response data");
          continue;
        }

        for (const item of announcements) {
          try {
            // Extract title and code from different possible structures
            const title = item.title || item.name || "";
            const code = item.code || item.id || "";

            if (!title || !code) {
              console.log("Skipping item with missing title or code");
              continue;
            }

            // Build the URL
            const fullUrl = `https://www.binance.com/en/support/announcement/${code}`;

            // Extract symbols from title
            const symbols: string[] = [];
            const symbolMatches = title.match(/\(([A-Z0-9]{2,10})\)/g);

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

            // Filter out delistings
            const isDelisting = [
              "delist",
              "remov",
              "deprecat",
              "discontinu",
            ].some((word) => title.toLowerCase().includes(word));

            if (!isDelisting && title.length > 10) {
              // Create a unique ID
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
                  `Added Binance announcement (from API): "${title}"`
                );
              }
            }
          } catch (itemError) {
            console.log("Error processing announcement item:", itemError);
          }
        }
      }

      if (results.length > 0) {
        console.log(`Found ${results.length} valid announcements via API`);
        // If we found results, no need to try other endpoints
        break;
      }
    } catch (apiError) {
      console.error(
        `Error fetching from Binance API endpoint ${endpoint}:`,
        apiError.message
      );
    }
  }

  console.log(`API method found ${results.length} announcements total`);
  return results;
}

// Browser-based method - use system Chrome if available (last resort)
async function fetchWithBrowser(): Promise<Announcement[]> {
  console.log(
    "Fetching Binance announcements using browser method (last resort)..."
  );

  // Use only the main URL that is known to work
  const BINANCE_URL = "https://www.binance.com/en/support/announcement/list/48";

  let browser = null;
  try {
    // Log environment info
    console.log(`Current directory: ${process.cwd()}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`CHROME_PATH: ${process.env.CHROME_PATH || "not set"}`);
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

    // Find system Chrome executable - check every possible path
    let executablePath = null;
    const possiblePaths = [
      process.env.CHROME_PATH,
      process.env.CHROME_EXECUTABLE_PATH,
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ];

    for (const path of possiblePaths) {
      if (path && fs.existsSync(path)) {
        executablePath = path;
        console.log(`Found Chrome at: ${executablePath}`);
        break;
      }
    }

    if (!executablePath) {
      console.log("No Chrome found in standard locations, searching system...");
      try {
        const { execSync } = require("child_process");
        const chromePaths = execSync(
          "which google-chrome-stable chromium-browser google-chrome chromium 2>/dev/null || echo 'none'",
          { encoding: "utf8" }
        );

        if (chromePaths && chromePaths.trim() && chromePaths !== "none") {
          executablePath = chromePaths.trim().split("\n")[0];
          console.log(`Found Chrome via which command: ${executablePath}`);
        } else {
          console.log("Could not find Chrome via which command");
        }
      } catch (findError) {
        console.log("Error searching for Chrome:", findError);
      }
    }

    // Use executablePath if found, otherwise let Playwright manage it
    const launchOptions: any = {
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
        "--disable-extensions",
        "--disable-infobars",
      ],
    };

    if (executablePath) {
      console.log(`Using system Chrome at: ${executablePath}`);
      launchOptions.executablePath = executablePath;
    } else {
      console.log("No system Chrome found, trying Playwright's browser");

      // Try to install Playwright browser if not found
      try {
        console.log("Attempting to install Playwright browser...");
        const { execSync } = require("child_process");
        execSync("npx playwright install chromium --with-deps", {
          encoding: "utf8",
          stdio: "inherit",
        });
      } catch (installError) {
        console.error("Failed to install Playwright browser:", installError);
      }
    }

    // Attempt to launch browser with error handling
    try {
      console.log("Launching browser...");
      browser = await chromium.launch(launchOptions);
      console.log("Successfully launched browser");
      console.log(`Browser version: ${await browser.version()}`);
    } catch (launchError) {
      console.error("Failed to launch browser:", launchError);
      throw new Error("Browser launch failed: " + launchError.message);
    }

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

    // Add anti-detection script
    await page.addInitScript(() => {
      // Override the navigator properties
      const newProto = (navigator as any).__proto__;
      delete newProto.webdriver;
      (navigator as any).__proto__ = newProto;

      // Add a fake WebGL renderer
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
        if (parameter === 37445) {
          return "Intel Inc.";
        }
        if (parameter === 37446) {
          return "Intel Iris OpenGL Engine";
        }
        return getParameter.apply(this, [parameter]);
      };
    });

    // Random sleep function for human-like timing
    const randomSleep = async (min: number, max: number) => {
      const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
      console.log(`Waiting for ${sleepTime}ms...`);
      await page.waitForTimeout(sleepTime);
    };

    // Go directly to the announcements page with retry logic
    console.log(`Going to Binance announcements: ${BINANCE_URL}`);

    // Retry page load if needed
    let pageLoaded = false;
    let retries = 0;

    while (!pageLoaded && retries < 3) {
      try {
        retries++;
        console.log(`Page load attempt ${retries}/3...`);

        // Go to URL with long timeout
        await page.goto(BINANCE_URL, {
          waitUntil: "domcontentloaded",
          timeout: 90000, // 90 seconds
        });

        // Test if page loaded with content
        await page.waitForSelector("body", { timeout: 5000 });
        pageLoaded = true;
        console.log("Page loaded successfully");
      } catch (pageError) {
        console.error(
          `Page load attempt ${retries} failed:`,
          pageError.message
        );
        if (retries >= 3) {
          throw new Error("Failed to load page after 3 attempts");
        }
        await page.waitForTimeout(2000); // wait before retry
      }
    }

    // Take a screenshot and save HTML for debugging
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Saved debug screenshot to ${screenshotPath}`);

      const html = await page.content();
      fs.writeFileSync(htmlDumpPath, html);
      console.log(`Saved page HTML to ${htmlDumpPath} (${html.length} bytes)`);
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

    // Extract announcements with all methods
    console.log("Extracting announcements from page...");
    const announcements = await page.evaluate(() => {
      const results = [];
      console.log("In-browser announcement extraction started");

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

      // Method 1: Find all announcement cards
      const cards = document.querySelectorAll(
        'div[class*="css"][class*="card"]'
      );
      console.log(`Found ${cards.length} announcement cards`);

      if (cards.length > 0) {
        cards.forEach((card) => {
          const linkElement = card.querySelector("a");
          if (linkElement) {
            const title = linkElement.textContent?.trim() || "";
            const url = linkElement.href || "";

            if (title && title.length > 10 && url) {
              const symbols = extractSymbols(title);
              results.push({ title, url, symbols });
            }
          }
        });
      }

      // Method 2: Find all links
      const links = document.querySelectorAll("a");
      console.log(`Found ${links.length} links`);

      // Process only links that look like announcements
      links.forEach((link) => {
        const title = link.textContent?.trim() || "";
        const url = link.href || "";

        // Skip if already found or too short
        if (title.length < 10 || !url) return;

        // Check if likely a listing announcement
        const keywords = [
          "list",
          "adds",
          "adding",
          "will list",
          "support",
          "new",
          "token",
          "trading",
        ];
        const hasKeyword = keywords.some((kw) =>
          title.toLowerCase().includes(kw)
        );

        if (hasKeyword && url.includes("announcement")) {
          const symbols = extractSymbols(title);

          // Check for duplicates
          const isDuplicate = results.some(
            (item) => item.title === title || item.url === url
          );

          if (!isDuplicate) {
            results.push({ title, url, symbols });
          }
        }
      });

      console.log(`Total unique announcements found: ${results.length}`);
      return results;
    });

    console.log(`Extracted ${announcements.length} announcements from page`);

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

        // Skip delistings
        const isDelisting = ["delist", "remov", "deprecat", "discontinu"].some(
          (word) => title.toLowerCase().includes(word)
        );

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
    try {
      await browser.close();
      console.log("Browser closed successfully");
    } catch (closeError) {
      console.error("Error closing browser:", closeError);
    }

    return results;
  } catch (error) {
    console.error("Error in browser approach:", error);

    // Try to ensure browser is closed in case of error
    try {
      if (browser) await browser.close();
    } catch (e) {
      console.error("Error closing browser:", e);
    }

    // Pass on the error as we've already tried all methods
    throw error;
  }
}

// Axios fallback method
async function fetchWithAxios(): Promise<Announcement[]> {
  console.log("Fetching Binance announcements with Axios fallback...");
  const results: Announcement[] = [];

  // Use only the main URL
  const BINANCE_URL = "https://www.binance.com/en/support/announcement/list/48";

  try {
    console.log(`Fetching from URL: ${BINANCE_URL}`);

    // Try to mimic a real browser with randomized headers
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
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        Referer: "https://www.google.com/",
      },
    });

    console.log(`Response status: ${response.status}`);

    // Save response to file for debugging
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const responsePath = path.join(dataDir, "binance-axios-response.html");
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
        `Response length: ${
          typeof html === "string" ? html.length : "JSON response"
        } bytes`
      );

      // Handle JSON response
      if (typeof html === "object" && html !== null) {
        console.log("Received JSON response");

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
        console.log(
          `Number of links: ${document.querySelectorAll("a").length}`
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
    console.log(`Error with Axios method:`, error.message);
  }

  console.log(`Found ${results.length} announcements with Axios method`);
  return results;
}

export default binanceAdapter;
