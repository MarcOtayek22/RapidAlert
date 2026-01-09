import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "rapidalert_token";
export const DIRECTUS_URL = process.env.EXPO_PUBLIC_DIRECTUS_URL;

async function request(path, { method = "GET", body, auth = true, timeoutMs = 8000 } = {}) {
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
  } catch (e) {
    console.log("Directus request failed:", `${DIRECTUS_URL}${path}`, e?.message);
    throw e;
  } finally {
    clearTimeout(t);
  }
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

// ✅ HERE is the important part:
// ask Directus to include role.name, so role is not a UUID
export async function getMe() {
  const r = await request(
    "/users/me?fields=id,email,first_name,last_name,role.id,role.name"
  );
  return r?.data;
}

export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}