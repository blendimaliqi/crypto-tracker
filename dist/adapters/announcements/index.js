"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const binance_1 = __importDefault(require("./binance"));
const okx_1 = __importDefault(require("./okx"));
// Collect all announcement adapters
const announcementAdapters = {
    binance: binance_1.default,
    okx: okx_1.default,
};
exports.default = announcementAdapters;
