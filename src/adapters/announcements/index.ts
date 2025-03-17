import { Announcement } from "../../utils";
import binanceAdapter from "./binance";
import okxAdapter from "./okx";

export interface AnnouncementAdapter {
  fetchAnnouncements: () => Promise<Announcement[]>;
}

// Collect all announcement adapters
const announcementAdapters: Record<string, AnnouncementAdapter> = {
  binance: binanceAdapter,
  okx: okxAdapter,
};

export default announcementAdapters;
