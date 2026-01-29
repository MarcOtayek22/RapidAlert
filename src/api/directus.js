// src/api/directus.js
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rapidalert_token";

export const DIRECTUS_URL =
  process.env.EXPO_PUBLIC_DIRECTUS_URL ||
  "https://rapidalertservice-production.up.railway.app";

/* =========================================================
   Core request helper
========================================================= */
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

/* =========================================================
   Auth
========================================================= */
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

/* =========================================================
   Files
========================================================= */
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
  return json?.data; // { id, ... }
}

/* =========================================================
   Incidents (CRUD)
========================================================= */
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
  // NOTE: include reported_by so we can update reporter trust later
  const fields =
    "id,category,description,status,score,date_created,latitude,longitude,reported_by," +
    "media_file.id,media_file.filename_download," +
    // optional anti-double-apply flags (create these fields in Directus if you want trust logic)
    "trust_applied,trust_applied_at,voter_trust_applied,voter_trust_applied_at";

  const r = await request(
    `/items/incidents/${id}?fields=${encodeURIComponent(fields)}`
  );
  return r?.data;
}

// PATCH incident (used by recompute + admin moderation in code)
export async function patchIncident(incidentId, data) {
  if (!incidentId) throw new Error("Missing incidentId");

  const r = await request(
    `/items/incidents/${incidentId}?fields=id,score,status,media_file,reported_by,trust_applied,voter_trust_applied`,
    {
      method: "PATCH",
      body: data,
      auth: true,
    }
  );
  return r?.data;
}

/* =========================================================
   Votes (Part 1+2)
========================================================= */
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

/* =========================================================
   Votes (Part 3) — list votes with user info (weights)
========================================================= */
export async function listIncidentVotes(incidentId) {
  if (!incidentId) return [];

  // Keep both patterns, but we prioritize "user"
  const fields = [
    "id",
    "vote",
    "user.id",
    "user.verified_badge",
    "user.trust_score",
    "user.role.id",
    "user.role.name",
    // fallback fields if your schema ever returns user_id
    "user_id.id",
    "user_id.verified_badge",
    "user_id.trust_score",
    "user_id.role.id",
    "user_id.role.name",
  ].join(",");

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

/* =========================================================
   Score/Status (Part 4) — compute + recompute
========================================================= */

// Normalize role names safely
function normalizeRoleName(name) {
  const raw = String(name || "").trim().toLowerCase();
  // keep this tiny safeguard in case DB had typo earlier
  if (raw === "vounteer") return "volunteer";
  return raw;
}

/**
 * Compute score:
 * - normal vote: +1 / -1
 * - verified user OR verified volunteer: weight 2
 * - media_file present: +2
 */
export function computeIncidentScore({ votes = [], hasMedia = false }) {
  let score = 0;

  for (const v of votes) {
    const delta = v?.vote === "up" ? 1 : v?.vote === "down" ? -1 : 0;

    // Support both relation names
    const user = v?.user || v?.user_id;

    const role = normalizeRoleName(user?.role?.name);
    const verified =
      user?.verified_badge === true || user?.verified_badge === 1;

    // ✅ verified user OR verified volunteer => weight 2
    const isVerifiedVoter =
      verified && (role === "user" || role === "volunteer");

    const weight = isVerifiedVoter ? 2 : 1;

    score += weight * delta;
  }

  if (hasMedia) score += 2;

  return score;
}

/**
 * Score -> Status thresholds (your current choice):
 *  score >= 4  => verified
 *  score <= -3 => false
 *  else        => unverified
 */
export function scoreToStatus(score) {
  if (score >= 4) return "verified";
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

  // IMPORTANT: we need media_file to apply media bonus
  const fullIncident =
    incident?.media_file === undefined ? await getIncident(incidentId) : incident;

  const votes = await listIncidentVotes(incidentId);

  const mediaId =
    typeof fullIncident?.media_file === "string"
      ? fullIncident.media_file
      : fullIncident?.media_file?.id;

  const hasMedia = !!mediaId;

  const score = computeIncidentScore({ votes, hasMedia });
  const status = scoreToStatus(score);

  const updated = await patchIncident(incidentId, { score, status });

  return {
    score: updated?.score ?? score,
    status: updated?.status ?? status,
    votesCount: votes.length,
  };
}

/* =========================================================
   Upsert vote + recompute (your existing behavior, fixed)
========================================================= */
export async function upsertVote({ incidentId, userId, vote }) {
  if (!incidentId || !userId) throw new Error("Missing incidentId or userId");
  if (!["up", "down"].includes(vote))
    throw new Error("Vote must be 'up' or 'down'");

  const existing = await getMyVote(incidentId, userId);

  let savedVote;

  if (existing?.id) {
    const r = await request(`/items/incident_votes/${existing.id}?fields=id,vote`, {
      method: "PATCH",
      body: { vote },
      auth: true,
    });
    savedVote = r?.data;
  } else {
    const r = await request(`/items/incident_votes?fields=id,vote`, {
      method: "POST",
      body: { incident: incidentId, user: userId, vote },
      auth: true,
    });
    savedVote = r?.data;
  }

  // ✅ recompute using FULL incident (so media bonus applies)
  const inc = await getIncident(incidentId);
  await recomputeIncidentScoreAndStatus(inc);

  return savedVote;
}

/* =========================================================
   Create incident + apply media bonus immediately
========================================================= */
export async function createIncident(payload) {
  // Create incident and ask for fields we need
  const r = await request("/items/incidents?fields=id,media_file,score,status,reported_by", {
    method: "POST",
    body: payload,
    auth: true,
  });

  const created = r?.data;

  // Apply media bonus + status right away (score becomes 2 if media exists)
  if (created?.id) {
    try {
      await recomputeIncidentScoreAndStatus(created);
    } catch (e) {
      console.log("Recompute after create failed:", e?.message);
    }
  }

  return created;
}

/* =========================================================
   TRUST SCORE + VERIFIED BADGE (code-only)
   - Runs ONLY when you call it (e.g., from an admin screen)
   - Needs incidents fields to prevent double apply:
       incidents.trust_applied (boolean)
       incidents.voter_trust_applied (boolean)
     If you don't create them, this will throw when patching.
========================================================= */

// Patch Directus user (system collection)
async function patchUser(userId, data) {
  if (!userId) throw new Error("Missing userId");
  const r = await request(`/users/${userId}?fields=id,trust_score,verified_badge,role.id,role.name`, {
    method: "PATCH",
    body: data,
    auth: true,
  });
  return r?.data;
}

function badgeFromTrust(trustScore, threshold = 6) {
  return Number(trustScore || 0) >= threshold;
}

/**
 * Apply trust updates ONCE for an incident that is FINAL:
 * - if status === "verified": reporter +4, upvoters +1
 * - if status === "false":    reporter -4, downvoters +1
 * - NO punish for voters (as you decided)
 * - verified_badge auto = trust_score >= 6
 *
 * Requires (recommended):
 * - incidents.trust_applied boolean default false
 * - incidents.voter_trust_applied boolean default false
 */
export async function applyTrustForFinalIncident(incidentId, { badgeThreshold = 6 } = {}) {
  const incident = await getIncident(incidentId);
  if (!incident?.id) throw new Error("Incident not found");

  const finalStatus = String(incident.status || "").toLowerCase();
  if (finalStatus !== "verified" && finalStatus !== "false") {
    throw new Error("Trust can only be applied when incident status is 'verified' or 'false'");
  }

  // prevent re-applying (you must create these fields in Directus to use this safely)
  if (incident.trust_applied && incident.voter_trust_applied) {
    return { ok: true, skipped: true, reason: "Already applied" };
  }

  const reporterId = incident.reported_by;
  if (!reporterId) throw new Error("Incident has no reported_by (reporter) to update trust");

  const votes = await listIncidentVotes(incidentId);

  // Determine correct voters to reward
  const wantVote = finalStatus === "verified" ? "up" : "down";

  const correctVoterIds = new Set();
  for (const v of votes) {
    if (v?.vote !== wantVote) continue;
    const u = v?.user || v?.user_id;
    if (u?.id) correctVoterIds.add(u.id);
  }

  // Update reporter trust
  // verified => +4, false => -4
  const reporterDelta = finalStatus === "verified" ? 4 : -4;

  // Read reporter current values (via patch read fields)
  // (Directus PATCH doesn't return old values, so we do a small read)
  const reporterMe = await request(
    `/users/${reporterId}?fields=id,trust_score,verified_badge`,
    { auth: true }
  );
  const reporterOld = reporterMe?.data?.trust_score ?? 0;
  const reporterNew = Number(reporterOld || 0) + reporterDelta;

  await patchUser(reporterId, {
    trust_score: reporterNew,
    verified_badge: badgeFromTrust(reporterNew, badgeThreshold),
  });

  // Update voters trust (+1) (reward only)
  for (const voterId of correctVoterIds) {
    // skip reporter if same person; still okay either way
    const voterMe = await request(
      `/users/${voterId}?fields=id,trust_score,verified_badge`,
      { auth: true }
    );
    const oldScore = voterMe?.data?.trust_score ?? 0;
    const newScore = Number(oldScore || 0) + 1;

    await patchUser(voterId, {
      trust_score: newScore,
      verified_badge: badgeFromTrust(newScore, badgeThreshold),
    });
  }

  // Mark applied flags (requires these fields exist)
  const now = new Date().toISOString();
  await patchIncident(incidentId, {
    trust_applied: true,
    trust_applied_at: now,
    voter_trust_applied: true,
    voter_trust_applied_at: now,
  });

  return {
    ok: true,
    status: finalStatus,
    reporter: { id: reporterId, delta: reporterDelta },
    rewardedVoters: Array.from(correctVoterIds),
  };
}

/**
 * Admin helper:
 * - set incident status manually (verified/false/unverified/resolved/etc)
 * - optionally apply trust immediately when status becomes verified/false
 * - lock: by default won't allow changing away from verified/false
 */
export async function adminSetIncidentStatus(
  incidentId,
  newStatus,
  { applyTrust = true, forceChangeFinal = false } = {}
) {
  const incident = await getIncident(incidentId);
  if (!incident?.id) throw new Error("Incident not found");

  const current = String(incident.status || "").toLowerCase();
  const next = String(newStatus || "").toLowerCase();

  const isFinal = current === "verified" || current === "false";
  if (isFinal && !forceChangeFinal && next !== current) {
    throw new Error("Incident is final (verified/false). Refusing to change status.");
  }

  const updated = await patchIncident(incidentId, { status: next });

  // if moved into final, apply trust
  const becameFinal = (next === "verified" || next === "false") && !isFinal;

  if (applyTrust && becameFinal) {
    await applyTrustForFinalIncident(incidentId);
  }

  return updated;
}
