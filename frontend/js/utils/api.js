// frontend/js/utils/api.js
// Use relative URLs so the frontend calls the same origin the page was loaded from.
// This avoids hardcoding :3000 which times out in production.
const BASE = ""; // relative base -> "/api/..." resolves to same origin

function buildUrl(path) {
  // Ensure path starts with a slash
  if (!path.startsWith("/")) return `${BASE}/${path}`;
  return `${BASE}${path}`;
}

async function parseJsonSafe(res, target) {
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("Invalid JSON from", target, text);
      return { success: false, error: "Invalid JSON response", raw: text };
    }
  }
  // Non-JSON response
  return { success: false, error: "Non-JSON response", raw: text };
}

export async function get(url) {
  const target = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : buildUrl(url);

  try {
    const res = await fetch(target, { credentials: "same-origin" });

    if (!res.ok) {
      // Try to parse body for helpful error info
      const parsed = await parseJsonSafe(res, target);
      console.error("GET error", target, res.status, parsed);
      // Keep behavior predictable for callers: throw so callers can catch
      throw { status: res.status, body: parsed };
    }

    // Successful response
    const parsed = await parseJsonSafe(res, target);
    return parsed;
  } catch (err) {
    console.error("Network error GET", target, err);
    throw err;
  }
}

export async function post(url, data) {
  const target = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : buildUrl(url);

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const parsed = await parseJsonSafe(res, target);
      console.error("POST error", target, res.status, parsed);
      throw { status: res.status, body: parsed };
    }

    return await parseJsonSafe(res, target);
  } catch (err) {
    console.error("Network error POST", target, err);
    return { success: false, error: "Network error", detail: String(err) };
  }
}

export async function put(url, data) {
  const target = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : buildUrl(url);

  try {
    const res = await fetch(target, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const parsed = await parseJsonSafe(res, target);
      console.error("PUT error", target, res.status, parsed);
      throw { status: res.status, body: parsed };
    }

    return await parseJsonSafe(res, target);
  } catch (err) {
    console.error("Network error PUT", target, err);
    return { success: false, error: "Network error", detail: String(err) };
  }
}

export async function del(url) {
  const target = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : buildUrl(url);

  try {
    const res = await fetch(target, {
      method: "DELETE",
      credentials: "same-origin"
    });

    if (!res.ok) {
      const parsed = await parseJsonSafe(res, target);
      console.error("DELETE error", target, res.status, parsed);
      throw { status: res.status, body: parsed };
    }

    return await parseJsonSafe(res, target);
  } catch (err) {
    console.error("Network error DELETE", target, err);
    return { success: false, error: "Network error", detail: String(err) };
  }
}
