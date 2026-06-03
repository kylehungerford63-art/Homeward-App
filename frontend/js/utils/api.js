// ===============================
//  API BASE URL (LOCAL + RENDER)
// ===============================
const BASE_URL = (() => {
  // Local development (VS Code + npm start)
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return "http://localhost:3000";
  }

  // Production (Render backend)
  return "https://homeward-app.onrender.com";
})();

// ===============================
//  GET REQUEST
// ===============================
export async function get(url) {
  const target = `${BASE_URL}${url}`;

  try {
    const res = await fetch(target);
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (contentType.includes("application/json")) {
      return JSON.parse(text);
    }

    console.error("Non-JSON GET response from", target, text);
    return { success: false, error: "Non-JSON response", raw: text };
  } catch (err) {
    console.error("Network error GET", target, err);
    return { success: false, error: "Network error", detail: String(err) };
  }
}

// ===============================
//  POST REQUEST
// ===============================
export async function post(url, data) {
  const target = `${BASE_URL}${url}`;

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    if (contentType.includes("application/json")) {
      return JSON.parse(text);
    }

    console.error("Non-JSON POST response from", target, text);
    return { success: false, error: "Non-JSON response", raw: text };
  } catch (err) {
    console.error("Network error POST", target, err);
    return { success: false, error: "Network error", detail: String(err) };
  }
}
