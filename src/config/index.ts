import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env.local file
dotenv.config({ path: ".env.local" });

// Email configuration interfaces
interface SendGridConfig {
  apiKey: string;
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

interface EmailData {
  name?: string;
  email: string;
}

interface EmailConfig {
  enabled: boolean;
  service: "sendgrid" | "smtp" | "none";
  from: EmailData;
  to: string;
  sendgrid: SendGridConfig;
  smtp: SMTPConfig;
}

// Exchange configuration interfaces
interface ExchangeApiConfig {
  apiUrl: string;
  dataFile: string;
  enabled: boolean;
}

interface ExchangesConfig {
  [key: string]: ExchangeApiConfig;
}

// Announcement configuration interfaces
interface AnnouncementExchangeConfig {
  url: string;
  enabled: boolean;
}

interface AnnouncementConfig {
  dataFile: string;
  enabledExchanges: string[];
  binance: AnnouncementExchangeConfig;
  okx: AnnouncementExchangeConfig;
}

// Main config interface
interface Config {
  dataPath: string;
  checkInterval: number;
  email: EmailConfig;
  exchanges: ExchangesConfig;
  announcements: AnnouncementConfig;
}

// Create the configuration object
const config: Config = {
  dataPath: path.resolve(__dirname, "../../data"),
  checkInterval: parseInt(process.env.CHECK_INTERVAL || "15", 10),

  // Email configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === "true",
    service: (process.env.EMAIL_SERVICE || "none") as
      | "sendgrid"
      | "smtp"
      | "none",
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
    enabledExchanges: (
      process.env.ANNOUNCEMENT_EXCHANGES || "binance,okx"
    ).split(","),
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

export default config;
