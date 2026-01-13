// src/api/directus.js
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rapidalert_token";

// ✅ Use env if available, otherwise fallback to Railway URL
export const DIRECTUS_URL =
  process.env.EXPO_PUBLIC_DIRECTUS_URL ||
  "https://rapidalertservice-production.up.railway.app";

/**
 * Generic JSON request helper
 */
async function request(
  path,
  { method = "GET", body, auth = true, timeoutMs = 12000 } = {}
) {
  if (!DIRECTUS_URL) {
    throw new Error("DIRECTUS_URL is missing. Check EXPO_PUBLIC_DIRECTUS_URL in .env");
  }

  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${DIRECTUS_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = json?.errors?.[0]?.message || json?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return json;
  } catch (e) {
    console.log("Directus request failed:", `${DIRECTUS_URL}${path}`, e?.message);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/* =========================
   Auth (Phase 3)
   ========================= */

export async function login(email, password) {
  const r = await request("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });

  const token = r?.data?.access_token;
  if (!token) throw new Error("No token returned from Directus");

  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return token;
}

export async function getMe() {
  const r = await request(
    "/users/me?fields=id,email,first_name,last_name,role.id,role.name,verified_badge,trust_score"
  );
  return r?.data;
}

export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/* =========================
   Phase 4 — Incidents + Files
   ========================= */

// Upload image/file to Directus Files
export async function uploadFile({ uri, name = "incident.jpg", type = "image/jpeg" }) {
  if (!DIRECTUS_URL) {
    throw new Error("DIRECTUS_URL is missing. Check EXPO_PUBLIC_DIRECTUS_URL in .env");
  }

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error("Not logged in");

  const form = new FormData();
  form.append("file", { uri, name, type });

  const res = await fetch(`${DIRECTUS_URL}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // IMPORTANT: don't set Content-Type manually for FormData in RN
    },
    body: form,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json?.data; // { id, ... }
}

// Create an incident
export async function createIncident(payload) {
  const r = await request("/items/incidents", {
    method: "POST",
    body: payload,
    auth: true,
  });
  return r?.data;
}

/**
 * ✅ List latest incidents (Map feed / markers)
 * IMPORTANT:
 * - Include BOTH "media" (your old field) and "media_file" (your new File field)
 * - Include "media_file.id" so the app can build: `${DIRECTUS_URL}/assets/<id>`
 */
export async function listIncidents() {
  const fields = [
    "id",
    "category",
    "description",
    "status",
    "score",
    "date_created",
    "latitude",
    "longitude",
    "reported_by",
    "media",
    "media_file",
    "media_file.id",
    "media_file.filename_download",
  ].join(",");

  const r = await request(
    `/items/incidents?sort=-date_created&limit=200&fields=${encodeURIComponent(fields)}`
  );

  return r?.data || [];
}

/**
 * ✅ Get one incident by id (for IncidentDetails)
 * Same fields as listIncidents, but for a single record
 */
export async function getIncidentById(id) {
  if (!id && id !== 0) throw new Error("Missing incident id");

  const fields = [
    "id",
    "category",
    "description",
    "status",
    "score",
    "date_created",
    "latitude",
    "longitude",
    "reported_by",
    "media",
    "media_file",
    "media_file.id",
    "media_file.filename_download",
  ].join(",");

  const r = await request(
    `/items/incidents/${encodeURIComponent(String(id))}?fields=${encodeURIComponent(fields)}`
  );

  return r?.data || null;
}

/**
 * Helper: build a URL to display a Directus file in <Image/>
 * Works when files are public.
 * If your server uses FILES_PRIVATE=true, then you'll need a tokenized URL.
 */
export async function buildAssetUrl(fileId) {
  if (!fileId) return null;
  return `${DIRECTUS_URL.replace(/\/$/, "")}/assets/${fileId}`;
}
