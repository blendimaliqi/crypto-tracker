"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_1 = require("playwright");
const binanceAdapter = {
    async fetchAnnouncements() {
        console.log("Starting Binance announcement fetch...");
        let browser;
        try {
            // Use several known working URLs to maximize chances of success
            const announcementUrls = [
                "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing",
                "https://www.binance.com/en/support/announcement/c-48",
                "https://www.binance.com/en/support/announcement/latest-binance-news",
            ];
            console.log("Launching browser...");
            browser = await playwright_1.chromium.launch({
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-accelerated-2d-canvas",
                    "--no-first-run",
                    "--no-zygote",
                    "--disable-gpu",
                ],
            });
            console.log(`Browser launched successfully. PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH}`);
            // Print browser info to debug
            const browserVersion = await browser.version();
            console.log(`Browser version: ${browserVersion}`);
            const context = await browser.newContext({
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                viewport: { width: 1200, height: 800 },
            });
            const results = [];
            let successfulFetch = false;
            // Try each URL until we get results
            for (const url of announcementUrls) {
                if (successfulFetch)
                    break;
                try {
                    console.log(`Trying Binance URL: ${url}`);
                    const page = await context.newPage();
                    // Go directly to the announcements page
                    await page.goto(url, {
                        waitUntil: "domcontentloaded",
                        timeout: 30000,
                    });
                    console.log(`Loaded page: ${url}`);
                    // Simple wait for content to load
                    await page.waitForTimeout(5000);
                    // Take screenshot for debugging if we're in development
                    if (process.env.NODE_ENV !== "production") {
                        await page.screenshot({ path: "binance-debug.png" });
                        console.log("Screenshot saved to binance-debug.png");
                    }
                    // Get all links on the page
                    const links = await page.$$("a");
                    console.log(`Found ${links.length} links on the page`);
                    const processedUrls = new Set();
                    for (const link of links) {
                        try {
                            const href = await link.getAttribute("href");
                            const text = await link.textContent();
                            // Skip if no URL or text
                            if (!href || !text)
                                continue;
                            // Normalize URL
                            const fullUrl = href.startsWith("http")
                                ? href
                                : `https://www.binance.com${href}`;
                            // Skip if we've already processed this URL
                            if (processedUrls.has(fullUrl))
                                continue;
                            processedUrls.add(fullUrl);
                            // Check if the link looks like an announcement
                            const isAnnouncement = href.includes("/support/announcement") ||
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
                            const hasKeyword = keywords.some((kw) => title.toLowerCase().includes(kw));
                            if (isAnnouncement && hasKeyword && title.length > 10) {
                                // Extract symbols from the title
                                const symbols = [];
                                const symbolMatches = title.match(/\(([A-Z0-9]{2,10})\)/g);
                                if (symbolMatches) {
                                    symbolMatches.forEach((match) => {
                                        const symbol = match.replace(/[()]/g, "");
                                        if (symbol.length >= 2 &&
                                            symbol.length <= 10 &&
                                            ![
                                                "FOR",
                                                "THE",
                                                "AND",
                                                "USD",
                                                "USDT",
                                                "BTC",
                                                "ETH",
                                            ].includes(symbol)) {
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
                                    const id = `binance-${Buffer.from(`${title}-${fullUrl}`).toString("base64")}`;
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
                                        console.log(`Added Binance announcement: "${title.substring(0, 50)}..."`);
                                    }
                                }
                            }
                        }
                        catch (linkError) {
                            console.log(`Error processing link: ${linkError}`);
                            continue;
                        }
                    }
                    // If we found any results, mark as successful
                    if (results.length > 0) {
                        successfulFetch = true;
                        console.log(`Successfully found ${results.length} announcements from ${url}`);
                    }
                    await page.close();
                }
                catch (pageError) {
                    console.log(`Error with URL ${url}: ${pageError}`);
                    continue;
                }
            }
            console.log(`Found ${results.length} Binance announcements total`);
            return results;
        }
        catch (error) {
            console.error(`Error fetching Binance announcements: ${error}`);
            return [];
        }
        finally {
            if (browser) {
                await browser
                    .close()
                    .catch((e) => console.error(`Error closing browser: ${e}`));
            }
        }
    },
};
exports.default = binanceAdapter;
