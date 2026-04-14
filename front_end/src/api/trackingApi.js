import { axiosClient } from "./axiosClient";
import { unwrapResponseData } from "./response";

async function trackAffiliateClick(payload) {
  const response = await axiosClient.post("/api/tracking/clicks", payload);
  return unwrapResponseData(response);
}

export { trackAffiliateClick };
