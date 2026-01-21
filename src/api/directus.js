// src/api/directus.js
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rapidalert_token";

export const DIRECTUS_URL =
  process.env.EXPO_PUBLIC_DIRECTUS_URL ||
  "https://rapidalertservice-production.up.railway.app";

async function request(
  path,
  { method = "GET", body, auth = true, timeoutMs = 12000 } = {}
) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) throw new Error("Not logged in");
    headers.Authorization = `Bearer ${token}`;
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
      const msg =
        json?.errors?.[0]?.message || json?.error || `HTTP ${res.status}`;
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

/* =========================
   Auth
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
   Files
========================= */

export async function uploadFile({
  uri,
  name = "incident.jpg",
  type = "image/jpeg",
}) {
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
    const msg =
      json?.errors?.[0]?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json?.data;
}

/* =========================
   Incidents
========================= */

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
    `/items/incidents?sort=-date_created&limit=200&fields=${encodeURIComponent(
      fields
    )}`
  );
  return r?.data || [];
}

export async function getIncident(id) {
  const fields =
    "id,category,description,status,score,date_created,latitude,longitude,reported_by," +
    "media_file.id,media_file.filename_download";

  const r = await request(
    `/items/incidents/${id}?fields=${encodeURIComponent(fields)}`
  );
  return r?.data;
}

export async function patchIncident(incidentId, data) {
  if (!incidentId) throw new Error("Missing incidentId");

  // IMPORTANT: if your Directus policy blocks update, this will throw.
  // We want that error visible to you, not silent.
  const r = await request(`/items/incidents/${incidentId}`, {
    method: "PATCH",
    body: data,
    auth: true,
  });
  return r?.data;
}

/* =========================
   Phase 6: Votes (Part 1+2)
========================= */

export async function getMyVote(incidentId, userId) {
  if (!incidentId || !userId) return null;

  const params = new URLSearchParams({
    "filter[incident][_eq]": String(incidentId),
    "filter[user][_eq]": String(userId),
    limit: "1",
    fields: "id,vote",
  });

  const r = await request(`/items/incident_votes?${params.toString()}`, {
    auth: true,
  });

  return r?.data?.[0] || null;
}

export async function upsertVote({ incidentId, userId, vote }) {
  if (!incidentId || !userId) throw new Error("Missing incidentId or userId");
  if (!["up", "down"].includes(vote))
    throw new Error("Vote must be 'up' or 'down'");

  const existing = await getMyVote(incidentId, userId);

  if (existing?.id) {
    const r = await request(`/items/incident_votes/${existing.id}?fields=id,vote`, {
      method: "PATCH",
      body: { vote },
      auth: true,
    });
    return r?.data;
  }

  const r = await request(`/items/incident_votes?fields=id,vote`, {
    method: "POST",
    body: { incident: incidentId, user: userId, vote },
    auth: true,
  });

  return r?.data;
}

/* =========================================================
   ✅ Phase 6 Part 3 + Part 4 (WORKING)
   - read all votes for incident
   - compute score (with verified volunteer weight + media bonus)
   - patch incidents.score and incidents.status
========================================================= */

/**
 * Fetch all votes for one incident.
 * We request BOTH patterns:
 *  - user.verified_badge + user.role.name  (common)
 *  - user_id....                         (fallback)
 */
export async function listIncidentVotes(incidentId) {
  if (!incidentId) return [];

  const fields =
    "id,vote," +
    "user.id,user.verified_badge,user.role.id,user.role.name," +
    "user_id.id,user_id.verified_badge,user_id.role.id,user_id.role.name";

  // Your schema uses "incident" in upsertVote, so this is the main filter:
  const params = new URLSearchParams({
    "filter[incident][_eq]": String(incidentId),
    limit: "500",
    fields,
  });

  const r = await request(`/items/incident_votes?${params.toString()}`, {
    auth: true,
  });

  return r?.data || [];
}

/**
 * Compute score:
 * - normal vote: +1 / -1
 * - verified volunteer: +2 / -2
 * - media_file present: +2
 */
export function computeIncidentScore({ votes = [], hasMedia = false }) {
  let score = 0;

  for (const v of votes) {
    const delta = v?.vote === "up" ? 1 : v?.vote === "down" ? -1 : 0;

    // Support both relation names
    const user = v?.user || v?.user_id;

    const roleName = (user?.role?.name || "").toLowerCase();
    const verified =
      user?.verified_badge === true || user?.verified_badge === 1;

    const isVerifiedVolunteer = roleName === "volunteer" && verified;
    const weight = isVerifiedVolunteer ? 2 : 1;

    score += weight * delta;
  }

  if (hasMedia) score += 2;

  return score;
}

/**
 * Score -> Status thresholds:
 *  score >= 3  => verified
 *  score <= -3 => false
 *  else        => unverified
 */
export function scoreToStatus(score) {
  if (score >= 3) return "verified";
  if (score <= -3) return "false";
  return "unverified";
}

/**
 * Recompute and PATCH incidents.score/status.
 * Returns {score, status, votesCount}.
 */
export async function recomputeIncidentScoreAndStatus(incident) {
  if (!incident?.id) throw new Error("Missing incident");

  const incidentId = incident.id;

  const votes = await listIncidentVotes(incidentId);

  const mediaId =
    typeof incident?.media_file === "string"
      ? incident.media_file
      : incident?.media_file?.id;

  const hasMedia = !!mediaId;

  const score = computeIncidentScore({ votes, hasMedia });
  const status = scoreToStatus(score);

  // Patch to DB (this is what changes score in map/list/details)
  const updated = await patchIncident(incidentId, { score, status });

  return {
    score: updated?.score ?? score,
    status: updated?.status ?? status,
    votesCount: votes.length,
  };
}
