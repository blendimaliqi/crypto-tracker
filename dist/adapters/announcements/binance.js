"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const playwright_1 = require("playwright");
const axios_1 = __importDefault(require("axios"));
const jsdom_1 = require("jsdom");
// Helper functions
async function fetchWithPlaywright() {
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
        console.log(`PLAYWRIGHT_BROWSERS_PATH: ${process.env.PLAYWRIGHT_BROWSERS_PATH || "not set"}`);
        // Install browser on demand - critical for hosted environments
        try {
            const { execSync } = require("child_process");
            console.log("Installing Playwright browser on demand...");
            const output = execSync("npx playwright install chromium --with-deps", {
                encoding: "utf8",
            });
            console.log("Playwright install output:", output);
        }
        catch (installError) {
            console.error("Error installing browser:", installError.message);
        }
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
                "--hide-scrollbars",
                "--mute-audio",
                "--disable-web-security",
                "--disable-notifications",
                "--disable-extensions",
            ],
        });
        console.log(`Browser launched successfully. PLAYWRIGHT_BROWSERS_PATH=${process.env.PLAYWRIGHT_BROWSERS_PATH}`);
        // Print browser info to debug
        const browserVersion = await browser.version();
        console.log(`Browser version: ${browserVersion}`);
        // Create a more stealth context with additional parameters to avoid detection
        const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
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
        }
        catch (cookieError) {
            console.log("No cookies found or error loading cookies:", cookieError.message);
        }
        const results = [];
        let successfulFetch = false;
        // Random sleep function for human-like behavior
        const randomSleep = async (min, max) => {
            const sleepTime = Math.floor(Math.random() * (max - min + 1)) + min;
            console.log(`Waiting for ${sleepTime}ms...`);
            await new Promise((resolve) => setTimeout(resolve, sleepTime));
        };
        // Try each URL until we get results
        for (const url of announcementUrls) {
            if (successfulFetch)
                break;
            try {
                console.log(`Trying Binance URL: ${url}`);
                const page = await context.newPage();
                // Add human-like behavior
                await page.addInitScript(() => {
                    // Override the navigator properties
                    const newProto = navigator.__proto__;
                    delete newProto.webdriver;
                    navigator.__proto__ = newProto;
                });
                // First go to the homepage to avoid direct access detection
                await page.goto("https://www.binance.com/en", {
                    waitUntil: "domcontentloaded",
                    timeout: 30000,
                });
                console.log("Loaded Binance homepage");
                await randomSleep(2000, 3000);
                // Go directly to the announcements page
                await page.goto(url, {
                    waitUntil: "domcontentloaded",
                    timeout: 30000,
                });
                console.log(`Loaded page: ${url}`);
                // Simulate human scrolling
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
                // Simple wait for content to load
                await randomSleep(3000, 5000);
                // Check for verification page
                const pageContent = await page.content();
                if (pageContent.includes("Human Verification") ||
                    pageContent.includes("verify") ||
                    pageContent.includes("captcha")) {
                    console.log("DETECTED HUMAN VERIFICATION PAGE - attempting to bypass...");
                    // Try to solve simple verification if available
                    try {
                        await page
                            .click('button:has-text("Verify")', { timeout: 5000 })
                            .catch(() => { });
                        await page
                            .click('button:has-text("I am human")', { timeout: 5000 })
                            .catch(() => { });
                        await page.click(".slider", { timeout: 5000 }).catch(() => { });
                        // Wait to see if verification completes
                        await randomSleep(5000, 8000);
                    }
                    catch (verifyError) {
                        console.log("Error during verification bypass attempt:", verifyError);
                    }
                }
                // Take screenshot for debugging if we're in development
                if (process.env.NODE_ENV !== "production") {
                    await page.screenshot({ path: "binance-debug.png" });
                    console.log("Screenshot saved to binance-debug.png");
                }
                else {
                    // In production, try to save to the data directory
                    try {
                        const dataDir = path.join(process.cwd(), "data");
                        await fs.mkdir(dataDir, { recursive: true }).catch(() => { });
                        await page.screenshot({
                            path: path.join(dataDir, "binance-debug.png"),
                        });
                        console.log("Screenshot saved to data/binance-debug.png");
                    }
                    catch (e) {
                        console.log("Could not save screenshot:", e);
                    }
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
                // Save cookies for future use
                try {
                    const cookies = await context.cookies();
                    require("fs").writeFileSync(cookiesPath, JSON.stringify(cookies));
                    console.log("Cookies saved for future use");
                }
                catch (cookieError) {
                    console.error("Failed to save cookies:", cookieError.message);
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
        console.error(`Error in Playwright approach: ${error}`);
        throw error; // Propagate the error to trigger the fallback
    }
    finally {
        if (browser) {
            await browser
                .close()
                .catch((e) => console.error(`Error closing browser: ${e}`));
        }
    }
}
async function fetchWithAxios() {
    console.log("Fetching Binance announcements with Axios fallback...");
    const results = [];
    // Use the same URLs as in the Playwright approach
    const announcementUrls = [
        "https://www.binance.com/en/support/announcement/list/48",
    ];
    for (const url of announcementUrls) {
        try {
            console.log(`Fetching Binance announcements from URL: ${url}`);
            const response = await axios_1.default.get(url, {
                timeout: 30000,
                headers: {
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    "Accept-Language": "en-US,en;q=0.5",
                    Connection: "keep-alive",
                    "Cache-Control": "max-age=0",
                },
            });
            console.log(`Binance response status for ${url}: ${response.status}`);
            if (response.status === 200) {
                const html = response.data;
                console.log(`Binance HTML loaded from ${url}`);
                // Parse HTML using JSDOM
                const dom = new jsdom_1.JSDOM(html);
                const document = dom.window.document;
                // Get all links on the page
                const links = document.querySelectorAll("a");
                console.log(`Found ${links.length} links on the page`);
                const processedUrls = new Set();
                for (const link of links) {
                    try {
                        const href = link.getAttribute("href");
                        const text = link.textContent;
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
                                    console.log(`Added Binance announcement (Axios): "${title.substring(0, 50)}..."`);
                                }
                            }
                        }
                    }
                    catch (linkError) {
                        console.log(`Error processing link: ${linkError}`);
                        continue;
                    }
                }
            }
        }
        catch (error) {
            console.log(`Error fetching Binance announcements from ${url}: ${error}`);
            continue;
        }
    }
    console.log(`Found ${results.length} Binance announcements total using Axios fallback`);
    return results;
}
const binanceAdapter = {
    async fetchAnnouncements() {
        console.log("Starting Binance announcement fetch...");
        // First try with Playwright
        try {
            return await fetchWithPlaywright();
        }
        catch (error) {
            console.log(`Playwright approach failed: ${error}. Trying with Axios fallback...`);
            return await fetchWithAxios();
        }
    },
};
exports.default = binanceAdapter;
