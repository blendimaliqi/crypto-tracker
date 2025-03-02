# Multi-Exchange Crypto Tracker

A Node.js application that monitors multiple cryptocurrency exchanges for new token listings and sends email notifications when new listings are detected.

## Features

- **Multi-Exchange Support**: Monitor new listings across Binance, Coinbase, Kraken, OKX, Bybit, Crypto.com, KuCoin, Gate.io, MEXC, Bitget and more
- **Real-time Notifications**: Receive email alerts when new cryptocurrencies are listed
- **Modular Design**: Easy to add support for additional exchanges
- **Containerized**: Runs in Docker for easy deployment

## Setup

### Environment Variables

Create a `.env.local` file with the following variables:

```
SENDGRID_API_KEY="your_sendgrid_api_key"

# Exchange settings (true to enable, false to disable)
ENABLE_BINANCE=true
ENABLE_COINBASE=true
ENABLE_KRAKEN=true
ENABLE_OKX=true
ENABLE_BYBIT=true
ENABLE_CRYPTOCOM=true
ENABLE_KUCOIN=true
ENABLE_GATEIO=true
ENABLE_MEXC=true
ENABLE_BITGET=true
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the application:
   ```
   node index.js
   ```

### Using Docker

Build and run the Docker container:

```
docker build -t crypto-tracker .
docker run -d --name crypto-tracker --restart unless-stopped crypto-tracker
```

## How It Works

- The application periodically polls the API endpoints of various cryptocurrency exchanges
- It compares the current listings with previously stored listings to detect new additions
- When new listings are found, it sends an email notification with details about the newly listed cryptocurrencies
- Data is stored locally in JSON files within the `data` directory

## Supported Exchanges

- **Binance**: https://api.binance.com/api/v3/exchangeInfo
- **Coinbase**: https://api.exchange.coinbase.com/products
- **Kraken**: https://api.kraken.com/0/public/AssetPairs
- **OKX**: https://www.okx.com/api/v5/public/instruments?instType=SPOT
- **Bybit**: https://api.bybit.com/v5/market/instruments-info?category=spot
- **Crypto.com**: https://api.crypto.com/exchange/v1/public/get-instruments
- **KuCoin**: https://api.kucoin.com/api/v1/symbols
- **Gate.io**: https://api.gateio.ws/api/v4/spot/currency_pairs
- **MEXC**: https://api.mexc.com/api/v3/exchangeInfo
- **Bitget**: https://api.bitget.com/api/spot/v1/public/symbols

## Adding New Exchanges

To add support for a new exchange:

1. Add a new entry to the `config.exchanges` object in `index.js`
2. Create a new adapter in the `exchangeAdapters` object
3. Implement the required methods:
   - `fetchListings()`: Fetch and normalize data from the exchange API
   - `getDataFilePath()`: Return the path for storing exchange data

## License

ISC
