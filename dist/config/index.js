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
            enabled: process.env.BINANCE_ENABLED === "true",
        },
        coinbase: {
            apiUrl: "https://api.exchange.coinbase.com/products",
            dataFile: "coinbase_listings.json",
            enabled: process.env.COINBASE_ENABLED === "true",
        },
        kraken: {
            apiUrl: "https://api.kraken.com/0/public/AssetPairs",
            dataFile: "kraken_listings.json",
            enabled: process.env.KRAKEN_ENABLED === "true",
        },
        okx: {
            apiUrl: "https://www.okx.com/api/v5/public/instruments?instType=SPOT",
            dataFile: "okx_listings.json",
            enabled: process.env.OKX_ENABLED === "true",
        },
        bybit: {
            apiUrl: "https://api.bybit.com/v5/market/instruments-info?category=spot",
            dataFile: "bybit_listings.json",
            enabled: process.env.BYBIT_ENABLED === "true",
        },
        kucoin: {
            apiUrl: "https://api.kucoin.com/api/v1/symbols",
            dataFile: "kucoin_listings.json",
            enabled: process.env.KUCOIN_ENABLED === "true",
        },
        gateio: {
            apiUrl: "https://api.gateio.ws/api/v4/spot/currency_pairs",
            dataFile: "gateio_listings.json",
            enabled: process.env.GATEIO_ENABLED === "true",
        },
        mexc: {
            apiUrl: "https://api.mexc.com/api/v3/exchangeInfo",
            dataFile: "mexc_listings.json",
            enabled: process.env.MEXC_ENABLED === "true",
        },
    },
    // Announcement configuration
    announcements: {
        dataFile: path.resolve(__dirname, "../../data/announcements.json"),
        enabledExchanges: (process.env.ANNOUNCEMENT_EXCHANGES || "binance,okx").split(","),
        binance: {
            url: "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing",
            enabled: process.env.BINANCE_ANNOUNCEMENTS_ENABLED === "true",
        },
        okx: {
            url: "https://www.okx.com/support/hc/en-us/sections/360000030652-Latest-Announcements",
            enabled: process.env.OKX_ANNOUNCEMENTS_ENABLED === "true",
        },
    },
};
exports.default = config;
