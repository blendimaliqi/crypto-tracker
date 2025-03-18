# crypto listing monitor

a little tool i made to watch crypto exchanges for new coin listings and send me emails when something pops up. got tired of always missing the pumps 🚀

## what it does

- checks exchange APIs for new listings
- scrapes announcement pages to find upcoming listings
- emails me when it finds something (hopefully before prices go crazy)
- works with binance, coinbase, kraken, okx, bybit, kucoin, gate.io, and mexc

## how to use it

1. clone this repo
2. run `npm install`
3. make a `.env.local` file with your stuff:

```
# email settings
EMAIL_ENABLED=true
EMAIL_FROM=your-email@gmail.com
EMAIL_TO=your-email@gmail.com
SENDGRID_API_KEY=your_key_here
# or for gmail
EMAIL_USER=your-email@gmail.com
APP_PASSWORD=your_app_password

# which exchanges to watch
ENABLE_BINANCE=true
ENABLE_COINBASE=true
# etc...

# announcement scraping
ENABLE_BINANCE_ANNOUNCEMENTS=true
ENABLE_OKX_ANNOUNCEMENTS=true
```

4. build the project: `npm run build`
5. start it: `npm start`

## why i made this

got annoyed missing out on those sweet listing pumps. exchanges usually announce new coins days before listing them, and prices often spike as soon as the announcement drops. this checks both the APIs (for actual new listings) and the announcement pages (for upcoming listings).

the announcement monitoring is the good stuff - it can catch listings before they happen and before everyone else notices.

## project structure

it's kinda messy but it works. main code is in `src/`, data gets saved in `data/`.

## disclaimer

this is just my hobby project, don't blame me if you lose money. DYOR and all that.

also, if you make a million dollars using this, feel free to share 😉
