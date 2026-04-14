const STORAGE_KEY = "affiliate-platform-wishlist";

function readWishlistIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function writeWishlistIds(ids) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("wishlist:changed", { detail: ids }));
}

function isWishlisted(productId) {
  return readWishlistIds().includes(String(productId));
}

function toggleWishlist(productId) {
  const normalized = String(productId);
  const current = readWishlistIds();
  const next = current.includes(normalized)
    ? current.filter((item) => item !== normalized)
    : [...current, normalized];

  writeWishlistIds(next);
  return next;
}

export { isWishlisted, readWishlistIds, toggleWishlist };
