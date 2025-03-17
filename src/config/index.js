const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from .env.local file
dotenv.config({ path: ".env.local" });

// Configuration
const config = {
  dataPath: path.join(__dirname, "../../data"),
  email: {
    enabled: true,
    from: "noreply@blendimaliqi.com",
    to: "blendi.maliqi93@gmail.com",
    apiKey: process.env.SENDGRID_API_KEY || process.env.APP_PASSWORD,
    testOnStartup: true,
    // Add nodemailer config as a fallback option
    nodemailer: {
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || "",
        pass: process.env.APP_PASSWORD || "",
      },
    },
    useNodemailer: !process.env.SENDGRID_API_KEY && !!process.env.APP_PASSWORD,
  },
  checkInterval: "*/15 * * * *", // Check every 15 minutes
  exchanges: {
    binance: {
      enabled: true,
      apiUrl: "https://api.binance.com/api/v3/exchangeInfo",
      dataFile: "binance_listings.json",
    },
    coinbase: {
      enabled: process.env.ENABLE_COINBASE === "true",
      apiUrl: "https://api.exchange.coinbase.com/products",
      dataFile: "coinbase_listings.json",
    },
    kraken: {
      enabled: process.env.ENABLE_KRAKEN === "true",
      apiUrl: "https://api.kraken.com/0/public/AssetPairs",
      dataFile: "kraken_listings.json",
    },
    okx: {
      enabled: process.env.ENABLE_OKX === "true",
      apiUrl: "https://www.okx.com/api/v5/public/instruments?instType=SPOT",
      dataFile: "okx_listings.json",
    },
    bybit: {
      enabled: process.env.ENABLE_BYBIT === "true",
      apiUrl: "https://api.bybit.com/v5/market/instruments-info?category=spot",
      dataFile: "bybit_listings.json",
    },
    cryptocom: {
      enabled: false,
      apiUrl: "https://api.crypto.com/v2/public/get-instruments",
      dataFile: "cryptocom_listings.json",
    },
    kucoin: {
      enabled: process.env.ENABLE_KUCOIN === "true",
      apiUrl: "https://api.kucoin.com/api/v1/symbols",
      dataFile: "kucoin_listings.json",
    },
    gateio: {
      enabled: process.env.ENABLE_GATEIO === "true",
      apiUrl: "https://api.gateio.ws/api/v4/spot/currency_pairs",
      dataFile: "gateio_listings.json",
    },
    mexc: {
      enabled: process.env.ENABLE_MEXC === "true",
      apiUrl: "https://api.mexc.com/api/v3/exchangeInfo",
      dataFile: "mexc_listings.json",
    },
    bitget: {
      enabled: false,
      apiUrl: "https://api.bitget.com/api/spot/v2/public/symbols",
      dataFile: "bitget_listings.json",
    },
  },
  announcements: {
    binance: {
      enabled: process.env.ENABLE_BINANCE_ANNOUNCEMENTS === "true",
      announcementUrl:
        "https://www.binance.com/en/support/announcement/new-cryptocurrency-listing?c=48&navId=48",
      dataFile: "binance_announcements.json",
    },
    okx: {
      enabled: process.env.ENABLE_OKX_ANNOUNCEMENTS === "true",
      announcementUrl:
        "https://www.okx.com/help/section/announcements-new-listings",
      dataFile: "okx_announcements.json",
    },
  },
};

module.exports = config;
