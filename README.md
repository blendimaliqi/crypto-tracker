# Crypto Listing Monitor

A tool to monitor cryptocurrency exchanges for new coin listings and announcements, sending email notifications when new listings are detected.

## Features

- **Real-time API Monitoring**: Checks exchange APIs for newly listed trading pairs
- **Announcement Page Monitoring**: Scrapes exchange announcement pages to detect upcoming listings before they appear in the API
- **Early Detection**: Get notifications about new coins before they're actually listed and potentially before significant price movements
- **Multiple Exchange Support**: Monitors major exchanges including Binance, Coinbase, Kraken, OKX, Bybit, Kucoin, Gate.io, and MEXC
- **Email Notifications**: Receive detailed notifications via email about new listings and announcements

## How It Works

The application has two main monitoring systems:

1. **API Monitoring**

   - Fetches data from exchange APIs to find newly listed trading pairs
   - Compares with previously stored data to detect new listings
   - Sends notifications when new coins appear in the API

2. **Announcement Monitoring**
   - Scrapes exchange announcement pages to find posts about upcoming listings
   - Uses pattern matching to find announcements with keywords like "Will List", "Listing", etc.
   - Extracts potential coin symbols from announcements
   - Sends notifications about new listing announcements before they appear in the API

## Getting Started

### Prerequisites

- Node.js (14.x or higher)
- NPM or Yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/crypto-listing-monitor.git
   cd crypto-listing-monitor
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with your configuration:

   ```
   # Email configuration
   EMAIL_ENABLED=true
   EMAIL_FROM=your-email@gmail.com
   EMAIL_TO=recipient@example.com
   SENDGRID_API_KEY=your_sendgrid_api_key
   # Or for Gmail
   APP_PASSWORD=your_gmail_app_password

   # Exchange API monitoring
   ENABLE_BINANCE=true
   ENABLE_COINBASE=true
   ENABLE_KRAKEN=true
   ENABLE_OKX=true
   ENABLE_BYBIT=true
   ENABLE_KUCOIN=true
   ENABLE_GATEIO=true
   ENABLE_MEXC=true

   # Announcement monitoring
   ENABLE_BINANCE_ANNOUNCEMENTS=true
   ENABLE_COINBASE_ANNOUNCEMENTS=true
   ENABLE_KRAKEN_ANNOUNCEMENTS=true
   ENABLE_OKX_ANNOUNCEMENTS=true
   ENABLE_BYBIT_ANNOUNCEMENTS=true
   ENABLE_KUCOIN_ANNOUNCEMENTS=true
   ENABLE_GATEIO_ANNOUNCEMENTS=true
   ```

4. Run the application:
   ```bash
   npm start
   ```

## Why Use Announcement Monitoring?

Exchanges typically announce new listings before they actually appear in their API. By monitoring announcement pages, you can:

1. **Get Earlier Notifications**: Be notified as soon as an exchange announces a new listing, often days before it's actually listed
2. **Beat Market Reaction**: Potentially act before the majority of traders who wait for the listing to appear
3. **Make More Informed Decisions**: Access the full announcement with details about the listing process and timeline

## Customization

You can customize the check frequency by modifying the `CHECK_INTERVAL` environment variable using cron syntax.

## License

MIT

## Disclaimer

This tool is for informational purposes only and should not be considered financial advice. Cryptocurrency investments are volatile and risky. Always do your own research before investing.
