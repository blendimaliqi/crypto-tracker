import * as fs from "fs/promises";
import * as path from "path";
import { chromium } from "playwright";
import { Announcement } from "../../utils";
import config from "../../config";
import axios from "axios";
import { JSDOM } from "jsdom";

interface AnnouncementAdapter {
  fetchAnnouncements: () => Promise<Announcement[]>;
}

// Helper functions
async function fetchWithPlaywright(): Promise<Announcement[]> {
  let browser;
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
    console.log(
      `PW_BROWSERS_PATH_CACHE: ${
        process.env.PW_BROWSERS_PATH_CACHE || "not set"
      }`
    );

    // Look for system Chrome executable
    let executablePath;
    try {
      const { execSync } = require("child_process");
      console.log("Looking for system Chrome...");
      const chromePathCmd = execSync(
        "which chromium-browser || which chromium || which google-chrome || which google-chrome-stable || echo ''",
        { encoding: "utf8" }
      ).trim();

      if (chromePathCmd) {
        console.log(`Found system Chrome at: ${chromePathCmd}`);
        executablePath = chromePathCmd;
      } else if (process.env.CHROME_EXECUTABLE_PATH) {
        console.log(
          `Using CHROME_EXECUTABLE_PATH: ${process.env.CHROME_EXECUTABLE_PATH}`
        );
        executablePath = process.env.CHROME_EXECUTABLE_PATH;
      }
    } catch (err) {
      console.log("Error finding system Chrome:", err.message);
    }

    // Ensure Xvfb is running for headless Chrome in Docker
    if (process.env.NODE_ENV === "production") {
      try {
        const { execSync } = require("child_process");

        // Check if Xvfb is already running
        const xvfbRunning = execSync(
          "ps aux | grep Xvfb | grep -v grep || echo ''",
          { encoding: "utf8" }
        ).trim();

        if (!xvfbRunning) {
          console.log("Starting Xvfb for headless Chrome...");
          execSync("Xvfb :99 -screen 0 1280x720x16 &", { encoding: "utf8" });
          process.env.DISPLAY = ":99";
          console.log("Xvfb started successfully");
        } else {
          console.log("Xvfb is already running");
        }

        // Verify DISPLAY is set
        if (!process.env.DISPLAY) {
          console.log(
            "DISPLAY environment variable not set, defaulting to :99"
          );
          process.env.DISPLAY = ":99";
        }

        console.log(`Using DISPLAY=${process.env.DISPLAY}`);
      } catch (xvfbError) {
        console.log("Error setting up Xvfb:", xvfbError.message);
        console.log("Will try to continue without Xvfb");
      }
    }

    console.log("Launching browser...");
    const launchOptions: any = {
      headless: true,
      args: [
        "--disable-gpu",
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--hide-scrollbars",
        "--mute-audio",
        "--disable-web-security",
        "--disable-notifications",
        "--disable-extensions",
        "--disable-infobars",
        "--window-size=1920,1080",
        "--disable-features=site-per-process", // Disable OOPIF
        "--disable-features=IsolateOrigins",
        "--disable-features=site-per-process",
        "--disable-blink-features=AutomationControlled", // Prevent detection
      ],
    };

    // Use system Chrome if found
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    browser = await chromium.launch(launchOptions);

    console.log(
      `Browser launched successfully. Version: ${await browser.version()}`
    );

    // Create a more stealth context with additional parameters to avoid detection
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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

    // Setup cookies for persistence if possible
    const cookiesPath = path.join(process.cwd(), "data/binance-cookies.json");
    try {
      if (require("fs").existsSync(cookiesPath)) {
        console.log("Loading saved cookies...");
        const cookiesString = require("fs").readFileSync(cookiesPath);
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

    const results: Announcement[] = [];
    let successfulFetch = false;

    // Random sleep function for human-like behavior
    const randomSleep = async (min: number, max: number) => {
      const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
      console.log(`Waiting for ${sleepTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    };

    // Try each URL until we get results
    for (const url of announcementUrls) {
      if (successfulFetch) break;

      try {
        console.log(`Trying Binance URL: ${url}`);
        const page = await context.newPage();

        // Add human-like behavior
        await page.addInitScript(() => {
          // Override the navigator properties
          const newProto = (navigator as any).__proto__;
          delete newProto.webdriver;
          (navigator as any).__proto__ = newProto;
        });

        // First go to the homepage to avoid direct access detection
        await page.goto("https://www.binance.com/en", {
          waitUntil: "networkidle",
          timeout: 60000,
        });

        console.log("Loaded Binance homepage");
        await randomSleep(2000, 3000);

        // Go directly to the announcements page
        await page.goto(url, {
          waitUntil: "networkidle",
          timeout: 60000,
        });

        console.log(`Loaded page: ${url}`);

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

        // Simple wait for content to load
        await randomSleep(3000, 5000);

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

          // Try to solve simple verification if available
          try {
            await page
              .click('button:has-text("Verify")', { timeout: 5000 })
              .catch(() => {});
            await page
              .click('button:has-text("I am human")', { timeout: 5000 })
              .catch(() => {});
            await page.click(".slider", { timeout: 5000 }).catch(() => {});

            // Wait to see if verification completes
            await randomSleep(5000, 8000);
          } catch (verifyError) {
            console.log(
              "Error during verification bypass attempt:",
              verifyError
            );
          }
        }

        // Take screenshot for debugging if we're in development
        if (process.env.NODE_ENV !== "production") {
          await page.screenshot({ path: "binance-debug.png" });
          console.log("Screenshot saved to binance-debug.png");
        } else {
          // In production, try to save to the data directory
          try {
            const dataDir = path.join(process.cwd(), "data");
            await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
            await page.screenshot({
              path: path.join(dataDir, "binance-debug.png"),
            });
            console.log("Screenshot saved to data/binance-debug.png");
          } catch (e) {
            console.log("Could not save screenshot:", e);
          }
        }

        // Get all links on the page
        const links = await page.$$("a");
        console.log(`Found ${links.length} links on the page`);

        // Extract announcement data using successful approach from old implementation
        console.log(
          "Extracting announcement data using browser context evaluation..."
        );
        const extractedAnnouncements = await page.evaluate(() => {
          const results = [];

          // Log element counts to debug browser context
          function logElementCount(selector, name) {
            const elements = document.querySelectorAll(selector);
            console.log(`Found ${elements.length} ${name} elements`);
            return elements;
          }

          // Function to extract symbols from title
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

          // Method 1: Target the specific structure seen in Binance
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

          // Method 2: Target the specific bn-flex structure
          const flexItems = logElementCount(
            ".bn-flex.flex-col.gap-6, .bn-flex.flex-col.gap-4",
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

          // Method 3: Direct targeting of announcement items
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

          // Method 4: Look for date elements and their parent containers
          const dateElements = logElementCount(
            '.typography-caption1, [class*="typography"][class*="body"]',
            "date element"
          );

          dateElements.forEach((dateEl) => {
            // Check if this looks like a date
            const text = dateEl.textContent.trim();
            if (
              text.match(/\d{4}-\d{2}-\d{2}/) ||
              text.match(/\d{2}-\d{2}-\d{4}/)
            ) {
              // This is likely a date element, check its parent for announcement
              const parent = dateEl.parentElement;
              if (parent) {
                const linkEl =
                  parent.querySelector("a") ||
                  parent.previousElementSibling?.querySelector("a");
                if (linkEl) {
                  const title = linkEl.textContent.trim();
                  if (!title || title.length < 10) return;

                  const url = linkEl.href;
                  const symbols = extractSymbols(title);

                  // Check for duplicates before adding
                  const isDuplicate = results.some(
                    (existing) =>
                      existing.title === title ||
                      (existing.url === url && url !== "")
                  );

                  if (!isDuplicate) {
                    results.push({
                      title,
                      url,
                      symbols,
                    });
                  }
                }
              }
            }
          });

          console.log(
            `Total results found in browser context: ${results.length}`
          );
          return results;
        });

        console.log(
          `Extracted ${extractedAnnouncements.length} announcements using browser context evaluation`
        );

        // Convert extracted announcements to our standard format
        for (const announcement of extractedAnnouncements) {
          try {
            const title = announcement.title;
            const fullUrl = announcement.url;
            const symbols = announcement.symbols || [];

            // Only include announcements with listing-related keywords
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

            // Filter out delistings
            const isDelisting = [
              "delist",
              "remov",
              "deprecat",
              "discontinu",
            ].some((word) => title.toLowerCase().includes(word));

            if (hasKeyword && !isDelisting && title.length > 10) {
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
                  `Added Binance announcement from browser context: "${title.substring(
                    0,
                    50
                  )}..."`
                );
              }
            }
          } catch (announcementError) {
            console.log(`Error processing announcement: ${announcementError}`);
          }
        }

        // Process links as fallback
        if (results.length === 0) {
          console.log(
            "No announcements found with browser context evaluation, falling back to link processing"
          );
          const processedUrls = new Set<string>();

          for (const link of links) {
            try {
              const href = await link.getAttribute("href");
              const text = await link.textContent();

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

        // Save cookies for future use
        try {
          const cookies = await context.cookies();
          require("fs").writeFileSync(cookiesPath, JSON.stringify(cookies));
          console.log("Cookies saved for future use");
        } catch (cookieError) {
          console.error("Failed to save cookies:", cookieError.message);
        }

        // If we found any results, mark as successful
        if (results.length > 0) {
          successfulFetch = true;
          console.log(
            `Successfully found ${results.length} announcements from ${url}`
          );
        }

        await page.close();
      } catch (pageError) {
        console.log(`Error with URL ${url}: ${pageError}`);
        continue;
      }
    }

    console.log(`Found ${results.length} Binance announcements total`);
    return results;
  } catch (error) {
    console.error(`Error in Playwright approach: ${error}`);
    throw error; // Propagate the error to trigger the fallback
  } finally {
    if (browser) {
      await browser
        .close()
        .catch((e) => console.error(`Error closing browser: ${e}`));
    }
  }
}

async function fetchWithAxios(): Promise<Announcement[]> {
  console.log("Fetching Binance announcements with Axios fallback...");
  const results: Announcement[] = [];

  // Try multiple URLs to increase chance of success
  const announcementUrls = [
    "https://www.binance.com/en/support/announcement/list/48",
    "https://www.binance.com/en/support/announcement/c-48",
    "https://www.binance.com/en/support/announcement/latest-binance-news",
    "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing",
    "https://www.binance.com/en/support/announcement",
  ];

  for (const url of announcementUrls) {
    try {
      console.log(`Fetching Binance announcements from URL: ${url}`);

      // Try to mimic a real browser as closely as possible
      const response = await axios.get(url, {
        timeout: 60000, // Increase timeout
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

        // If we received a JSON response, try to handle it directly
        if (typeof html === "object" && html !== null) {
          console.log(
            "Received JSON response, attempting to extract announcements"
          );
          try {
            // Try to extract announcements from the JSON structure
            if (html.data && Array.isArray(html.data.catalogs)) {
              console.log(
                `Found ${html.data.catalogs.length} announcements in JSON`
              );

              for (const item of html.data.catalogs) {
                if (item.title && item.code) {
                  // This is likely an announcement, create proper structure
                  const title = item.title;
                  const fullUrl = `https://www.binance.com/en/support/announcement/${item.code}`;

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
                        `Added Binance announcement (from JSON): "${title.substring(
                          0,
                          50
                        )}..."`
                      );
                    }
                  }
                }
              }

              // If we found results from JSON, no need to parse HTML
              if (results.length > 0) {
                continue;
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
      console.log(`Error fetching Binance announcements from ${url}: ${error}`);
      continue;
    }
  }

  console.log(
    `Found ${results.length} Binance announcements total using Axios fallback`
  );
  return results;
}

const binanceAdapter: AnnouncementAdapter = {
  async fetchAnnouncements(): Promise<Announcement[]> {
    console.log("Starting Binance announcement fetch...");

    // First try with Playwright
    try {
      return await fetchWithPlaywright();
    } catch (error) {
      console.log(
        `Playwright approach failed: ${error}. Trying with Axios fallback...`
      );
      return await fetchWithAxios();
    }
  },
};

export default binanceAdapter;
