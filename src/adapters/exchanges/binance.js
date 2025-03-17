const axios = require("axios");
const path = require("path");
const config = require("../../config");

// Binance adapter
const binanceAdapter = {
  async fetchListings() {
    try {
      const response = await axios.get(config.exchanges.binance.apiUrl);
      if (!response.data || !response.data.symbols) {
        console.warn(
          "Binance API response doesn't contain expected data structure"
        );
        return { symbols: [] };
      }
      return {
        symbols: response.data.symbols.map((item) => ({
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
  getDataFilePath() {
    return path.join(config.dataPath, config.exchanges.binance.dataFile);
  },
};

module.exports = binanceAdapter;
