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
exports.ensureDataDirExists = ensureDataDirExists;
exports.loadPreviousListings = loadPreviousListings;
exports.saveListings = saveListings;
exports.displayAnnouncementsTable = displayAnnouncementsTable;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const config_1 = __importDefault(require("../config"));
/**
 * Ensure the data directory exists
 */
async function ensureDataDirExists(dataPath) {
    const dirPath = dataPath || config_1.default.dataPath;
    try {
        await fs.access(dirPath);
    }
    catch (err) {
        console.log(`Creating data directory: ${dirPath}`);
        await fs.mkdir(dirPath, { recursive: true });
    }
}
/**
 * Load previous listings from file
 */
async function loadPreviousListings(filePath, adapter) {
    try {
        // Try to read previous listings
        const data = await fs.readFile(filePath, "utf8");
        return JSON.parse(data);
    }
    catch (err) {
        console.log(`No previous listings found for ${filePath}, creating new file`);
        return { symbols: [] };
    }
}
/**
 * Save listings to file
 */
async function saveListings(filePath, data, adapter) {
    // Ensure the directory exists
    const dir = path.dirname(filePath);
    await ensureDataDirExists(dir);
    // Write the data
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}
/**
 * Display announcements in a formatted table
 */
function displayAnnouncementsTable(announcements) {
    console.log("\nNew Announcements:");
    console.log("=================");
    announcements.forEach((announcement) => {
        console.log(`\nExchange: ${announcement.exchange}`);
        console.log(`Title: ${announcement.title}`);
        console.log(`Date: ${announcement.date}`);
        console.log(`Link: ${announcement.link}`);
        console.log("-----------------");
    });
}
