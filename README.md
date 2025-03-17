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

## Project Structure

The project has been reorganized into a modular structure:

```
├── src/
│   ├── index.js             # Main application entry point
│   ├── config/              # Configuration files
│   │   └── index.js         # Main config
│   ├── adapters/            # Exchange and announcement adapters
│   │   ├── exchanges/       # Exchange API adapters
│   │   │   ├── index.js     # Exports all exchange adapters
│   │   │   ├── binance.js   # Binance adapter
│   │   │   └── ...
│   │   └── announcements/   # Announcement page adapters
│   │       ├── index.js     # Exports all announcement adapters
│   │       ├── binance.js   # Binance announcements adapter
│   │       └── okx.js       # OKX announcements adapter
│   ├── services/            # Business logic
│   │   ├── email.js         # Email notification service
│   │   ├── listings.js      # Listing check service
│   │   └── announcements.js # Announcement check service
│   └── utils/               # Utility functions
│       └── index.js         # Common utilities
├── data/                    # Data storage for listings and announcements
├── .env.local               # Environment variables (not in repository)
└── package.json             # Project metadata and dependencies
```

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

3. Create a `.env.local` file with your configuration:

   ```
   # Email configuration
   EMAIL_ENABLED=true
   EMAIL_FROM=your-email@gmail.com
   EMAIL_TO=recipient@example.com
   SENDGRID_API_KEY=your_sendgrid_api_key
   # Or for Gmail
   EMAIL_USER=your-email@gmail.com
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
   ENABLE_OKX_ANNOUNCEMENTS=true
   ```

4. Run the application:
   ```bash
   npm start
   ```

## Configuration

You can configure the application by modifying the `src/config/index.js` file:

- Change email settings
- Enable/disable exchanges
- Adjust check intervals
- Customize data paths

## Why Use Announcement Monitoring?

Exchanges typically announce new listings before they actually appear in their API. By monitoring announcement pages, you can:

1. **Get Earlier Notifications**: Be notified as soon as an exchange announces a new listing, often days before it's actually listed
2. **Beat Market Reaction**: Potentially act before the majority of traders who wait for the listing to appear
3. **Make More Informed Decisions**: Access the full announcement with details about the listing process and timeline

## Running in Production

For production deployment, consider using a process manager like PM2:

```bash
npm install -g pm2
pm2 start src/index.js --name crypto-tracker
```

## License

MIT

## Disclaimer

This tool is for informational purposes only and should not be considered financial advice. Cryptocurrency investments are volatile and risky. Always do your own research before investing.
