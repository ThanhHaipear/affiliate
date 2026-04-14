const ATTRIBUTION_STORAGE_KEY = "affiliate-platform-attribution";
const DEVICE_ID_STORAGE_KEY = "affiliate-platform-device-id";

function readAttributions() {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAttributions(value) {
  localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
}

function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = `device_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, next);
  return next;
}

function saveProductAttribution(productId, attribution) {
  const current = readAttributions();
  current[String(productId)] = {
    ...attribution,
    savedAt: new Date().toISOString(),
  };
  writeAttributions(current);
}

function getProductAttribution(productId) {
  const current = readAttributions();
  return current[String(productId)] || null;
}

function removeProductAttribution(productId) {
  const current = readAttributions();
  delete current[String(productId)];
  writeAttributions(current);
}

export { getDeviceId, getProductAttribution, removeProductAttribution, saveProductAttribution };
