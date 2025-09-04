// src/constants/admin.js
const FALLBACK_ADMIN = "adminapp@waskitainfrastruktur.co.id";
const CACHE_KEY = "wki_admin_emails_v2";

function toAdminArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(v => String(v).toLowerCase().trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map(v => v.toLowerCase().trim())
    .filter(Boolean);
}

export async function getAdminSetCached() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const arr = toAdminArray(JSON.parse(cached));
      if (!arr.includes(FALLBACK_ADMIN)) arr.push(FALLBACK_ADMIN);
      return new Set(arr);
    }
  } catch {}

  let arr = [];
  try {
    const r = await fetch("/api/config");
    const j = await r.json();
    arr = toAdminArray(j?.adminEmails);
  } catch {}

  if (!arr.includes(FALLBACK_ADMIN)) arr.push(FALLBACK_ADMIN);
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(arr)); } catch {}

  return new Set(arr);
}

export function resolveMsalEmail(acc) {
  if (!acc) return "";
  const c = acc.idTokenClaims || {};
  return String(c.preferred_username || c.email || acc.username || "")
    .toLowerCase()
    .trim();
}

export const FALLBACK_ADMIN_EMAIL = FALLBACK_ADMIN;
