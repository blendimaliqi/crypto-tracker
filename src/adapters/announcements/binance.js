const path = require("path");
const config = require("../../config");

// Binance announcement adapter with Playwright implementation
const binanceAnnouncementAdapter = {
  async fetchAnnouncements() {
    let browser = null;
    try {
      console.log("Fetching Binance announcements using Playwright...");
      console.log(`Using URL: ${config.announcements.binance.announcementUrl}`);

      // Import Playwright and fs to check for browser
      const { chromium } = require("playwright");
      const fs = require("fs");
      const path = require("path");

      // Log detailed environment information
      console.log(`Current directory: ${process.cwd()}`);
      console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(
        `PLAYWRIGHT_BROWSERS_PATH: ${
          process.env.PLAYWRIGHT_BROWSERS_PATH || "not set"
        }`
      );

      // Check if the browser exists in various locations
      const possibleBrowserPaths = [
        "/app/.playwright-browsers",
        "/root/.cache/ms-playwright",
        "/app/node_modules/playwright/.local-browsers",
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

      // Check if the specific error path exists
      const specificErrorPath =
        "/root/.cache/ms-playwright/chromium_headless_shell-1155/chrome-linux/headless_shell";
      if (fs.existsSync(specificErrorPath)) {
        console.log(
          `✅ Browser executable exists at error path: ${specificErrorPath}`
        );
      } else {
        console.log(
          `❌ Browser executable does not exist at error path: ${specificErrorPath}`
        );
        // Try to find chrome-linux or similar directories
        if (fs.existsSync("/root/.cache/ms-playwright")) {
          console.log("Searching for any browser installation...");
          const findChrome = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                console.log(`Checking directory: ${fullPath}`);
                if (entry.name === "chrome-linux") {
                  console.log(`✅ Found chrome-linux at: ${fullPath}`);
                  return fullPath;
                }
                try {
                  const result = findChrome(fullPath);
                  if (result) return result;
                } catch (e) {
                  // Ignore and continue
                }
              } else if (
                entry.name === "headless_shell" ||
                entry.name === "chrome"
              ) {
                console.log(`✅ Found browser executable at: ${fullPath}`);
                return fullPath;
              }
            }
            return null;
          };

          try {
            findChrome("/root/.cache/ms-playwright");
          } catch (e) {
            console.log(`Error during browser search: ${e.message}`);
          }
        }
      }

      console.log("Installing Playwright browser on demand...");
      // Install browsers on demand - this ensures they're available
      try {
        const { execSync } = require("child_process");
        const output = execSync("npx playwright install chromium --with-deps", {
          encoding: "utf8",
        });
        console.log("Playwright install output:", output);
      } catch (installError) {
        console.error("Error installing browser:", installError.message);
      }

      // Path for storing cookies
      const cookiesPath = path.join(
        process.cwd(),
        "/app/data/binance-cookies.json"
      );

      // Launch browser with stealth mode settings
      console.log("Launching Playwright browser with stealth settings...");
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
        ],
        logger: {
          isEnabled: (name, severity) =>
            severity === "error" || severity === "warning",
          log: (name, severity, message, args) =>
            console.log(`[Playwright ${severity}] ${name}: ${message}`),
        },
      });
      console.log("Successfully launched Playwright browser");

      // Create a new persistent context that will store cookies
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
        geolocation: { longitude: -73.935242, latitude: 40.73061 },
        permissions: ["geolocation"],
        colorScheme: "light",
        // Add fingerprint matching common browser patterns
        httpCredentials: undefined,
      });

      // Load cookies if they exist
      try {
        if (fs.existsSync(cookiesPath)) {
          console.log("Loading saved cookies...");
          const cookiesString = fs.readFileSync(cookiesPath);
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

      // Add human-like behavior to emulate real user
      await page.addInitScript(() => {
        // Override the navigator properties
        const newProto = navigator.__proto__;
        delete newProto.webdriver;
        navigator.__proto__ = newProto;

        // Add randomization to window dimensions
        const originalWidth = window.innerWidth;
        const originalHeight = window.innerHeight;
        Object.defineProperty(window, "innerWidth", {
          get: function () {
            return originalWidth;
          },
        });
        Object.defineProperty(window, "innerHeight", {
          get: function () {
            return originalHeight;
          },
        });
      });

      // Add random sleep function for human-like timing
      const randomSleep = async (min, max) => {
        const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
        console.log(`Waiting for ${sleepTime}ms...`);
        await page.waitForTimeout(sleepTime);
      };

      // Navigate to the Binance announcements page with human-like behavior
      console.log("Navigating to Binance announcements page...");

      // First go to the homepage
      await page.goto("https://www.binance.com/en", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      console.log("Loaded Binance homepage");
      await randomSleep(2000, 5000);

      // Then navigate to the announcements page
      await page.goto(config.announcements.binance.announcementUrl, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      console.log("Page loaded successfully");

      await randomSleep(1000, 3000);

      // Simulate scrolling like a human
      console.log("Simulating human-like scrolling...");
      await page.evaluate(() => {
        return new Promise((resolve) => {
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

      await randomSleep(1000, 2000);

      // Wait for the content to load - using selectors visible in the screenshot
      await page
        .waitForSelector(".bn-flex", { timeout: 30000 })
        .catch(() =>
          console.log(
            "Timeout waiting for .bn-flex selector, continuing anyway"
          )
        );

      // Save cookies for future use
      try {
        const cookies = await context.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies));
        console.log("Cookies saved for future use");
      } catch (cookieError) {
        console.error("Failed to save cookies:", cookieError.message);
      }

      // Take a screenshot for debugging in all environments
      try {
        const screenshotPath = "/app/data/binance-debug.png";
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Saved debug screenshot to ${screenshotPath}`);
      } catch (screenshotError) {
        console.error("Failed to save screenshot:", screenshotError);
      }

      // Get page HTML for debugging
      const pageContent = await page.content();
      console.log(`Page HTML content length: ${pageContent.length} characters`);
      console.log(
        `First 500 chars of page content: ${pageContent.substring(0, 500)}`
      );

      // Check if we hit a verification page
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
          // Look for common verification buttons/sliders and try to click them
          await page
            .click('button:has-text("Verify")', { timeout: 5000 })
            .catch(() => {});
          await page
            .click('button:has-text("I am human")', { timeout: 5000 })
            .catch(() => {});
          await page.click(".slider", { timeout: 5000 }).catch(() => {});

          // Wait to see if verification completes
          await randomSleep(5000, 8000);

          // Check if we're past verification
          const newContent = await page.content();
          if (
            !newContent.includes("Human Verification") &&
            !newContent.includes("verify")
          ) {
            console.log("Successfully bypassed verification!");
          } else {
            console.log("Unable to automatically bypass verification");
          }
        } catch (verifyError) {
          console.log(
            "Error during verification bypass attempt:",
            verifyError.message
          );
        }
      }

      // Extract announcement data from the page
      console.log(
        "Extracting announcement data based on specific HTML structure..."
      );
      const announcements = await page.evaluate(() => {
        const results = [];

        // Function to log counts directly to console (visible in Node.js)
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

        // Method 1: Target the specific structure seen in the screenshot
        // Log all the selectors we're trying to find
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
                    date: new Date().toISOString(),
                    symbols,
                    exchange: "Binance",
                    source: "announcement",
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
                  date: new Date().toISOString(),
                  symbols,
                  exchange: "Binance",
                  source: "announcement",
                });
              }
            }
          });
        });

        // Method 3: Direct targeting of announcement items based on the screenshot
        const announcementItems = logElementCount(
          'a[href*="/support/announcement/detail/"]',
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
              date: new Date().toISOString(),
              symbols,
              exchange: "Binance",
              source: "announcement",
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
                    date: new Date().toISOString(),
                    symbols,
                    exchange: "Binance",
                    source: "announcement",
                  });
                }
              }
            }
          }
        });

        // Log the final results
        console.log(
          `Total results found in browser context: ${results.length}`
        );
        return results;
      });

      console.log(
        `Extracted ${announcements.length} announcements from Binance using Playwright`
      );

      // Print details of found announcements
      announcements.forEach((announcement) => {
        console.log(
          `Found Binance announcement: "${announcement.title}" with symbols: ${
            announcement.symbols.join(", ") || "none"
          }`
        );
      });

      // Close the browser
      await browser.close();
      console.log("Closed Playwright browser");

      return announcements;
    } catch (error) {
      console.error(
        "Error fetching Binance announcements with Playwright:",
        error
      );
      console.error("Stack trace:", error.stack);

      // Try to ensure browser is closed in case of error
      try {
        if (browser) await browser.close();
      } catch (e) {
        console.error("Error closing browser:", e);
      }

      return [];
    }
  },

  getDataFilePath() {
    return path.join(config.dataPath, config.announcements.binance.dataFile);
  },
};

module.exports = binanceAnnouncementAdapter;
