import axios from "axios";
import { JSDOM } from "jsdom";
import { Announcement } from "../../utils";
import config from "../../config";
import { AnnouncementAdapter } from "./index";

// Define keywords for listings to match against announcement titles
const keywords = [
  "list",
  "add",
  "adds",
  "added",
  "adding",
  "support",
  "new",
  "token",
  "trading pair",
  "spot",
];

const okxAdapter: AnnouncementAdapter = {
  async fetchAnnouncements(): Promise<Announcement[]> {
    console.log("Starting OKX announcement fetch...");

    // Try multiple URLs known to contain announcements
    const urls = [
      "https://www.okx.com/help/section/announcements-new-listings",
      "https://www.okx.com/support/hc/en-us/sections/360000030652-Latest-Announcements",
      "https://www.okx.com/help/announcements",
    ];

    const announcements: Announcement[] = [];

    for (const url of urls) {
      try {
        console.log(`Fetching OKX announcements from URL: ${url}`);
        const response = await axios.get(url, {
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
        });

        console.log(`OKX response status for ${url}: ${response.status}`);

        if (!response.data || response.status !== 200) {
          console.warn(`OKX API response for ${url} isn't valid, skipping`);
          continue;
        }

        // Load HTML using JSDOM
        const dom = new JSDOM(response.data);
        const document = dom.window.document;

        console.log(`OKX HTML loaded from ${url}`);

        // Find all links on the page
        const links = document.querySelectorAll("a");
        console.log(`Found ${links.length} links on the page`);

        for (const link of links) {
          try {
            // Get the link URL
            const href = link.getAttribute("href") || "";

            // Skip irrelevant links
            if (
              !href ||
              href.includes("javascript:") ||
              href.includes("#") ||
              href.includes("telegram") ||
              href.includes("twitter") ||
              href.includes("login")
            ) {
              continue;
            }

            // Get the link text
            const title = link.textContent?.trim() || "";

            // Skip short or empty titles
            if (!title || title.length < 10) continue;

            const lowerTitle = title.toLowerCase();
            const hasKeyword = keywords.some((kw) => lowerTitle.includes(kw));

            if (
              hasKeyword &&
              !lowerTitle.includes("delist") &&
              !lowerTitle.includes("removal")
            ) {
              const fullUrl = href.startsWith("http")
                ? href
                : `https://www.okx.com${href}`;
              const id = `okx-${Buffer.from(`${title}-${fullUrl}`).toString(
                "base64"
              )}`;

              // Check for duplicates
              const isDuplicate = announcements.some(
                (a) => a.title === title || a.link === fullUrl
              );

              if (!isDuplicate) {
                announcements.push({
                  id,
                  title: title,
                  link: fullUrl,
                  date: new Date().toISOString(),
                  exchange: "okx",
                });

                console.log(
                  `Added OKX announcement: "${title.substring(0, 50)}..."`
                );
              }
            }
          } catch (err) {
            // Ignore errors in individual elements
            console.error("Error processing link:", err);
          }
        }

        // Also check direct selectors for announcements
        const possibleSelectors = [
          ".list-item",
          "article",
          ".listing-item",
          ".announcement-item",
          ".card",
          ".item",
          ".news-item",
          ".support-list-item",
        ];

        for (const selector of possibleSelectors) {
          const elements = document.querySelectorAll(selector);
          console.log(
            `Found ${elements.length} elements with selector "${selector}"`
          );

          for (const element of elements) {
            try {
              // Get text
              let title = element.textContent?.trim() || "";

              // If no text directly, try to find it in children
              if (!title || title.length < 10) {
                const titleElement = element.querySelector(
                  "h3, h2, strong, b, span, a"
                );
                if (titleElement) {
                  title = titleElement.textContent?.trim() || "";
                }
              }

              if (!title || title.length < 10) continue;

              // Check for listing-related keywords
              const lowerTitle = title.toLowerCase();
              const hasKeyword = keywords.some((kw) => lowerTitle.includes(kw));

              if (
                hasKeyword &&
                !lowerTitle.includes("delist") &&
                !lowerTitle.includes("removal")
              ) {
                // Find link in element or parent
                const linkElement =
                  element.querySelector("a") ||
                  element.parentElement?.querySelector("a");
                let href = "";

                if (element.tagName === "A") {
                  href = element.getAttribute("href") || "";
                } else if (linkElement) {
                  href = linkElement.getAttribute("href") || "";
                }

                if (!href) continue;

                const fullUrl = href.startsWith("http")
                  ? href
                  : `https://www.okx.com${href}`;
                const id = `okx-${Buffer.from(`${title}-${fullUrl}`).toString(
                  "base64"
                )}`;

                // Check for duplicates
                const isDuplicate = announcements.some(
                  (a) => a.title === title || a.link === fullUrl
                );

                if (!isDuplicate) {
                  announcements.push({
                    id,
                    title,
                    link: fullUrl,
                    date: new Date().toISOString(),
                    exchange: "okx",
                  });

                  console.log(
                    `Added OKX announcement from ${selector}: "${title.substring(
                      0,
                      50
                    )}..."`
                  );
                }
              }
            } catch (err) {
              console.error(`Error processing ${selector} element:`, err);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching OKX announcements from ${url}:`, error);
        // Continue to the next URL
      }
    }

    console.log(`Total OKX announcements found: ${announcements.length}`);
    return announcements;
  },
};

export default okxAdapter;
