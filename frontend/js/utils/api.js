const BASE_URL = (() => {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return "http://localhost:3000";
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(location.hostname)) {
    return `http://${location.hostname}:3000`;
  }
  return `${location.protocol}//${location.hostname}:3000`;
})();

export async function get(url) {
  const res = await fetch(`${BASE_URL}${url}`);
  return res.json();
}

// frontend/js/utils/api.js (post function)
export async function post(url, data) {
  const target = url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `${BASE_URL}${url}`;

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

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

    // Non-JSON response (likely HTML). Return as error object for debugging.
    console.error("Non-JSON response from", target, text);
    return { success: false, error: "Non-JSON response", raw: text };
  } catch (err) {
    console.error("Network error POST", target, err);
    return { success: false, error: "Network error", detail: String(err) };
  }
}
