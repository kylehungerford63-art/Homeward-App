import { post } from "../utils/api.js";

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  const res = await post("/api/auth/login", { email, password });

  if (!res.success) {
    alert(res.error || "Login failed");
    return;
  }

  localStorage.setItem("token", res.token);
  localStorage.setItem("user", JSON.stringify(res.user));

  window.location.href = "/"; // go to dashboard
});

document.getElementById("go-register").addEventListener("click", () => {
  window.location.href = "/pages/register.page.html";
});

document.getElementById("continue-guest").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
});
