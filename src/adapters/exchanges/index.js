const axios = require("axios");
const path = require("path");
const config = require("../../config");

// Import the binance adapter
const binanceAdapter = require("./binance");

// Create other exchange adapters
const coinbaseAdapter = {
  async fetchListings() {
    try {
      const response = await axios.get(config.exchanges.coinbase.apiUrl);
      if (!response.data || !Array.isArray(response.data)) {
        console.warn(
          "Coinbase API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.map((item) => ({
          symbol: item.id || "",
          baseAsset: item.base_currency || "",
          quoteAsset: item.quote_currency || "",
          exchange: "coinbase",
        })),
      };
    } catch (error) {
      console.error("Error fetching data from Coinbase:", error);
      return { symbols: [] };
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, config.exchanges.coinbase.dataFile);
  },
};

const krakenAdapter = {
  async fetchListings() {
    try {
      const response = await axios.get(config.exchanges.kraken.apiUrl);
      if (!response.data || !response.data.result) {
        console.warn(
          "Kraken API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: Object.entries(response.data.result).map(([key, value]) => ({
          symbol: key,
          baseAsset: value.base || "",
          quoteAsset: value.quote || "",
          exchange: "kraken",
        })),
      };
    } catch (error) {
      console.error("Error fetching data from Kraken:", error);
      return { symbols: [] };
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, config.exchanges.kraken.dataFile);
  },
};

const okxAdapter = {
  async fetchListings() {
    try {
      const response = await axios.get(config.exchanges.okx.apiUrl);
      if (!response.data || !response.data.data) {
        console.warn(
          "OKX API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.data.map((item) => ({
          symbol: item.instId || "",
          baseAsset: item.baseCcy || "",
          quoteAsset: item.quoteCcy || "",
          exchange: "okx",
        })),
      };
    } catch (error) {
      console.error("Error fetching data from OKX:", error);
      return { symbols: [] };
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, config.exchanges.okx.dataFile);
  },
};

const bybitAdapter = {
  async fetchListings() {
    try {
      const response = await axios.get(config.exchanges.bybit.apiUrl);
      if (
        !response.data ||
        !response.data.result ||
        !response.data.result.list
      ) {
        console.warn(
          "Bybit API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.result.list.map((item) => ({
          symbol: item.symbol || "",
          baseAsset: item.baseCoin || "",
          quoteAsset: item.quoteCoin || "",
          exchange: "bybit",
        })),
      };
    } catch (error) {
      console.error("Error fetching data from Bybit:", error);
      return { symbols: [] };
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, config.exchanges.bybit.dataFile);
  },
};

const kucoinAdapter = {
  async fetchListings() {
    try {
      const response = await axios.get(config.exchanges.kucoin.apiUrl);
      if (!response.data || !response.data.data) {
        console.warn(
          "KuCoin API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.data.map((item) => ({
          symbol: item.symbol || "",
          baseAsset: item.baseCurrency || "",
          quoteAsset: item.quoteCurrency || "",
          exchange: "kucoin",
        })),
      };
    } catch (error) {
      console.error("Error fetching data from KuCoin:", error);
      return { symbols: [] };
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, config.exchanges.kucoin.dataFile);
  },
};

const gateioAdapter = {
  async fetchListings() {
    try {
      const response = await axios.get(config.exchanges.gateio.apiUrl);
      if (!response.data || !Array.isArray(response.data)) {
        console.warn(
          "Gate.io API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.map((item) => ({
          symbol: item.id || "",
          baseAsset: item.base || "",
          quoteAsset: item.quote || "",
          exchange: "gateio",
        })),
      };
    } catch (error) {
      console.error("Error fetching data from Gate.io:", error);
      return { symbols: [] };
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, config.exchanges.gateio.dataFile);
  },
};

const mexcAdapter = {
  async fetchListings() {
    try {
      const response = await axios.get(config.exchanges.mexc.apiUrl);
      if (!response.data || !response.data.symbols) {
        console.warn(
          "MEXC API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.symbols.map((item) => ({
          symbol: item.symbol || "",
          baseAsset: item.baseAsset || "",
          quoteAsset: item.quoteAsset || "",
          exchange: "mexc",
        })),
      };
    } catch (error) {
      console.error("Error fetching data from MEXC:", error);
      return { symbols: [] };
    }
  },
  getDataFilePath() {
    return path.join(config.dataPath, config.exchanges.mexc.dataFile);
  },
};

// Combine all exchange adapters into one object
const exchangeAdapters = {
  binance: binanceAdapter,
  coinbase: coinbaseAdapter,
  kraken: krakenAdapter,
  okx: okxAdapter,
  bybit: bybitAdapter,
  kucoin: kucoinAdapter,
  gateio: gateioAdapter,
  mexc: mexcAdapter,
};

module.exports = exchangeAdapters;
