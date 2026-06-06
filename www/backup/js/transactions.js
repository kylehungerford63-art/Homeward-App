import { get, post } from "./utils/api.js";

let editingTransactionId = null; // null = add mode, id = edit mode

export function initTransactions() {
  const list = document.getElementById("transaction-list");
  if (!list) return;

  loadTransactions(list);
  setupTransactionSheet(list);
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
      list.innerHTML = `<div class="error">Could not load transactions (unexpected response)</div>`;
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

  list.innerHTML = transactions
    .map(tx => {
      const amount = Number(tx.amount).toFixed(2);

      // Fix: avoid UTC shift (June 3 → June 2)
      const formattedDate = new Date(tx.date + "T00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });

      return `
        <div class="tx-card" data-id="${tx.id}">
          <div class="tx-card-left">
            <div class="tx-card-name">${escapeHtml(tx.name)}</div>
            <div class="tx-card-date">${formattedDate}</div>
          </div>

          <div class="tx-card-actions">
            <button class="tx-edit" title="Edit">✏️</button>
            <button class="tx-ignore" title="Ignore">🚫</button>
            <button class="tx-delete" title="Delete">🗑️</button>
          </div>

          <div class="tx-card-amount">$${amount}</div>
        </div>
      `;
    })
    .join("");

  // Mark ignored cards visually
  list.querySelectorAll(".tx-card").forEach(card => {
    const id = card.dataset.id;
    const tx = window.currentTransactions.find(t => t.id === id);
    if (tx?.ignored) card.classList.add("ignored");
  });

  // DELETE
  list.querySelectorAll(".tx-delete").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const id = btn.closest(".tx-card").dataset.id;
      await deleteTransaction(id);
      loadTransactions(list);
      if (window.refreshBudgetSummary) window.refreshBudgetSummary();
    });
  });

  // EDIT
  list.querySelectorAll(".tx-edit").forEach(btn => {
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const id = btn.closest(".tx-card").dataset.id;
      await openEditTransaction(id);
    });
  });

  // IGNORE (one‑click ignore)
  list.querySelectorAll(".tx-ignore").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.closest(".tx-card").dataset.id;
      ignoreTransaction(id);
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
   EDIT TRANSACTION (prefill + PUT)
============================================================ */
async function openEditTransaction(id) {
  const tx = window.currentTransactions?.find(t => t.id === id);
  if (!tx) {
    console.error("Transaction not found:", id);
    return;
  }

  // mark we are editing this one
  editingTransactionId = id;

  // always load categories/envelopes before showing sheet
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
switchBtn.dataset.state = tx.ignored ? "on" : "off";
switchBtn.textContent = tx.ignored ? "On" : "Off";

  openSheet(
    document.getElementById("transaction-sheet"),
    document.getElementById("sheet-backdrop")
  );
}

/* ============================================================
   IGNORE TRANSACTION (one‑click)
============================================================ */
async function ignoreTransaction(id) {
  const tx = window.currentTransactions?.find(t => t.id === id);
  if (!tx) return;

  // toggle
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

  // Update in-memory
  tx.ignored = newIgnored;

  // Update UI immediately
  const card = document.querySelector(`.tx-card[data-id="${id}"]`);
  if (card) {
    if (newIgnored) card.classList.add("ignored");
    else card.classList.remove("ignored");
  }

  // Refresh budget
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

  // Only wire the switch if it exists
  if (switchBtn) {
    switchBtn.onclick = () => {
      const newState = switchBtn.dataset.state === "off" ? "on" : "off";
      switchBtn.dataset.state = newState;
      switchBtn.textContent = newState === "on" ? "On" : "Off";
    };
  }

  // ADD TRANSACTION
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

  // CANCEL
  cancelBtn.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    editingTransactionId = null;
    closeSheet(sheet, backdrop);
  });

  // BACKDROP CLOSE
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) {
      editingTransactionId = null;
      closeSheet(sheet, backdrop);
    }
  });

  // SAVE (ADD or EDIT)
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
        throw new Error("Unexpected mode response: " + txt.slice(0, 200));
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
      let result;

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
        result = await res.json();
      } else {
        result = await post("/api/transactions", body);
        if (!result || !result.success) {
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

    // Clear form
    document.getElementById("tx-name").value = "";
    document.getElementById("tx-amount").value = "";
    document.getElementById("tx-date").value = "";
    document.getElementById("tx-target").value = "";
    if (switchBtn) {
      switchBtn.dataset.state = "off";
      switchBtn.textContent = "Off";
    }

    // Reload transactions
    loadTransactions(list);

    // Refresh budget summary if budget page has registered it
    if (window.refreshBudgetSummary) {
      window.refreshBudgetSummary();
    }
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
    const modeRes = await fetch("/api/budget/mode");
    const ct = modeRes.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const txt = await modeRes.text();
      throw new Error("Unexpected mode response: " + txt.slice(0, 200));
    }
    ({ mode } = await modeRes.json());
  } catch (err) {
    console.error("Failed to read budget mode", err);
    throw err;
  }

  const res = await fetch("/api/budget/summary");
  const ct2 = res.headers.get("content-type") || "";
  if (!ct2.includes("application/json")) {
    const txt = await res.text();
    throw new Error("Invalid summary response: " + txt.slice(0, 300));
  }
  const data = await res.json();

  const items = mode === "simple" ? data.categories : data.envelopes;

  items.forEach(i => {
    const opt = document.createElement("option");
    opt.value = i.id;
    opt.textContent = `${i.emoji || ""} ${i.name}`;
    select.appendChild(opt);
  });
}

/* ============================================================
   SHEET HELPERS (Transactions)
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
   UTILITY
============================================================ */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
