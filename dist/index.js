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
const cron = __importStar(require("node-cron"));
const config_1 = __importDefault(require("./config"));
const exchanges_1 = __importDefault(require("./adapters/exchanges"));
const utils_1 = require("./utils");
const announcements_1 = require("./services/announcements");
const email_1 = require("./services/email");
/**
 * Check for new crypto listings
 */
async function checkNewListings() {
    try {
        console.log("Checking for new listings...");
        // Check each exchange for new listings
        for (const [exchangeName, adapter] of Object.entries(exchanges_1.default)) {
            if (!config_1.default.exchanges[exchangeName]?.enabled) {
                console.log(`Skipping ${exchangeName} (disabled in config)`);
                continue;
            }
            console.log(`Checking ${exchangeName} for new listings...`);
            try {
                // Load previous listings
                const previousData = await (0, utils_1.loadPreviousListings)(adapter.getDataFilePath());
                const previousSymbols = new Set(previousData.symbols.map((s) => s.symbol));
                // Fetch current listings
                const currentData = await adapter.fetchListings();
                // Find new symbols
                const newSymbols = currentData.symbols.filter((symbol) => !previousSymbols.has(symbol.symbol));
                if (newSymbols.length > 0) {
                    console.log(`Found ${newSymbols.length} new listings on ${exchangeName}:`);
                    newSymbols.forEach((symbol) => {
                        console.log(`- ${symbol.baseAsset}/${symbol.quoteAsset} (${symbol.symbol})`);
                    });
                    // Send notification
                    await (0, email_1.sendEmailNotification)(newSymbols);
                    // Save updated listings
                    await (0, utils_1.saveListings)(adapter.getDataFilePath(), {
                        symbols: [...previousData.symbols, ...newSymbols],
                    });
                }
                else {
                    console.log(`No new listings found on ${exchangeName}`);
                }
            }
            catch (error) {
                console.error(`Error checking ${exchangeName}:`, error);
            }
        }
    }
    catch (error) {
        console.error("Error checking for new listings:", error);
    }
}
/**
 * Main function
 */
async function main() {
    try {
        // Initialize email service
        (0, email_1.initEmail)();
        // Test email setup
        await (0, email_1.testEmailSetup)();
        // Ensure data directory exists
        await (0, utils_1.ensureDataDirExists)(config_1.default.dataPath);
        // Perform initial check
        console.log("Performing initial check for new listings...");
        await checkNewListings();
        console.log("Performing initial check for new announcements...");
        await (0, announcements_1.checkAnnouncements)();
        // Schedule regular checks
        console.log(`Scheduling checks to run every ${config_1.default.checkInterval} minutes`);
        cron.schedule(`*/${config_1.default.checkInterval} * * * *`, async () => {
            console.log("\n--- Running scheduled check ---");
            await checkNewListings();
            await (0, announcements_1.checkAnnouncements)();
        });
        console.log("Crypto tracker is now running...");
    }
    catch (error) {
        console.error("Error in main function:", error);
        process.exit(1);
    }
}
// Start the application
main();
