import { get, post } from "./utils/api.js";

let editingTransactionId = null;

export function initTransactions() {
  const list = document.getElementById("transaction-list");
  if (!list) return;

  loadTransactions(list);
  setupTransactionSheet(list);
}

/* ============================================================
   DATE GROUPING
============================================================ */
function getGroupLabel(dateStr) {
  const today = new Date();
  const d = new Date(dateStr + "T00:00");

  const isToday = d.toDateString() === today.toDateString();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/* ============================================================
   LOAD TRANSACTIONS
============================================================ */
async function loadTransactions(list) {
  list.innerHTML = "Loading...";

  let transactions = [];
  try {
    const res = await fetch("/api/transactions");
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      console.error("Expected JSON from /api/transactions, got:", text.slice(0, 300));
      list.innerHTML = `<div class="error">Could not load transactions</div>`;
      return;
    }
    transactions = await res.json();
  } catch (err) {
    console.error("Failed to load transactions", err);
    list.innerHTML = `<div class="error">Failed to load transactions</div>`;
    return;
  }

  if (!transactions.length) {
    list.innerHTML = `<div class="empty">No transactions yet</div>`;
    return;
  }

  // Sort newest first
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Store globally for editing
  window.currentTransactions = transactions;

  function getTxEmoji(tx) {
    return tx.categoryEmoji || tx.envelopeEmoji || "❓";
  }

  /* Build grouped HTML */
  let html = "";
  let lastGroup = "";

  transactions.forEach(tx => {
    const group = getGroupLabel(tx.date);
    if (group !== lastGroup) {
      html += `<div class="tx-group">${group}</div>`;
      lastGroup = group;
    }

    const amount = Number(tx.amount).toFixed(2);

    const formattedDate = new Date(tx.date + "T00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });

    html += `
      <div class="tx-card" data-id="${tx.id}">
        
        <div class="tx-card-content">

          <div class="tx-left">
            <div class="tx-name-row">
              <span class="tx-emoji">${getTxEmoji(tx)}</span>
              <span class="tx-name">${escapeHtml(tx.name)}</span>
            </div>
            <div class="tx-date">${formattedDate}</div>
          </div>

          <div class="tx-right">
            <div class="tx-amount">$${amount}</div>

            <div class="tx-actions">
              <button class="tx-edit" title="Edit">✏️</button>
              <button class="tx-ignore" title="Ignore">🚫</button>
              <button class="tx-delete" title="Delete">🗑️</button>
            </div>
          </div>

        </div>

      </div>
    `;
  });

  list.innerHTML = html;

  /* Mark ignored cards visually */
  list.querySelectorAll(".tx-card").forEach(card => {
    const id = card.dataset.id;
    const tx = window.currentTransactions.find(t => t.id === id);
    if (tx?.ignored) card.classList.add("ignored");
  });

  /* DELETE */
  list.querySelectorAll(".tx-delete").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const id = btn.closest(".tx-card").dataset.id;
      await deleteTransaction(id);
      loadTransactions(list);
      window.refreshBudgetSummary?.();
    });
  });

  /* EDIT */
  list.querySelectorAll(".tx-edit").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const id = btn.closest(".tx-card").dataset.id;
      await openEditTransaction(id);
    });
  });

  /* IGNORE */
  list.querySelectorAll(".tx-ignore").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.closest(".tx-card").dataset.id;
      ignoreTransaction(id);
    });
  });

  /* TAP ANYWHERE TO EDIT */
  list.querySelectorAll(".tx-card-content").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest(".tx-actions")) return;
      const id = card.closest(".tx-card").dataset.id;
      openEditTransaction(id);
    });
  });
}

/* ============================================================
   DELETE TRANSACTION
============================================================ */
async function deleteTransaction(id) {
  await fetch(`/api/transactions/${id}`, { method: "DELETE" });
}

/* ============================================================
   EDIT TRANSACTION
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

  document.getElementById("tx-name").value = tx.name;
  document.getElementById("tx-amount").value = tx.amount;
  document.getElementById("tx-date").value = tx.date;
  document.getElementById("tx-target").value = tx.categoryId || tx.envelopeId || "";

  const switchBtn = document.getElementById("tx-ignore-switch");
  if (switchBtn) {
    switchBtn.dataset.state = tx.ignored ? "on" : "off";
    switchBtn.textContent = tx.ignored ? "On" : "Off";
  }

  openSheet(
    document.getElementById("transaction-sheet"),
    document.getElementById("sheet-backdrop")
  );
}

/* ============================================================
   IGNORE TRANSACTION
============================================================ */
async function ignoreTransaction(id) {
  const tx = window.currentTransactions?.find(t => t.id === id);
  if (!tx) return;

  const newIgnored = !tx.ignored;

  const body = {
    name: tx.name,
    amount: tx.amount,
    date: tx.date,
    categoryId: tx.categoryId,
    envelopeId: tx.envelopeId,
    ignored: newIgnored
  };

  const res = await fetch(`/api/transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error("Ignore toggle failed", await res.text());
    return;
  }

  tx.ignored = newIgnored;

  const card = document.querySelector(`.tx-card[data-id="${id}"]`);
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
      alert("Unable to open transaction form.");
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
      const modeRes = await fetch("/api/budget/mode");
      const ct = modeRes.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const txt = await modeRes.text();
        throw new Error("Unexpected mode response");
      }
      ({ mode } = await modeRes.json());
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
        const res = await fetch(`/api/transactions/${editingTransactionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          console.error("Update transaction failed", await res.text());
          alert("Update failed");
          return;
        }
      } else {
        const result = await post("/api/transactions", body);
        if (!result || !result.success) {
          console.error("Transaction save failed", result);
          alert("Save failed");
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

    loadTransactions(list);
    window.refreshBudgetSummary?.();
  });
}

/* ============================================================
   SHEET HELPERS
============================================================ */
function openSheet(sheet, backdrop) {
  backdrop.classList.remove("hidden");
  sheet.classList.remove("hidden");

  setTimeout(() => {
    document.getElementById("tx-name")?.focus();
  }, 100);
}

function closeSheet(sheet, backdrop) {
  sheet.classList.add("hidden");
  backdrop.classList.add("hidden");
}

/* ============================================================
   UTILITY
============================================================ */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
