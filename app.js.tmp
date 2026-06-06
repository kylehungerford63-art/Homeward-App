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

      // Update active nav item
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

  // Scroll nav item into view
  item.scrollIntoView({ behavior: "smooth", inline: "center" });

  // Update highlight width
  highlight.style.width = item.offsetWidth + 12 + "px";

  // Load the page
  loadPage(item.dataset.page);

  // Scroll page to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

navItems.forEach((item, i) => {
  item.addEventListener("click", () => snapToIndex(i));
});

/* ============================
   INITIALIZE APP
============================ */

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => snapToIndex(0), 150);
});
