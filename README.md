# Crypto Listing Monitor

A little tool I made to watch crypto exchanges for new coin listings and send me emails when something pops up. Got tired of always missing the pumps 🚀

## What it does

- Checks exchange APIs for new listings
- Scrapes announcement pages to find upcoming listings
- Emails me when it finds something (hopefully before prices go crazy)
- Works with Binance, Coinbase, Kraken, OKX, Bybit, Kucoin, Gate.io, and MEXC

## How to use it

1. Clone this repo
2. Run `npm install`
3. Make a `.env.local` file with your stuff:

```
# Email settings
EMAIL_ENABLED=true
EMAIL_FROM=your-email@gmail.com
EMAIL_TO=your-email@gmail.com
SENDGRID_API_KEY=your_key_here
# Or for Gmail
EMAIL_USER=your-email@gmail.com
APP_PASSWORD=your_app_password

# Which exchanges to watch
ENABLE_BINANCE=true
ENABLE_COINBASE=true
# etc...

# Announcement scraping
ENABLE_BINANCE_ANNOUNCEMENTS=true
ENABLE_OKX_ANNOUNCEMENTS=true
```

4. Run it: `npm start`

## Why I made this

Got annoyed missing out on those sweet listing pumps. Exchanges usually announce new coins days before listing them, and prices often spike as soon as the announcement drops. This checks both the APIs (for actual new listings) and the announcement pages (for upcoming listings).

The announcement monitoring is the good stuff - it can catch listings before they happen and before everyone else notices.

## Running it 24/7

I just use PM2:

```bash
npm install -g pm2
pm2 start src/index.js --name crypto-watcher
```

## Project structure

It's kinda messy but it works. Main code is in `src/`, data gets saved in `data/`.

## Disclaimer

This is just my hobby project, don't blame me if you lose money. DYOR and all that.

Also, if you make a million dollars using this, feel free to share 😉
