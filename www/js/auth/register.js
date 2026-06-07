import { post } from "../utils/api.js";

document.getElementById("register-btn").addEventListener("click", async () => {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();

  const res = await post("/api/auth/register", { name, email, password });

  if (!res.success) {
    alert(res.error || "Registration failed");
    return;
  }

  localStorage.setItem("token", res.token);
  localStorage.setItem("user", JSON.stringify(res.user));

  window.location.href = "/";
});

document.getElementById("go-login").addEventListener("click", () => {
  window.location.href = "/pages/login.page.html";
});

document.getElementById("continue-guest").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
});
