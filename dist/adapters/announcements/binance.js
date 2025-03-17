"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_1 = require("playwright");
const binanceAdapter = {
    async fetchAnnouncements() {
        console.log("Starting Binance announcement fetch...");
        let browser;
        try {
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
                logger: {
                    isEnabled: (name, severity) => severity === "error" || severity === "warning",
                    log: (name, severity, message, args) => console.log(`[Playwright ${severity}] ${name}: ${message}`),
                },
            });
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
            });
            // Add human-like behavior
            await context.addInitScript(() => {
                // Override the navigator properties to avoid detection
                Object.defineProperty(navigator, "webdriver", {
                    get: () => false,
                    configurable: true,
                });
                // Add additional properties to appear more like a real browser
                Object.defineProperty(navigator, "languages", {
                    get: () => ["en-US", "en"],
                    configurable: true,
                });
            });
            const page = await context.newPage();
            // First go to the homepage
            console.log("Navigating to Binance homepage...");
            await page.goto("https://www.binance.com/en", {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });
            console.log("Loaded Binance homepage");
            await page.waitForTimeout(3000);
            // Then navigate to the specific announcements page
            const announcementUrl = "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing?c=48&navId=48";
            console.log(`Navigating to Binance announcements page: ${announcementUrl}`);
            await page.goto(announcementUrl, {
                waitUntil: "networkidle",
                timeout: 60000,
            });
            console.log("Announcements page loaded successfully");
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
            await page.waitForTimeout(2000);
            // Check for human verification
            const pageContent = await page.content();
            if (pageContent.includes("Human Verification") ||
                pageContent.includes("verify") ||
                pageContent.includes("captcha")) {
                console.log("DETECTED HUMAN VERIFICATION PAGE - attempting to bypass...");
                try {
                    // Try to click verification buttons
                    await page.click('button:has-text("Verify")').catch(() => { });
                    await page.click('button:has-text("I am human")').catch(() => { });
                    await page.click(".slider").catch(() => { });
                    await page.waitForTimeout(5000);
                    const newContent = await page.content();
                    if (!newContent.includes("Human Verification") &&
                        !newContent.includes("verify")) {
                        console.log("Successfully bypassed verification!");
                    }
                    else {
                        console.log("Unable to automatically bypass verification");
                    }
                }
                catch (error) {
                    console.log("Error during verification bypass attempt:", error);
                }
            }
            // Extract announcement data from the page with all methods used in original implementation
            console.log("Extracting announcement data based on specific HTML structure...");
            const announcements = await page.evaluate(() => {
                const results = [];
                // Function to log element counts for debugging
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
                            if (symbol.length >= 2 &&
                                symbol.length <= 10 &&
                                !["FOR", "THE", "AND", "USD", "USDT", "BTC", "ETH"].includes(symbol)) {
                                symbols.push(symbol);
                            }
                        });
                    }
                    return symbols;
                };
                // Method 1: Target the specific structure seen in the screenshot
                console.log("Trying Method 1: headline structure");
                const headlines = logElementCount('h2.typography-headline5, h2[class*="typography"], .typography-headline5, h1, h2, h3, .css-1wmf07e, .css-1d1udl3, .css-zn14ny', "headline");
                headlines.forEach((headline) => {
                    const text = headline.textContent?.trim() || "";
                    console.log(`Found headline text: "${text}"`);
                    if (text && text.toLowerCase().includes("listing")) {
                        // Found a listing headline, now find the actual announcements
                        console.log(`Found listing headline: ${text}`);
                        // Look in parent and siblings
                        const parentSection = headline.closest(".bn-flex") ||
                            headline.closest("section") ||
                            headline.closest("div");
                        if (parentSection) {
                            // Find all announcement links in this section
                            const links = parentSection.querySelectorAll('a[class*="text-Primary"], a.text-PrimaryText, a[href*="support/announcement"], a[href*="listing"], a');
                            console.log(`Found ${links.length} links under headline`);
                            links.forEach((link) => {
                                const title = link.textContent?.trim() || "";
                                if (!title || title.length < 10)
                                    return;
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
                                    "spot trading",
                                    "trading pair",
                                    "token",
                                ];
                                const hasKeyword = keywords.some((kw) => title.toLowerCase().includes(kw));
                                if (hasKeyword) {
                                    const url = link.getAttribute("href") || "";
                                    const symbols = extractSymbols(title);
                                    // Skip the link if it's not a "real" link
                                    if (!url || url === "#" || url.startsWith("javascript"))
                                        return;
                                    results.push({
                                        id: `binance-${btoa(encodeURIComponent(`${title}-${url}`))}`,
                                        title,
                                        link: url.startsWith("http")
                                            ? url
                                            : `https://www.binance.com${url}`,
                                        date: new Date().toISOString(),
                                        exchange: "binance",
                                    });
                                    console.log(`Found announcement: ${title}`);
                                }
                            });
                        }
                    }
                });
                // Method 2: Target all flex containers
                console.log("Trying Method 2: flex containers");
                const flexItems = logElementCount(".bn-flex.flex-col.gap-6, .bn-flex.flex-col.gap-4, .bn-flex, [class*='card'], [class*='list-item']", "flex container");
                flexItems.forEach((container) => {
                    // Look for links within these containers
                    const links = container.querySelectorAll("a");
                    links.forEach((link) => {
                        const title = link.textContent?.trim() || "";
                        if (!title || title.length < 10)
                            return;
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
                            "token",
                            "trading pair",
                        ];
                        const hasKeyword = keywords.some((kw) => title.toLowerCase().includes(kw));
                        if (hasKeyword) {
                            const url = link.getAttribute("href") || "";
                            const symbols = extractSymbols(title);
                            // Skip the link if it's not a "real" link
                            if (!url || url === "#" || url.startsWith("javascript"))
                                return;
                            // Check for duplicates before adding
                            const isDuplicate = results.some((item) => item.title === title || (item.link === url && url !== ""));
                            if (!isDuplicate) {
                                results.push({
                                    id: `binance-${btoa(encodeURIComponent(`${title}-${url}`))}`,
                                    title,
                                    link: url.startsWith("http")
                                        ? url
                                        : `https://www.binance.com${url}`,
                                    date: new Date().toISOString(),
                                    exchange: "binance",
                                });
                            }
                        }
                    });
                });
                // Method 3: Direct targeting of announcement items
                console.log("Trying Method 3: direct announcement links");
                const selectors = [
                    'a[href*="/support/announcement/detail/"]',
                    'a[href*="/support/announcement"]',
                    'a[href*="listing"]',
                    "a.css-vlibs4",
                    '[class*="announcement"]',
                    '[class*="article"]',
                ];
                selectors.forEach((selector) => {
                    const announcementItems = logElementCount(selector, `direct links (${selector})`);
                    announcementItems.forEach((item) => {
                        const title = item.textContent?.trim() || "";
                        if (!title || title.length < 10)
                            return;
                        // Extract URL
                        let url = "";
                        if (item.tagName === "A") {
                            url = item.getAttribute("href") || "";
                        }
                        else {
                            const linkElement = item.querySelector("a");
                            if (linkElement) {
                                url = linkElement.getAttribute("href") || "";
                            }
                        }
                        // Skip empty URLs
                        if (!url)
                            return;
                        // Check for listing-related keywords
                        const lowerTitle = title.toLowerCase();
                        const hasListingKeyword = (lowerTitle.includes("list") ||
                            lowerTitle.includes("support") ||
                            lowerTitle.includes("adds") ||
                            lowerTitle.includes("trading pair") ||
                            lowerTitle.includes("new token")) &&
                            !lowerTitle.includes("delisting") &&
                            !lowerTitle.includes("removal");
                        if (hasListingKeyword) {
                            const symbols = extractSymbols(title);
                            // Check for duplicates before adding
                            const isDuplicate = results.some((existing) => existing.title === title ||
                                (existing.link === url && url !== ""));
                            if (!isDuplicate) {
                                results.push({
                                    id: `binance-${btoa(encodeURIComponent(`${title}-${url}`))}`,
                                    title,
                                    link: url.startsWith("http")
                                        ? url
                                        : `https://www.binance.com${url}`,
                                    date: new Date().toISOString(),
                                    exchange: "binance",
                                });
                            }
                        }
                    });
                });
                console.log(`Found ${results.length} total announcements on page`);
                return results;
            });
            // Now try to find any announcements in the direct DOM
            console.log("Attempting direct page extraction...");
            // Get all links on the page
            const allLinks = await page.$$("a");
            console.log(`Found ${allLinks.length} links on the page`);
            for (const link of allLinks) {
                try {
                    const href = (await link.getAttribute("href")) || "";
                    // Skip irrelevant links
                    if (!href ||
                        href.includes("javascript:") ||
                        href.includes("#") ||
                        href.includes("telegram") ||
                        href.includes("twitter") ||
                        href.includes("login")) {
                        continue;
                    }
                    // Skip non-announcement links
                    if (!href.includes("announcement") && !href.includes("listing")) {
                        continue;
                    }
                    const title = (await link.textContent()) || "";
                    const trimmedTitle = title.trim();
                    // Skip short or empty titles
                    if (!trimmedTitle || trimmedTitle.length < 10)
                        continue;
                    // Check if it contains listing-related keywords
                    const lowerTitle = trimmedTitle.toLowerCase();
                    const isListing = (lowerTitle.includes("list") ||
                        lowerTitle.includes("support") ||
                        lowerTitle.includes("adds") ||
                        lowerTitle.includes("trading pair") ||
                        lowerTitle.includes("new token")) &&
                        !lowerTitle.includes("delisting") &&
                        !lowerTitle.includes("removal");
                    if (isListing) {
                        const fullUrl = href.startsWith("http")
                            ? href
                            : `https://www.binance.com${href}`;
                        const id = `binance-${Buffer.from(`${trimmedTitle}-${fullUrl}`).toString("base64")}`;
                        // Check for duplicates
                        const isDuplicate = announcements.some((a) => a.title === trimmedTitle || a.link === fullUrl);
                        if (!isDuplicate) {
                            announcements.push({
                                id,
                                title: trimmedTitle,
                                link: fullUrl,
                                date: new Date().toISOString(),
                                exchange: "binance",
                            });
                            console.log(`Added Binance announcement directly: "${trimmedTitle.substring(0, 50)}..."`);
                        }
                    }
                }
                catch (error) {
                    console.error("Error processing a link:", error);
                }
            }
            // Try a second page for announcements
            console.log("Trying second Binance announcements URL...");
            await page.goto("https://www.binance.com/en/support/announcement/latest-binance-listings", {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });
            // Wait and scroll
            await page.waitForTimeout(2000);
            await page.evaluate(() => window.scrollBy(0, 1000));
            await page.waitForTimeout(1000);
            // Get links from this page
            const latestListingLinks = await page.$$("a");
            for (const link of latestListingLinks) {
                try {
                    const href = (await link.getAttribute("href")) || "";
                    if (!href || href === "#" || href.startsWith("javascript:"))
                        continue;
                    const title = (await link.textContent()) || "";
                    if (!title || title.length < 10)
                        continue;
                    const lowerTitle = title.toLowerCase();
                    const isListing = (lowerTitle.includes("list") ||
                        lowerTitle.includes("support") ||
                        lowerTitle.includes("adds") ||
                        lowerTitle.includes("trading pair") ||
                        lowerTitle.includes("new")) &&
                        !lowerTitle.includes("delisting") &&
                        !lowerTitle.includes("removal");
                    if (isListing) {
                        const fullUrl = href.startsWith("http")
                            ? href
                            : `https://www.binance.com${href}`;
                        const id = `binance-${Buffer.from(`${title}-${fullUrl}`).toString("base64")}`;
                        // Check for duplicates
                        const isDuplicate = announcements.some((a) => a.title === title || a.link === fullUrl);
                        if (!isDuplicate) {
                            announcements.push({
                                id,
                                title,
                                link: fullUrl,
                                date: new Date().toISOString(),
                                exchange: "binance",
                            });
                            console.log(`Added Binance announcement from second page: "${title.substring(0, 50)}..."`);
                        }
                    }
                }
                catch (error) {
                    // Ignore individual link errors
                }
            }
            console.log(`Extracted ${announcements.length} relevant announcements from Binance`);
            return announcements;
        }
        catch (error) {
            console.error("Error fetching Binance announcements:", error);
            return [];
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
    },
};
exports.default = binanceAdapter;
