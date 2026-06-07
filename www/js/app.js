/* ============================
   IMPORT PAGE CONTROLLERS
============================ */
import { initDashboard } from "./dashboard.js";
import { initGoals } from "./goals.js";
import { initInsights } from "./insights.js";

/* ============================
   ROUTES
============================ */

const routes = {
  dashboard: "pages/dashboard.page.html",
  budget: "pages/budget.page.html",
  transactions: "pages/transactions.page.html",
  goals: "pages/goals.page.html",
  insights: "pages/insights.page.html",
};

/* ============================
   LOAD PAGE + RUN CONTROLLER
============================ */

function loadPage(page) {
  fetch(routes[page])
    .then(res => res.text())
    .then(html => {
      document.querySelector(".app-container").innerHTML = html;

      document.querySelectorAll(".nav-item").forEach(item => {
        item.classList.remove("active");
      });

      const activeItem = document.querySelector(`.nav-item[data-page="${page}"]`);
      if (activeItem) activeItem.classList.add("active");

      switch (page) {
        case "dashboard":
          initDashboard();
          break;

        case "budget":
          import(`./budget.js?t=${Date.now()}`).then(module => {
            module.initBudget();
          });
          break;

        case "transactions":
          import(`./transactions.js?t=${Date.now()}`).then(module => {
            module.initTransactions();
          });
          break;

        case "goals":
          initGoals();
          break;

        case "insights":
          initInsights();
          break;
      }
    });
}

/* ============================
   NAVIGATION + HIGHLIGHT
============================ */

const navScroll = document.querySelector(".nav-scroll");
const navItems = document.querySelectorAll(".nav-item");
const highlight = document.querySelector(".nav-highlight");

function snapToIndex(index) {
  const item = navItems[index];

  item.scrollIntoView({ behavior: "smooth", inline: "center" });

  highlight.style.width = item.offsetWidth + 12 + "px";

  loadPage(item.dataset.page);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

navItems.forEach((item, i) => {
  item.addEventListener("click", () => snapToIndex(i));
});

/* ============================
   PROFILE DROPDOWN + AUTH
============================ */

function initProfileMenu() {
  const profileCircle = document.getElementById("profile-circle");
  const profileMenu = document.getElementById("profile-menu");
  const userLabel = document.getElementById("profile-user-label");

  const btnLogin = document.getElementById("menu-login");
  const btnRegister = document.getElementById("menu-register");
  const btnLogout = document.getElementById("menu-logout");

  const token = localStorage.getItem("token");
  const userJson = localStorage.getItem("user");

  if (token && userJson) {
    const user = JSON.parse(userJson);
    userLabel.textContent = user.name || user.email || "Account";
    btnLogin.style.display = "none";
    btnRegister.style.display = "none";
    btnLogout.style.display = "block";
  } else {
    userLabel.textContent = "Guest";
    btnLogin.style.display = "block";
    btnRegister.style.display = "block";
    btnLogout.style.display = "none";
  }

  profileCircle.addEventListener("click", () => {
    const isVisible = profileMenu.style.display === "block";
    profileMenu.style.display = isVisible ? "none" : "block";
  });

  btnLogin.addEventListener("click", () => {
    window.location.href = "/pages/login.page.html";
  });

  btnRegister.addEventListener("click", () => {
    window.location.href = "/pages/register.page.html";
  });

  btnLogout.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/pages/login.page.html";
  });

  document.addEventListener("click", (e) => {
    if (!profileCircle.contains(e.target) && !profileMenu.contains(e.target)) {
      profileMenu.style.display = "none";
    }
  });
}

/* ============================
   INITIALIZE APP
============================ */

document.addEventListener("DOMContentLoaded", () => {
  initProfileMenu();
  setTimeout(() => snapToIndex(0), 150);
});
