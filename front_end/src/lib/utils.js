function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function slugify(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function createId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function groupBy(items = [], getKey) {
  return items.reduce((accumulator, item) => {
    const key = getKey(item);
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

function sumBy(items = [], getValue) {
  return items.reduce((total, item) => total + Number(getValue(item) || 0), 0);
}

export { clamp, cn, createId, getInitials, groupBy, slugify, sumBy };
