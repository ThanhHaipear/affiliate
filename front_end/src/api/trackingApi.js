import { axiosClient } from "./axiosClient";
import { unwrapResponseData } from "./response";

async function getAffiliateLinkStatus(shortCode) {
  const response = await axiosClient.get(`/api/tracking/links/status/${encodeURIComponent(shortCode)}`);
  return unwrapResponseData(response);
}

async function trackAffiliateClick(payload) {
  const response = await axiosClient.post("/api/tracking/clicks", payload);
  return unwrapResponseData(response);
}

export { getAffiliateLinkStatus, trackAffiliateClick };
