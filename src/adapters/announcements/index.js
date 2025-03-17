const binanceAdapter = require("./binance");
const okxAdapter = require("./okx");

// Combine all announcement adapters into one object
const announcementAdapters = {
  binance: binanceAdapter,
  okx: okxAdapter,
};

module.exports = announcementAdapters;
