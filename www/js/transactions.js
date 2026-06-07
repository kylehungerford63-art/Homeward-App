// www/js/transactions.js
// Mobile-first Transactions UI: emoji left of title, grouped sections,
// and compact action buttons placed under the amount for mobile layout.

import * as api from "./utils/api.js";

let editingTransactionId = null; // null = add mode, id = edit mode

export function initTransactions() {
  const list = document.getElementById("transaction-list");
  if (!list) return;

  loadTransactions(list);
  setupTransactionSheet(list);
}

/* -----------------------------
   Inject mobile-first layout CSS
----------------------------- */
(function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* Card layout */
    .tx-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px;
      border-radius: 10px;
      background: var(--card-bg, #0f1720);
      margin-bottom: 8px;
      gap: 12px;
    }

    /* Left column: emoji + title/date */
    .tx-card-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .icon-box {
      width: 36px;
      height: 36px;
      background: #2b2f36;
      color: white;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex: 0 0 36px;
    }

    .tx-card-left > div {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .tx-card-name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tx-card-date {
      font-size: 12px;
      color: var(--muted, #9aa4b2);
    }

    /* Right column: amount and compact actions stacked vertically for mobile */
    .tx-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      flex-shrink: 0;
      min-width: 80px;
    }

    .tx-card-amount {
      font-weight: 700;
      white-space: nowrap;
      font-size: 14px;
    }

    /* Compact action group under amount */
    .tx-actions-compact {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: flex-end;
    }

    /* Small circular buttons for mobile */
    .tx-actions-compact button {
      width: 28px;
      height: 28px;
      padding: 0;
      border-radius: 6px;
      border: none;
      background: rgba(255,255,255,0.04);
      color: var(--muted, #cbd5e1);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
    }

    .tx-actions-compact button:active {
      transform: translateY(1px);
    }

    /* Section header */
    .tx-section {
      margin-bottom: 18px;
    }

    .tx-section-header {
      font-size: 13px;
      color: var(--muted, #9aa4b2);
      margin: 8px 0;
      font-weight: 600;
    }

    /* Ensure desktop still looks fine: actions inline on wider screens */
    @media (min-width: 720px) {
      .tx-right {
        align-items: center;
        flex-direction: row;
      }
      .tx-actions-compact {
        order: 2;
      }
      .tx-card-amount {
        order: 1;
        margin-right: 8px;
      }
    }
  `;
  document.head.appendChild(style);
})();

/* -----------------------------
   Utilities
----------------------------- */
function parseDateSafe(dateStr) {
  if (!dateStr) return null;
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  d = new Date(dateStr + "T00:00");
  return isNaN(d.getTime()) ? null : d;
}

function formatDateShort(dateStr) {
  const d = parseDateSafe(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function monthYearLabel(date) {
  if (!date) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function daysBetween(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((a - b) / msPerDay);
}

function escapeHtml(text) {
  if (text === undefined || text === null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* -----------------------------
   Grouping logic
----------------------------- */
function groupTransactions(transactions) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const groups = new Map();

  const pushToGroup = (label, tx) => {
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(tx);
  };

  transactions.forEach(tx => {
    const d = parseDateSafe(tx.date);
    if (!d) {
      pushToGroup("Unknown date", tx);
      return;
    }

    const diffDays = daysBetween(todayStart.getTime(), new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());

    if (diffDays === 0) {
      pushToGroup("Today", tx);
    } else if (diffDays > 0 && diffDays <= 7) {
      pushToGroup("Last week", tx);
    } else if (diffDays > 7 && diffDays <= 30) {
      pushToGroup("Last month", tx);
    } else {
      pushToGroup(monthYearLabel(d), tx);
    }
  });

  const ordered = [];
  ["Today", "Last week", "Last month"].forEach(k => {
    if (groups.has(k)) ordered.push({ label: k, items: groups.get(k) });
    groups.delete(k);
  });

  const remaining = Array.from(groups.entries()).map(([label, items]) => {
    items.sort((a, b) => {
      const da = parseDateSafe(a.date);
      const db = parseDateSafe(b.date);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      if (tb !== ta) return tb - ta;
      if (a.id && b.id) return b.id.localeCompare(a.id);
      return 0;
    });
    const repDate = parseDateSafe(items[0]?.date) || new Date(0);
    return { label, items, repTime: repDate.getTime() };
  });

  remaining.sort((a, b) => b.repTime - a.repTime);
  remaining.forEach(r => ordered.push({ label: r.label, items: r.items }));

  return ordered;
}

/* ============================================================
   LOAD TRANSACTIONS
============================================================ */
// Full replacement: loadTransactions, pruneDuplicateActionGroups, normalizeTransactionActions, attachTransactionActions
// Drop these into www/js/transactions.js replacing the existing implementations.

/* ============================================================
   LOAD TRANSACTIONS
============================================================ */
async function loadTransactions(list) {
  list.innerHTML = "Loading...";

  let transactions = [];
  try {
    const res = await api.get("/api/transactions");
    if (!res) throw new Error("Empty response from /api/transactions");
    transactions = Array.isArray(res) ? res : Array.isArray(res.body) ? res.body : [];
  } catch (err) {
    console.error("Failed to load transactions", err);
    list.innerHTML = `<div class="error">Failed to load transactions</div>`;
    return;
  }

  if (!transactions.length) {
    list.innerHTML = `<div class="empty">No transactions yet</div>`;
    return;
  }

  // Sort newest first by date, fallback to id
  transactions.sort((a, b) => {
    const da = parseDateSafe(a.date);
    const db = parseDateSafe(b.date);
    const ta = da ? da.getTime() : null;
    const tb = db ? db.getTime() : null;
    if (ta !== null && tb !== null) return tb - ta;
    if (ta !== null) return -1;
    if (tb !== null) return 1;
    if (a.id && b.id) return b.id.localeCompare(a.id);
    return 0;
  });

  window.currentTransactions = transactions;

  const sections = groupTransactions(transactions);

  // Render sections
  list.innerHTML = sections
    .map(section => {
      const itemsHtml = section.items
        .map(tx => {
          const amount = Number(tx.amount || 0).toFixed(2);
          const emoji =
            tx.emoji ||
            tx.category_emoji ||
            tx.envelope_emoji ||
            (tx.category && tx.category.emoji) ||
            (tx.envelope && tx.envelope.emoji) ||
            "❓";
          const formattedDate = formatDateShort(tx.date);

          return `
            <div class="tx-card" data-id="${escapeHtml(tx.id)}">
              <div class="tx-card-left">
                <div class="icon-box">${escapeHtml(emoji)}</div>
                <div class="tx-meta">
                  <div class="tx-card-name">${escapeHtml(tx.name || "")}</div>
                  <div class="tx-card-date">${formattedDate}</div>
                </div>
              </div>

              <div class="tx-right">
                <div class="tx-card-amount ${Number(tx.amount) < 0 ? "negative" : ""}">$${escapeHtml(amount)}</div>

                <div class="tx-actions-compact" role="group" aria-label="transaction actions">
                  <button class="tx-edit" title="Edit" aria-label="Edit transaction">✏️</button>
                  <button class="tx-ignore" title="Ignore" aria-label="Ignore transaction">🚫</button>
                  <button class="tx-delete" title="Delete" aria-label="Delete transaction">🗑️</button>
                </div>

                <div class="tx-card-actions" aria-hidden="true">
                  <button class="tx-edit" title="Edit">✏️</button>
                  <button class="tx-ignore" title="Ignore">🚫</button>
                  <button class="tx-delete" title="Delete">🗑️</button>
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="tx-section">
          <div class="tx-section-header">${escapeHtml(section.label)}</div>
          ${itemsHtml}
        </div>
      `;
    })
    .join("");

  // Visual ignored state
  list.querySelectorAll(".tx-card").forEach(card => {
    const id = card.dataset.id;
    const tx = window.currentTransactions.find(t => t.id === id);
    if (tx?.ignored) card.classList.add("ignored");
    else card.classList.remove("ignored");
  });

  // Normalize action groups (prune/move) then wire handlers
  normalizeTransactionActions(list);
  attachTransactionActions(list);
}

/* ============================================================
   Remove duplicate action groups inside each tx-card, keep the bottom-most
============================================================ */
function pruneDuplicateActionGroups(listRoot = document) {
  const cards = listRoot.querySelectorAll(".tx-card");
  cards.forEach(card => {
    const groups = Array.from(card.querySelectorAll(".tx-card-actions, .tx-actions-compact"));
    if (groups.length <= 1) return;
    const last = groups[groups.length - 1];
    groups.slice(0, -1).forEach(g => g.remove());
    if (!last.classList.contains("tx-actions-compact") && !last.classList.contains("tx-card-actions")) {
      last.classList.add("tx-actions-compact");
    }
  });
}

/* ============================================================
   Normalize action groups: keep bottom-most, convert to compact, move under amount
============================================================ */
function normalizeTransactionActions(list) {
  if (!list) list = document;
  list.querySelectorAll(".tx-card").forEach(card => {
    const groups = Array.from(card.querySelectorAll(".tx-actions-compact, .tx-card-actions"));
    if (!groups.length) {
      // create a compact group if none exist
      const right = card.querySelector(".tx-right") || (() => {
        const r = document.createElement("div");
        r.className = "tx-right";
        card.appendChild(r);
        return r;
      })();

      const compact = document.createElement("div");
      compact.className = "tx-actions-compact";
      compact.setAttribute("role", "group");
      compact.innerHTML = `
        <button class="tx-edit" title="Edit" aria-label="Edit transaction">✏️</button>
        <button class="tx-ignore" title="Ignore" aria-label="Ignore transaction">🚫</button>
        <button class="tx-delete" title="Delete" aria-label="Delete transaction">🗑️</button>
      `;
      right.appendChild(compact);
      return;
    }

    const keep = groups[groups.length - 1];
    groups.slice(0, -1).forEach(g => g.remove());

    if (!keep.classList.contains("tx-actions-compact")) {
      keep.classList.remove("tx-card-actions");
      keep.classList.add("tx-actions-compact");
    }

    const right = card.querySelector(".tx-right");
    const amount = right?.querySelector(".tx-card-amount");
    if (right && keep) {
      if (amount) {
        if (amount.nextSibling !== keep) right.insertBefore(keep, amount.nextSibling);
      } else {
        right.appendChild(keep);
      }
    }
  });
}

/* ============================================================
   Attach handlers for actions (delete, edit, ignore)
============================================================ */
function attachTransactionActions(list) {
  if (!list) list = document;

  // DELETE
  list.querySelectorAll(".tx-delete").forEach(btn => {
    btn.removeEventListener?.("click", btn._txDeleteHandler);
    const handler = async e => {
      e.stopPropagation();
      const id = btn.closest(".tx-card")?.dataset.id;
      if (!id) return;
      if (!confirm("Delete this transaction?")) return;
      try {
        await api.del(`/api/transactions/${id}`);
      } catch (err) {
        console.error("Delete failed", err);
        alert("Delete failed");
        return;
      }
      const listEl = document.getElementById("transaction-list");
      if (listEl) await loadTransactions(listEl);
      window.refreshBudgetSummary?.();
    };
    btn._txDeleteHandler = handler;
    btn.addEventListener("click", handler);
  });

  // EDIT
  list.querySelectorAll(".tx-edit").forEach(btn => {
    btn.removeEventListener?.("click", btn._txEditHandler);
    const handler = async e => {
      e.stopPropagation();
      const id = btn.closest(".tx-card")?.dataset.id;
      if (!id) return;
      await openEditTransaction(id);
    };
    btn._txEditHandler = handler;
    btn.addEventListener("click", handler);
  });

  // IGNORE (toggle)
  list.querySelectorAll(".tx-ignore").forEach(btn => {
    btn.removeEventListener?.("click", btn._txIgnoreHandler);
    const handler = async e => {
      e.stopPropagation();
      const id = btn.closest(".tx-card")?.dataset.id;
      if (!id) return;
      const tx = window.currentTransactions?.find(t => t.id === id);
      if (!tx) return;
      const newIgnored = !tx.ignored;
      const body = {
        name: tx.name,
        amount: tx.amount,
        date: tx.date,
        categoryId: tx.category_id || null,
        envelopeId: tx.envelope_id || null,
        ignored: newIgnored
      };
      try {
        await api.put(`/api/transactions/${id}`, body);
      } catch (err) {
        console.error("Ignore toggle failed", err);
        return;
      }
      tx.ignored = newIgnored;
      const card = document.querySelector(`.tx-card[data-id="${escapeHtml(id)}"]`);
      if (card) {
        if (newIgnored) card.classList.add("ignored");
        else card.classList.remove("ignored");
      }
      window.refreshBudgetSummary?.();
    };
    btn._txIgnoreHandler = handler;
    btn.addEventListener("click", handler);
  });
}


/* ============================================================
   EDIT / IGNORE / DELETE helpers
============================================================ */
async function openEditTransaction(id) {
  const tx = window.currentTransactions?.find(t => t.id === id);
  if (!tx) {
    console.error("Transaction not found:", id);
    return;
  }

  editingTransactionId = id;

  try {
    await loadTargets();
  } catch (err) {
    console.error("Failed to load targets for edit", err);
    alert("Unable to load categories/envelopes for editing.");
    return;
  }

  document.getElementById("tx-name").value = tx.name || "";
  document.getElementById("tx-amount").value = tx.amount || "";

  const dateInput = document.getElementById("tx-date");
  if (dateInput) {
    const d = parseDateSafe(tx.date);
    dateInput.value = d ? d.toISOString().slice(0, 10) : "";
  }

  const targetEl = document.getElementById("tx-target");
  if (targetEl) targetEl.value = tx.category_id || tx.envelope_id || "";

  const switchBtn = document.getElementById("tx-ignore-switch");
  if (switchBtn) {
    switchBtn.dataset.state = tx.ignored ? "on" : "off";
    switchBtn.textContent = tx.ignored ? "On" : "Off";
  }

  openSheet(document.getElementById("transaction-sheet"), document.getElementById("sheet-backdrop"));
}

async function ignoreTransaction(id) {
  const tx = window.currentTransactions?.find(t => t.id === id);
  if (!tx) return;

  const newIgnored = !tx.ignored;

  const body = {
    name: tx.name,
    amount: tx.amount,
    date: tx.date,
    categoryId: tx.category_id || null,
    envelopeId: tx.envelope_id || null,
    ignored: newIgnored
  };

  try {
    await api.put(`/api/transactions/${id}`, body);
  } catch (err) {
    console.error("Ignore toggle failed", err);
    return;
  }

  tx.ignored = newIgnored;
  const card = document.querySelector(`.tx-card[data-id="${escapeHtml(id)}"]`);
  if (card) {
    if (newIgnored) card.classList.add("ignored");
    else card.classList.remove("ignored");
  }

  window.refreshBudgetSummary?.();
}

/* ============================================================
   TRANSACTION SHEET LOGIC
============================================================ */
function setupTransactionSheet(list) {
  const sheet = document.getElementById("transaction-sheet");
  const backdrop = document.getElementById("sheet-backdrop");
  const btn = document.getElementById("add-transaction-btn");
  const saveBtn = document.getElementById("tx-save");
  const cancelBtn = document.getElementById("tx-cancel");
  const switchBtn = document.getElementById("tx-ignore-switch");

  if (!sheet || !backdrop || !btn || !saveBtn || !cancelBtn) {
    console.error("Missing required transaction elements");
    return;
  }

  if (switchBtn) {
    switchBtn.onclick = () => {
      const newState = switchBtn.dataset.state === "off" ? "on" : "off";
      switchBtn.dataset.state = newState;
      switchBtn.textContent = newState === "on" ? "On" : "Off";
    };
  }

  btn.addEventListener("click", async e => {
    e.preventDefault();
    e.stopPropagation();

    editingTransactionId = null;

    try {
      await loadTargets();

      document.getElementById("tx-name").value = "";
      document.getElementById("tx-amount").value = "";
      document.getElementById("tx-date").value = "";
      document.getElementById("tx-target").value = "";

      if (switchBtn) {
        switchBtn.dataset.state = "off";
        switchBtn.textContent = "Off";
      }

      openSheet(sheet, backdrop);
    } catch (err) {
      console.error("Cannot open transaction sheet:", err);
      alert("Unable to open transaction form. See console for details.");
    }
  });

  cancelBtn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    editingTransactionId = null;
    closeSheet(sheet, backdrop);
  });

  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) {
      editingTransactionId = null;
      closeSheet(sheet, backdrop);
    }
  });

  saveBtn.addEventListener("click", async e => {
    e.preventDefault();
    e.stopPropagation();

    const name = document.getElementById("tx-name").value.trim();
    const amount = Number(document.getElementById("tx-amount").value);
    const date = document.getElementById("tx-date").value;
    const target = document.getElementById("tx-target").value;
    const ignored = switchBtn ? switchBtn.dataset.state === "on" : false;

    if (!name || !amount || !date || !target) {
      alert("Please fill in all fields");
      return;
    }

    if (amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    const body = {
      name,
      amount,
      date,
      categoryId: null,
      envelopeId: null,
      ignored
    };

    let mode = "simple";
    try {
      const modeRes = await api.get("/api/budget/mode");
      mode = modeRes && modeRes.mode ? modeRes.mode : "simple";
    } catch (err) {
      console.error("Failed to read budget mode", err);
      alert("Unable to determine budget mode.");
      return;
    }

    if (mode === "simple") {
      body.categoryId = target;
    } else {
      body.envelopeId = target;
    }

    try {
      if (editingTransactionId) {
        await api.put(`/api/transactions/${editingTransactionId}`, body);
      } else {
        const result = await api.post("/api/transactions", body);
        if (!result || result.success === false) {
          console.error("Transaction save failed", result);
          alert("Save failed: " + (result?.error || "Unknown error"));
          return;
        }
      }
    } catch (err) {
      console.error("Save transaction error", err);
      alert("Save failed due to network error");
      return;
    }

    editingTransactionId = null;
    closeSheet(sheet, backdrop);

    document.getElementById("tx-name").value = "";
    document.getElementById("tx-amount").value = "";
    document.getElementById("tx-date").value = "";
    document.getElementById("tx-target").value = "";
    if (switchBtn) {
      switchBtn.dataset.state = "off";
      switchBtn.textContent = "Off";
    }

    await loadTransactions(list);
    window.refreshBudgetSummary?.();
  });
}

/* ============================================================
   LOAD CATEGORY/ENVELOPE OPTIONS
============================================================ */
async function loadTargets() {
  const select = document.getElementById("tx-target");
  if (!select) return;

  select.innerHTML = '<option value="">Select a category...</option>';

  let mode = "simple";
  try {
    const modeRes = await api.get("/api/budget/mode");
    mode = modeRes && modeRes.mode ? modeRes.mode : "simple";
  } catch (err) {
    console.error("Failed to read budget mode", err);
    throw err;
  }

  const res = await api.get("/api/budget/summary");
  const data = Array.isArray(res) ? { categories: res } : (res && (res.body || res)) || { categories: [], envelopes: [] };

  const items = mode === "simple" ? (data.categories || []) : (data.envelopes || []);

  items.forEach(i => {
    const opt = document.createElement("option");
    opt.value = i.id;
    opt.textContent = `${i.emoji || ""} ${i.name}`;
    select.appendChild(opt);
  });
}

/* ============================================================
   SHEET HELPERS
============================================================ */
function openSheet(sheet, backdrop) {
  if (!sheet || !backdrop) return;
  backdrop.classList.remove("hidden");
  sheet.classList.remove("hidden");

  setTimeout(() => {
    document.getElementById("tx-name")?.focus();
  }, 100);
}

function closeSheet(sheet, backdrop) {
  if (!sheet || !backdrop) return;
  sheet.classList.add("hidden");
  backdrop.classList.add("hidden");
}

/* ============================================================
   Exports for testing/debugging
============================================================ */
window._tx_parseDateSafe = parseDateSafe;
window._tx_groupTransactions = groupTransactions;
