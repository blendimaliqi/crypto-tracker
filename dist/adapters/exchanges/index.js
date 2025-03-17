"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const path = __importStar(require("path"));
const config_1 = __importDefault(require("../../config"));
// Import the binance adapter
const binance_1 = __importDefault(require("./binance"));
// Create other exchange adapters
const coinbaseAdapter = {
    async fetchListings() {
        try {
            const response = await axios_1.default.get(config_1.default.exchanges.coinbase.apiUrl);
            if (!response.data || !Array.isArray(response.data)) {
                console.warn("Coinbase API response doesn't contain expected data structure");
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
        }
        catch (error) {
            console.error("Error fetching data from Coinbase:", error);
            return { symbols: [] };
        }
    },
    getDataFilePath() {
        return path.join(config_1.default.dataPath, config_1.default.exchanges.coinbase.dataFile);
    },
};
const krakenAdapter = {
    async fetchListings() {
        try {
            const response = await axios_1.default.get(config_1.default.exchanges.kraken.apiUrl);
            if (!response.data || !response.data.result) {
                console.warn("Kraken API response doesn't contain expected data structure");
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
        }
        catch (error) {
            console.error("Error fetching data from Kraken:", error);
            return { symbols: [] };
        }
    },
    getDataFilePath() {
        return path.join(config_1.default.dataPath, config_1.default.exchanges.kraken.dataFile);
    },
};
const okxAdapter = {
    async fetchListings() {
        try {
            const response = await axios_1.default.get(config_1.default.exchanges.okx.apiUrl);
            if (!response.data || !response.data.data) {
                console.warn("OKX API response doesn't contain expected data structure");
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
        }
        catch (error) {
            console.error("Error fetching data from OKX:", error);
            return { symbols: [] };
        }
    },
    getDataFilePath() {
        return path.join(config_1.default.dataPath, config_1.default.exchanges.okx.dataFile);
    },
};
const bybitAdapter = {
    async fetchListings() {
        try {
            const response = await axios_1.default.get(config_1.default.exchanges.bybit.apiUrl);
            if (!response.data ||
                !response.data.result ||
                !response.data.result.list) {
                console.warn("Bybit API response doesn't contain expected data structure");
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
        }
        catch (error) {
            console.error("Error fetching data from Bybit:", error);
            return { symbols: [] };
        }
    },
    getDataFilePath() {
        return path.join(config_1.default.dataPath, config_1.default.exchanges.bybit.dataFile);
    },
};
const kucoinAdapter = {
    async fetchListings() {
        try {
            const response = await axios_1.default.get(config_1.default.exchanges.kucoin.apiUrl);
            if (!response.data || !response.data.data) {
                console.warn("KuCoin API response doesn't contain expected data structure");
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
        }
        catch (error) {
            console.error("Error fetching data from KuCoin:", error);
            return { symbols: [] };
        }
    },
    getDataFilePath() {
        return path.join(config_1.default.dataPath, config_1.default.exchanges.kucoin.dataFile);
    },
};
const gateioAdapter = {
    async fetchListings() {
        try {
            const response = await axios_1.default.get(config_1.default.exchanges.gateio.apiUrl);
            if (!response.data || !Array.isArray(response.data)) {
                console.warn("Gate.io API response doesn't contain expected data structure");
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
        }
        catch (error) {
            console.error("Error fetching data from Gate.io:", error);
            return { symbols: [] };
        }
    },
    getDataFilePath() {
        return path.join(config_1.default.dataPath, config_1.default.exchanges.gateio.dataFile);
    },
};
const mexcAdapter = {
    async fetchListings() {
        try {
            const response = await axios_1.default.get(config_1.default.exchanges.mexc.apiUrl);
            if (!response.data || !response.data.symbols) {
                console.warn("MEXC API response doesn't contain expected data structure");
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
        }
        catch (error) {
            console.error("Error fetching data from MEXC:", error);
            return { symbols: [] };
        }
    },
    getDataFilePath() {
        return path.join(config_1.default.dataPath, config_1.default.exchanges.mexc.dataFile);
    },
};
// Combine all exchange adapters into one object
const exchangeAdapters = {
    binance: binance_1.default,
    coinbase: coinbaseAdapter,
    kraken: krakenAdapter,
    okx: okxAdapter,
    bybit: bybitAdapter,
    kucoin: kucoinAdapter,
    gateio: gateioAdapter,
    mexc: mexcAdapter,
};
exports.default = exchangeAdapters;
