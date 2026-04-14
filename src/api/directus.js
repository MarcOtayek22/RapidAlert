// src/api/directus.js
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rapidalert_token";

export const DIRECTUS_URL =
  process.env.EXPO_PUBLIC_DIRECTUS_URL ||
  "https://rapidalertservice-production.up.railway.app";

/* =========================================================
   FINAL FYP CONSTANTS
========================================================= */
const VERIFIED_SCORE_THRESHOLD = 4;
const FALSE_SCORE_THRESHOLD = -3;

const REPORTER_REWARD_VERIFIED = 2;
const REPORTER_PENALTY_FALSE = -2;
const VERIFIED_BADGE_THRESHOLD = 4;

/* =========================================================
   Core request helper
========================================================= */
async function request(
  path,
  { method = "GET", body, auth = true, timeoutMs = 12000, headers: extraHeaders = {} } = {}
) {
  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };

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
        json?.errors?.[0]?.message || json?.error || json?.message || `HTTP ${res.status}`;
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
export async function registerUser({
  email,
  password,
  first_name = "",
  last_name = "",
}) {
  const r = await request("/users/register", {
    method: "POST",
    body: {
      email,
      password,
      first_name,
      last_name,
    },
    auth: false,
  });

  return r?.data ?? r;
}

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
  return json?.data;
}

/* =========================================================
   Volunteer Applications
========================================================= */
export async function createVolunteerApplication(payload) {
  const r = await request(
    "/items/volunteer_applications?fields=id,credentials_text,status,user,files,date_created",
    {
      method: "POST",
      body: payload,
      auth: true,
    }
  );
  return r?.data;
}

export async function listMyVolunteerApplications(userId) {
  if (!userId) return [];

  const fields = [
    "id",
    "credentials_text",
    "status",
    "date_created",
    "user.id",
    "user.email",
    "files.directus_files_id.id",
    "files.directus_files_id.filename_download",
  ].join(",");

  const params = new URLSearchParams({
    "filter[user][_eq]": String(userId),
    sort: "-date_created",
    limit: "20",
    fields,
  });

  const r = await request(`/items/volunteer_applications?${params.toString()}`, {
    auth: true,
  });

  return r?.data || [];
}

/* =========================================================
   Incidents
========================================================= */
export async function listIncidents() {
  const fields =
    "id,category,description,status,score,date_created,latitude,longitude," +
    "media_file.id,media_file.filename_download";

  const r = await request(
    `/items/incidents?sort=-date_created&limit=200&fields=${encodeURIComponent(
      fields
    )}`,
    { auth: false }
  );
  return r?.data || [];
}

export async function getIncident(id) {
  const fields =
    "id,category,description,status,score,date_created,latitude,longitude,reported_by," +
    "media_file.id,media_file.filename_download," +
    "trust_applied,trust_applied_at,voter_trust_applied,voter_trust_applied_at";

  const r = await request(
    `/items/incidents/${id}?fields=${encodeURIComponent(fields)}`,
    { auth: true }
  );
  return r?.data;
}

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
   Votes
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

export async function listIncidentVotes(incidentId) {
  if (!incidentId) return [];

  const fields = [
    "id",
    "vote",
    "user.id",
    "user.verified_badge",
    "user.trust_score",
    "user.role.id",
    "user.role.name",
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
   Score / Status
========================================================= */
function normalizeRoleName(name) {
  const raw = String(name || "").trim().toLowerCase();
  if (raw === "vounteer") return "volunteer";
  return raw;
}

export function computeIncidentScore({ votes = [], hasMedia = false }) {
  let score = 0;

  for (const v of votes) {
    const delta = v?.vote === "up" ? 1 : v?.vote === "down" ? -1 : 0;
    const user = v?.user || v?.user_id;

    const role = normalizeRoleName(user?.role?.name);
    const verified =
      user?.verified_badge === true || user?.verified_badge === 1;

    const isVerifiedVoter =
      verified && (role === "user" || role === "volunteer");

    const weight = isVerifiedVoter ? 2 : 1;
    score += weight * delta;
  }

  if (hasMedia) score += 2;

  return score;
}

export function scoreToStatus(score) {
  if (score >= VERIFIED_SCORE_THRESHOLD) return "verified";
  if (score <= FALSE_SCORE_THRESHOLD) return "false";
  return "unverified";
}

/* =========================================================
   Trust helpers
========================================================= */
async function patchUser(userId, data) {
  if (!userId) throw new Error("Missing userId");

  const r = await request(
    `/users/${userId}?fields=id,trust_score,verified_badge,role.id,role.name`,
    {
      method: "PATCH",
      body: data,
      auth: true,
    }
  );

  return r?.data;
}

async function getUserById(userId) {
  if (!userId) throw new Error("Missing userId");

  const r = await request(
    `/users/${userId}?fields=id,trust_score,verified_badge`,
    { auth: true }
  );
  return r?.data;
}

function badgeFromTrust(trustScore) {
  return Number(trustScore || 0) >= VERIFIED_BADGE_THRESHOLD;
}

async function applyReporterTrustOnce(incident) {
  if (!incident?.id) throw new Error("Incident not found");

  const finalStatus = String(incident.status || "").toLowerCase();

  if (finalStatus !== "verified" && finalStatus !== "false") {
    return { ok: true, skipped: true, reason: "Incident not final" };
  }

  if (incident.trust_applied) {
    return { ok: true, skipped: true, reason: "Trust already applied" };
  }

  const reporterId = incident.reported_by;
  if (!reporterId) {
    return { ok: true, skipped: true, reason: "No reporter on incident" };
  }

  const reporter = await getUserById(reporterId);
  const oldTrust = Number(reporter?.trust_score || 0);

  const delta =
    finalStatus === "verified"
      ? REPORTER_REWARD_VERIFIED
      : REPORTER_PENALTY_FALSE;

  const newTrust = oldTrust + delta;

  await patchUser(reporterId, {
    trust_score: newTrust,
    verified_badge: badgeFromTrust(newTrust),
  });

  await patchIncident(incident.id, {
    trust_applied: true,
    trust_applied_at: new Date().toISOString(),
  });

  return {
    ok: true,
    reporterId,
    delta,
    newTrust,
  };
}

/* =========================================================
   Recompute + auto trust
========================================================= */
export async function recomputeIncidentScoreAndStatus(incident) {
  if (!incident?.id) throw new Error("Missing incident");

  const incidentId = incident.id;

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

  const isFinal = status === "verified" || status === "false";

  if (isFinal) {
    try {
      const latestIncident = await getIncident(incidentId);
      await applyReporterTrustOnce(latestIncident);
    } catch (e) {
      console.log("Trust apply failed:", e?.message);
    }
  }

  return {
    score: updated?.score ?? score,
    status: updated?.status ?? status,
    votesCount: votes.length,
  };
}

/* =========================================================
   Vote + recompute
========================================================= */
export async function upsertVote({ incidentId, userId, vote }) {
  if (!incidentId || !userId) throw new Error("Missing incidentId or userId");
  if (!["up", "down"].includes(vote)) {
    throw new Error("Vote must be 'up' or 'down'");
  }

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

  const inc = await getIncident(incidentId);
  await recomputeIncidentScoreAndStatus(inc);

  return savedVote;
}

/* =========================================================
   Create incident
========================================================= */
export async function createIncident(payload) {
  const r = await request(
    "/items/incidents?fields=id,media_file,score,status,reported_by,trust_applied",
    {
      method: "POST",
      body: payload,
      auth: true,
    }
  );

  const created = r?.data;

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
   Optional admin helper
========================================================= */
export async function adminSetIncidentStatus(
  incidentId,
  newStatus,
  { forceChangeFinal = false } = {}
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

  const becameFinal = (next === "verified" || next === "false") && !isFinal;
  if (becameFinal) {
    const latest = await getIncident(incidentId);
    await applyReporterTrustOnce(latest);
  }

  return updated;
}

export async function listDangerZones() {
  const res = await request("/items/danger_zones?filter[active][_eq]=true", {
    auth: false,
  });
  return res?.data || [];
}

/* =========================================================
   SOS Requests
========================================================= */
export async function createSosRequest(payload) {
  const r = await request(
    "/items/sos_requests?fields=id,latitude,longitude,type_of_help,note,status,user,assigned_volunteer,withdrawal_requested,date_created",
    {
      method: "POST",
      body: payload,
      auth: true,
    }
  );
  return r?.data;
}

export async function listSosRequests() {
  const fields = [
    "id",
    "latitude",
    "longitude",
    "type_of_help",
    "note",
    "status",
    "withdrawal_requested",
    "date_created",
    "user.id",
    "user.email",
    "assigned_volunteer.id",
    "assigned_volunteer.email",
  ].join(",");

  const r = await request(
    `/items/sos_requests?sort=-date_created&limit=100&fields=${encodeURIComponent(fields)}`,
    { auth: true }
  );

  return r?.data || [];
}

export async function patchSosRequest(id, data) {
  if (!id) throw new Error("Missing SOS request id");

  const r = await request(
    `/items/sos_requests/${id}?fields=id,status,assigned_volunteer,withdrawal_requested`,
    {
      method: "PATCH",
      body: data,
      auth: true,
    }
  );

  return r?.data;
}

export async function listMySosRequests(userId) {
  if (!userId) return [];

  const fields = [
    "id",
    "latitude",
    "longitude",
    "type_of_help",
    "note",
    "status",
    "withdrawal_requested",
    "date_created",
    "user.id",
    "user.email",
    "assigned_volunteer.id",
    "assigned_volunteer.email",
  ].join(",");

  const params = new URLSearchParams({
    "filter[user][_eq]": String(userId),
    sort: "-date_created",
    limit: "20",
    fields,
  });

  const r = await request(`/items/sos_requests?${params.toString()}`, {
    auth: true,
  });

  return r?.data || [];
}

/* =========================================================
   Community Support Posts
========================================================= */
export async function createSupportPost(payload) {
  const r = await request(
    "/items/support_posts?fields=id,type,category,decription,latitude,longitude,status,verified_post,user,accepted_by,date_created",
    {
      method: "POST",
      body: payload,
      auth: true,
    }
  );
  return r?.data;
}

export async function listSupportPosts() {
  const fields = [
    "id",
    "type",
    "category",
    "decription",
    "latitude",
    "longitude",
    "status",
    "verified_post",
    "date_created",
    "user.id",
    "user.email",
    "accepted_by.id",
    "accepted_by.email",
  ].join(",");

  const r = await request(
    `/items/support_posts?sort=-date_created&limit=200&fields=${encodeURIComponent(fields)}`,
    { auth: true }
  );

  return r?.data || [];
}

export async function patchSupportPost(id, data) {
  if (!id) throw new Error("Missing support post id");

  const r = await request(
    `/items/support_posts/${id}?fields=id,status,verified_post,accepted_by`,
    {
      method: "PATCH",
      body: data,
      auth: true,
    }
  );

  return r?.data;
}