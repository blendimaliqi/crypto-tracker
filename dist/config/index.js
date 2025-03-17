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
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables from .env.local file
dotenv.config({ path: ".env.local" });
// Helper function to check all possible environment variable formats
function getBooleanEnv(keys) {
    for (const key of keys) {
        if (process.env[key] === "true") {
            return true;
        }
    }
    return false;
}
// Determine enabled exchanges for announcements
const determineEnabledAnnouncementExchanges = () => {
    // First check for the explicit ANNOUNCEMENT_EXCHANGES variable
    if (process.env.ANNOUNCEMENT_EXCHANGES) {
        return process.env.ANNOUNCEMENT_EXCHANGES.split(",");
    }
    // Otherwise build the list from individual exchange settings
    const exchanges = [];
    if (getBooleanEnv([
        "BINANCE_ANNOUNCEMENTS_ENABLED",
        "ENABLE_BINANCE_ANNOUNCEMENTS",
    ])) {
        exchanges.push("binance");
    }
    if (getBooleanEnv(["OKX_ANNOUNCEMENTS_ENABLED", "ENABLE_OKX_ANNOUNCEMENTS"])) {
        exchanges.push("okx");
    }
    // Add others as needed
    return exchanges.length > 0 ? exchanges : ["binance", "okx"];
};
// Create the configuration object
const config = {
    dataPath: path.resolve(__dirname, "../../data"),
    checkInterval: parseInt(process.env.CHECK_INTERVAL || "15", 10),
    // Email configuration
    email: {
        enabled: process.env.EMAIL_ENABLED === "true",
        service: (process.env.EMAIL_SERVICE || "none"),
        from: {
            name: process.env.EMAIL_FROM_NAME || "Crypto Tracker",
            email: process.env.EMAIL_FROM_EMAIL || "no-reply@example.com",
        },
        to: process.env.EMAIL_TO || "",
        sendgrid: {
            apiKey: process.env.SENDGRID_API_KEY || "",
        },
        smtp: {
            host: process.env.SMTP_HOST || "smtp.example.com",
            port: parseInt(process.env.SMTP_PORT || "587", 10),
            secure: process.env.SMTP_SECURE === "true",
            user: process.env.SMTP_USER || "",
            pass: process.env.SMTP_PASS || "",
        },
    },
    // Exchange API configuration
    exchanges: {
        binance: {
            apiUrl: "https://api.binance.com/api/v3/exchangeInfo",
            dataFile: "binance_listings.json",
            enabled: getBooleanEnv(["BINANCE_ENABLED", "ENABLE_BINANCE"]),
        },
        coinbase: {
            apiUrl: "https://api.exchange.coinbase.com/products",
            dataFile: "coinbase_listings.json",
            enabled: getBooleanEnv(["COINBASE_ENABLED", "ENABLE_COINBASE"]),
        },
        kraken: {
            apiUrl: "https://api.kraken.com/0/public/AssetPairs",
            dataFile: "kraken_listings.json",
            enabled: getBooleanEnv(["KRAKEN_ENABLED", "ENABLE_KRAKEN"]),
        },
        okx: {
            apiUrl: "https://www.okx.com/api/v5/public/instruments?instType=SPOT",
            dataFile: "okx_listings.json",
            enabled: getBooleanEnv(["OKX_ENABLED", "ENABLE_OKX"]),
        },
        bybit: {
            apiUrl: "https://api.bybit.com/v5/market/instruments-info?category=spot",
            dataFile: "bybit_listings.json",
            enabled: getBooleanEnv(["BYBIT_ENABLED", "ENABLE_BYBIT"]),
        },
        kucoin: {
            apiUrl: "https://api.kucoin.com/api/v1/symbols",
            dataFile: "kucoin_listings.json",
            enabled: getBooleanEnv(["KUCOIN_ENABLED", "ENABLE_KUCOIN"]),
        },
        gateio: {
            apiUrl: "https://api.gateio.ws/api/v4/spot/currency_pairs",
            dataFile: "gateio_listings.json",
            enabled: getBooleanEnv(["GATEIO_ENABLED", "ENABLE_GATEIO"]),
        },
        mexc: {
            apiUrl: "https://api.mexc.com/api/v3/exchangeInfo",
            dataFile: "mexc_listings.json",
            enabled: getBooleanEnv(["MEXC_ENABLED", "ENABLE_MEXC"]),
        },
    },
    // Announcement configuration
    announcements: {
        dataFile: path.resolve(__dirname, "../../data/announcements.json"),
        enabledExchanges: determineEnabledAnnouncementExchanges(),
        binance: {
            url: "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing",
            enabled: getBooleanEnv([
                "BINANCE_ANNOUNCEMENTS_ENABLED",
                "ENABLE_BINANCE_ANNOUNCEMENTS",
            ]),
        },
        okx: {
            url: "https://www.okx.com/support/hc/en-us/sections/360000030652-Latest-Announcements",
            enabled: getBooleanEnv([
                "OKX_ANNOUNCEMENTS_ENABLED",
                "ENABLE_OKX_ANNOUNCEMENTS",
            ]),
        },
    },
};
// Log config details for debugging
console.log("Config loaded with the following settings:");
console.log(`- Binance enabled: ${config.exchanges.binance.enabled}`);
console.log(`- OKX enabled: ${config.exchanges.okx.enabled}`);
console.log(`- Binance announcements enabled: ${config.announcements.binance.enabled}`);
console.log(`- OKX announcements enabled: ${config.announcements.okx.enabled}`);
console.log(`- Enabled announcement exchanges: ${config.announcements.enabledExchanges.join(", ")}`);
exports.default = config;
