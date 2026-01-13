import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rapidalert_token";

export const DIRECTUS_URL =
  process.env.EXPO_PUBLIC_DIRECTUS_URL ||
  "https://rapidalertservice-production.up.railway.app";

async function request(path, { method = "GET", body, auth = true, timeoutMs = 12000 } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

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
  } finally {
    clearTimeout(t);
  }
}

export function fileAssetUrl(fileId) {
  if (!fileId) return null;
  return `${DIRECTUS_URL}/assets/${fileId}`;
}

/**
 * Many-to-many "media" extraction:
 * incident.media is usually like:
 *   [{ directus_files_id: { id: "..." } }]
 * or sometimes:
 *   [{ directus_files_id: "..." }]
 */

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

export async function uploadFile({ uri, name = "incident.jpg", type = "image/jpeg" }) {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw new Error("Not logged in");

  const form = new FormData();
  form.append("file", { uri, name, type });

  const res = await fetch(`${DIRECTUS_URL}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json?.data; // { id, ... }
}

export async function createIncident(payload) {
  const r = await request("/items/incidents", {
    method: "POST",
    body: payload,
    auth: true,
  });
  return r?.data;
}

export async function listIncidents() {
  const fields =
    "id,category,description,status,score,date_created,latitude,longitude," +
    "media_file.id,media_file.filename_download";

  const r = await request(
    `/items/incidents?sort=-date_created&limit=200&fields=${encodeURIComponent(fields)}`
  );
  return r?.data || [];
}


export async function getIncident(id) {
  const fields =
    "id,category,description,status,score,date_created,latitude,longitude,reported_by," +
    "media_file.id,media_file.filename_download";

  const r = await request(`/items/incidents/${id}?fields=${encodeURIComponent(fields)}`);
  return r?.data;
}
