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
const binanceAdapter = {
    async fetchListings() {
        try {
            const response = await axios_1.default.get(config_1.default.exchanges.binance.apiUrl);
            if (!response.data || !response.data.symbols) {
                console.warn("Binance API response doesn't contain expected data structure");
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
        }
        catch (error) {
            console.error("Error fetching data from Binance:", error);
            return { symbols: [] };
        }
    },
    getDataFilePath() {
        return path.join(config_1.default.dataPath, config_1.default.exchanges.binance.dataFile);
    },
};
exports.default = binanceAdapter;
