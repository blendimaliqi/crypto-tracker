import axios from "axios";
import * as path from "path";
import config from "../../config";
import { ListingData, Symbol } from "../../utils";

// Binance adapter
interface BinanceAdapter {
  fetchListings: () => Promise<ListingData>;
  getDataFilePath: () => string;
}

interface BinanceResponseSymbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  [key: string]: any;
}

interface BinanceResponse {
  symbols: BinanceResponseSymbol[];
  [key: string]: any;
}

const binanceAdapter: BinanceAdapter = {
  async fetchListings(): Promise<ListingData> {
    try {
      const response = await axios.get<BinanceResponse>(
        config.exchanges.binance.apiUrl
      );
      if (!response.data || !response.data.symbols) {
        console.warn(
          "Binance API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.symbols.map((item: BinanceResponseSymbol) => ({
          symbol: item.symbol,
          baseAsset: item.baseAsset,
          quoteAsset: item.quoteAsset,
          exchange: "binance",
        })),
      };
    } catch (error) {
      console.error("Error fetching data from Binance:", error);
      return { symbols: [] };
    }
  },
  getDataFilePath(): string {
    return path.join(config.dataPath, config.exchanges.binance.dataFile);
  },
};

export default binanceAdapter;
