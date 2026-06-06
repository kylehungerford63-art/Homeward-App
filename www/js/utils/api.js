// frontend/js/utils/api.js
// Use relative URLs so the frontend calls the same origin the page was loaded from.
const BASE = ""; // relative base -> "/api/..." resolves to same origin

function buildUrl(path) {
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

  return { success: false, error: "Non-JSON response", raw: text };
}

async function handleResponse(res, target) {
  if (!res.ok) {
    const parsed = await parseJsonSafe(res, target);
    console.error("HTTP error", target, res.status, parsed);
    throw { status: res.status, body: parsed };
  }
  return parseJsonSafe(res, target);
}

export async function get(url) {
  const token = localStorage.getItem("token");
  const target = buildUrl(url);

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    return await handleResponse(res, target);
  } catch (err) {
    console.error("Network error GET", target, err);
    return { success: false, error: "Network error", detail: String(err) };
  }
}

export async function post(url, body) {
  const token = localStorage.getItem("token");
  const target = buildUrl(url);

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });

    return await handleResponse(res, target);
  } catch (err) {
    console.error("Network error POST", target, err);
    return { success: false, error: "Network error", detail: String(err) };
  }
}

export async function put(url, data) {
  const token = localStorage.getItem("token");
  const target = buildUrl(url);

  try {
    const res = await fetch(target, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data)
    });

    return await handleResponse(res, target);
  } catch (err) {
    console.error("Network error PUT", target, err);
    return { success: false, error: "Network error", detail: String(err) };
  }
}

export async function del(url) {
  const token = localStorage.getItem("token");
  const target = buildUrl(url);

  try {
    const res = await fetch(target, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    return await handleResponse(res, target);
  } catch (err) {
    console.error("Network error DELETE", target, err);
    return { success: false, error: "Network error", detail: String(err) };
  }
}
