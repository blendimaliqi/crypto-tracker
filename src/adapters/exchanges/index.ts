import axios from "axios";
import * as path from "path";
import config from "../../config";
import { ListingData } from "../../utils";

// Import the binance adapter
import binanceAdapter from "./binance";

// Generic adapter interface
interface ExchangeAdapter {
  fetchListings: () => Promise<ListingData>;
  getDataFilePath: () => string;
}

// Create other exchange adapters
const coinbaseAdapter: ExchangeAdapter = {
  async fetchListings(): Promise<ListingData> {
    try {
      const response = await axios.get(config.exchanges.coinbase.apiUrl);
      if (!response.data || !Array.isArray(response.data)) {
        console.warn(
          "Coinbase API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.map((item: any) => ({
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
  getDataFilePath(): string {
    return path.join(config.dataPath, config.exchanges.coinbase.dataFile);
  },
};

const krakenAdapter: ExchangeAdapter = {
  async fetchListings(): Promise<ListingData> {
    try {
      const response = await axios.get(config.exchanges.kraken.apiUrl);
      if (!response.data || !response.data.result) {
        console.warn(
          "Kraken API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: Object.entries(response.data.result).map(
          ([key, value]: [string, any]) => ({
            symbol: key,
            baseAsset: value.base || "",
            quoteAsset: value.quote || "",
            exchange: "kraken",
          })
        ),
      };
    } catch (error) {
      console.error("Error fetching data from Kraken:", error);
      return { symbols: [] };
    }
  },
  getDataFilePath(): string {
    return path.join(config.dataPath, config.exchanges.kraken.dataFile);
  },
};

const okxAdapter: ExchangeAdapter = {
  async fetchListings(): Promise<ListingData> {
    try {
      const response = await axios.get(config.exchanges.okx.apiUrl);
      if (!response.data || !response.data.data) {
        console.warn(
          "OKX API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.data.map((item: any) => ({
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
  getDataFilePath(): string {
    return path.join(config.dataPath, config.exchanges.okx.dataFile);
  },
};

const bybitAdapter: ExchangeAdapter = {
  async fetchListings(): Promise<ListingData> {
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
        symbols: response.data.result.list.map((item: any) => ({
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
  getDataFilePath(): string {
    return path.join(config.dataPath, config.exchanges.bybit.dataFile);
  },
};

const kucoinAdapter: ExchangeAdapter = {
  async fetchListings(): Promise<ListingData> {
    try {
      const response = await axios.get(config.exchanges.kucoin.apiUrl);
      if (!response.data || !response.data.data) {
        console.warn(
          "KuCoin API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.data.map((item: any) => ({
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
  getDataFilePath(): string {
    return path.join(config.dataPath, config.exchanges.kucoin.dataFile);
  },
};

const gateioAdapter: ExchangeAdapter = {
  async fetchListings(): Promise<ListingData> {
    try {
      const response = await axios.get(config.exchanges.gateio.apiUrl);
      if (!response.data || !Array.isArray(response.data)) {
        console.warn(
          "Gate.io API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.map((item: any) => ({
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
  getDataFilePath(): string {
    return path.join(config.dataPath, config.exchanges.gateio.dataFile);
  },
};

const mexcAdapter: ExchangeAdapter = {
  async fetchListings(): Promise<ListingData> {
    try {
      const response = await axios.get(config.exchanges.mexc.apiUrl);
      if (!response.data || !response.data.symbols) {
        console.warn(
          "MEXC API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.symbols.map((item: any) => ({
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
  getDataFilePath(): string {
    return path.join(config.dataPath, config.exchanges.mexc.dataFile);
  },
};

// Combine all exchange adapters into one object
const exchangeAdapters: Record<string, ExchangeAdapter> = {
  binance: binanceAdapter,
  coinbase: coinbaseAdapter,
  kraken: krakenAdapter,
  okx: okxAdapter,
  bybit: bybitAdapter,
  kucoin: kucoinAdapter,
  gateio: gateioAdapter,
  mexc: mexcAdapter,
};

export default exchangeAdapters;
