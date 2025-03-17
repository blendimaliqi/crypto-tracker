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
exports.loadPreviousAnnouncements = loadPreviousAnnouncements;
exports.saveAnnouncements = saveAnnouncements;
exports.checkAnnouncements = checkAnnouncements;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const config_1 = __importDefault(require("../config"));
const utils_1 = require("../utils");
const announcements_1 = __importDefault(require("../adapters/announcements"));
const email_1 = require("./email");
/**
 * Load previous announcements from file
 */
async function loadPreviousAnnouncements() {
    try {
        // Ensure data directory exists
        const dataDir = path.dirname(config_1.default.announcements.dataFile);
        try {
            await fs.access(dataDir);
        }
        catch (err) {
            await fs.mkdir(dataDir, { recursive: true });
        }
        // Try to read previous announcements
        const data = await fs.readFile(config_1.default.announcements.dataFile, "utf8");
        return JSON.parse(data);
    }
    catch (err) {
        console.log("No previous announcements found, creating new file");
        return { announcements: [] };
    }
}
/**
 * Save announcements to file
 */
async function saveAnnouncements(announcementData) {
    await fs.writeFile(config_1.default.announcements.dataFile, JSON.stringify(announcementData, null, 2));
}
/**
 * Check for new announcements and notify
 */
async function checkAnnouncements() {
    try {
        console.log("Checking for new announcements...");
        const previousData = await loadPreviousAnnouncements();
        const previousAnnouncements = previousData.announcements;
        let newAnnouncements = [];
        // Check each exchange's announcements
        for (const [exchangeName, adapter] of Object.entries(announcements_1.default)) {
            if (!config_1.default.announcements.enabledExchanges.includes(exchangeName)) {
                continue;
            }
            console.log(`Checking ${exchangeName} for announcements...`);
            try {
                const announcements = await adapter.fetchAnnouncements();
                // Filter to find new announcements
                const existingAnnouncementIds = new Set(previousAnnouncements
                    .filter((a) => a.exchange === exchangeName)
                    .map((a) => a.id));
                const filteredAnnouncements = announcements.filter((announcement) => !existingAnnouncementIds.has(announcement.id));
                if (filteredAnnouncements.length > 0) {
                    console.log(`Found ${filteredAnnouncements.length} new announcements from ${exchangeName}`);
                    newAnnouncements = [...newAnnouncements, ...filteredAnnouncements];
                }
                else {
                    console.log(`No new announcements found from ${exchangeName}`);
                }
            }
            catch (error) {
                console.error(`Error fetching announcements from ${exchangeName}:`, error);
            }
        }
        // If we have new announcements, notify and save
        if (newAnnouncements.length > 0) {
            console.log(`Found ${newAnnouncements.length} new announcements total`);
            // Display announcements in the console
            (0, utils_1.displayAnnouncementsTable)(newAnnouncements);
            // Send email notifications
            await (0, email_1.sendAnnouncementEmailNotification)(newAnnouncements);
            // Save the combined announcements
            await saveAnnouncements({
                announcements: [...previousAnnouncements, ...newAnnouncements],
            });
        }
        else {
            console.log("No new announcements found");
        }
    }
    catch (error) {
        console.error("Error checking for announcements:", error);
    }
}
