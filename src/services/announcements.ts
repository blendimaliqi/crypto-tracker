import * as fs from "fs/promises";
import * as path from "path";
import config from "../config";
import { Announcement, displayAnnouncementsTable } from "../utils";
import announcementAdapters from "../adapters/announcements";
import { AnnouncementAdapter } from "../adapters/announcements";
import { sendAnnouncementEmailNotification } from "./email";

interface AnnouncementData {
  announcements: Announcement[];
}

/**
 * Load previous announcements from file
 */
export async function loadPreviousAnnouncements(): Promise<AnnouncementData> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(config.announcements.dataFile);
    try {
      await fs.access(dataDir);
    } catch (err) {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Try to read previous announcements
    const data = await fs.readFile(config.announcements.dataFile, "utf8");
    return JSON.parse(data) as AnnouncementData;
  } catch (err) {
    console.log("No previous announcements found, creating new file");
    return { announcements: [] };
  }
}

/**
 * Save announcements to file
 */
export async function saveAnnouncements(
  announcementData: AnnouncementData
): Promise<void> {
  await fs.writeFile(
    config.announcements.dataFile,
    JSON.stringify(announcementData, null, 2)
  );
}

/**
 * Check for new announcements and notify
 */
export async function checkAnnouncements(): Promise<void> {
  try {
    console.log("Checking for new announcements...");

    const previousData = await loadPreviousAnnouncements();
    const previousAnnouncements = previousData.announcements;

    let newAnnouncements: Announcement[] = [];

    // Check each exchange's announcements
    for (const [exchangeName, adapter] of Object.entries(
      announcementAdapters
    ) as [string, AnnouncementAdapter][]) {
      if (!config.announcements.enabledExchanges.includes(exchangeName)) {
        continue;
      }

      console.log(`Checking ${exchangeName} for announcements...`);

      try {
        const announcements = await adapter.fetchAnnouncements();

        // Filter to find new announcements
        const existingAnnouncementIds = new Set(
          previousAnnouncements
            .filter((a) => a.exchange === exchangeName)
            .map((a) => a.id)
        );

        const filteredAnnouncements = announcements.filter(
          (announcement) => !existingAnnouncementIds.has(announcement.id)
        );

        if (filteredAnnouncements.length > 0) {
          console.log(
            `Found ${filteredAnnouncements.length} new announcements from ${exchangeName}`
          );
          newAnnouncements = [...newAnnouncements, ...filteredAnnouncements];
        } else {
          console.log(`No new announcements found from ${exchangeName}`);
        }
      } catch (error) {
        console.error(
          `Error fetching announcements from ${exchangeName}:`,
          error
        );
      }
    }

    // If we have new announcements, notify and save
    if (newAnnouncements.length > 0) {
      console.log(`Found ${newAnnouncements.length} new announcements total`);

      // Display announcements in the console
      displayAnnouncementsTable(newAnnouncements);

      // Send email notifications
      await sendAnnouncementEmailNotification(newAnnouncements);

      // Save the combined announcements
      await saveAnnouncements({
        announcements: [...previousAnnouncements, ...newAnnouncements],
      });
    } else {
      console.log("No new announcements found");
    }
  } catch (error) {
    console.error("Error checking for announcements:", error);
  }
}
