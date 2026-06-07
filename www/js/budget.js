// www/js/budget.js
// Budget UI with defensive rendering, numeric normalization, guarded progress,
// debounce for mode toggles, and the existing sheet/emoji UI preserved.

import { get, post, put, del } from "./utils/api.js";

export function initBudget() {
  loadMode();
  loadSummary();
  setupEmojiPicker();

  // Mode toggle (debounced to avoid repeated heavy work)
  document.querySelectorAll("input[name='budget-mode']").forEach(radio => {
    radio.addEventListener(
      "change",
      debounce(() => {
        const value = radio.value;
        // Persist mode to backend (best-effort)
        post("/api/budget/mode", { mode: value }).catch(err => console.warn("mode save failed", err));
        updateAddButtons(value);
        loadSummary();
      }, 120)
    );
  });

  // Add buttons
  const addCatBtn = document.getElementById("add-category-btn");
  const addEnvBtn = document.getElementById("add-envelope-btn");
  if (addCatBtn) addCatBtn.onclick = () => openSheetModal("Add Category", "category");
  if (addEnvBtn) addEnvBtn.onclick = () => openSheetModal("Add Envelope", "envelope");

  // Sheet modal buttons
  const saveBtn = document.getElementById("sheet-modal-save");
  const cancelBtn = document.getElementById("sheet-modal-cancel");
  if (saveBtn) saveBtn.onclick = saveItem;
  if (cancelBtn) cancelBtn.onclick = closeSheetModal;

  // REQUIRED so transactions update the budget UI
  window.refreshBudgetSummary = loadSummary;
}

/* -----------------------------
   Helpers: debounce, normalize, percent, currency
----------------------------- */

function debounce(fn, wait = 120) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function normalizeCategory(c) {
  return {
    id: c.id,
    name: c.name || "",
    emoji: c.emoji || "❓",
    limit: Number(c.limit_amount ?? c.limit ?? 0),
    spent: Number(c.spent ?? 0),
    user_id: c.user_id
  };
}

function normalizeEnvelope(e) {
  return {
    id: e.id,
    name: e.name || "",
    emoji: e.emoji || "❓",
    balance: Number(e.balance ?? 0),
    user_id: e.user_id
  };
}

function percentFilled(limit, spent) {
  const l = Number(limit || 0);
  const s = Number(spent || 0);
  if (l <= 0) return 0;
  return Math.min(100, Math.round((s / l) * 100));
}

function formatCurrency(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

/* -----------------------------
   Load mode and summary
----------------------------- */

async function loadMode() {
  try {
    const data = await get("/api/budget/mode");
    const mode = data && data.mode ? data.mode : "simple";
    const radio = document.querySelector(`input[name='budget-mode'][value='${mode}']`);
    if (radio) radio.checked = true;
    updateAddButtons(mode);
  } catch (err) {
    console.warn("loadMode failed", err);
  }
}

async function loadSummary() {
  const container = document.getElementById("budget-content");
  if (!container) return;

  let data;
  try {
    data = await get("/api/budget/summary");
  } catch (err) {
    console.error("Failed to load budget summary", err);
    container.innerHTML = `<div class="error">Failed to load budget</div>`;
    return;
  }

  updateAddButtons(data.mode);

  // Render using normalized values and guarded calculations
  container.innerHTML = data.mode === "simple" ? renderSimple(data) : renderEnvelope(data);

  attachActions();
}

/* -----------------------------
   Update add buttons visibility
----------------------------- */
function updateAddButtons(mode) {
  const addCategory = document.getElementById("add-category-btn");
  const addEnvelope = document.getElementById("add-envelope-btn");
  if (!addCategory || !addEnvelope) return;

  if (mode === "simple") {
    addCategory.classList.remove("hidden");
    addEnvelope.classList.add("hidden");
  } else {
    addCategory.classList.add("hidden");
    addEnvelope.classList.remove("hidden");
  }
}

/* -----------------------------
   RENDER SIMPLE
----------------------------- */
function renderSimple(data) {
  const cats = (data.categories || []).map(normalizeCategory);
  return `
    <div class="simple-budget">
      ${cats
        .map(
          c => `
        <div class="budget-item" 
             data-id="${c.id}" 
             data-name="${escapeHtml(c.name)}" 
             data-limit="${c.limit}"
             data-emoji="${escapeHtml(c.emoji)}">
          
          <div class="label-row">
            <div class="icon-box">${escapeHtml(c.emoji)}</div>
            <div class="label">${escapeHtml(c.name)}</div>

            <div class="item-actions">
              <button class="edit-btn">Edit</button>
              <button class="delete-btn">Delete</button>
            </div>
          </div>

          <div class="bar">
            <div class="fill" style="width:${percentFilled(c.limit, c.spent)}%"></div>
          </div>

          <div class="numbers">${formatCurrency(c.spent)} / ${c.limit > 0 ? formatCurrency(c.limit) : "—"}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

/* -----------------------------
   RENDER ENVELOPE
----------------------------- */
function renderEnvelope(data) {
  const envs = (data.envelopes || []).map(normalizeEnvelope);
  return `
    <div class="envelope-budget">
      ${envs
        .map(
          e => `
        <div class="envelope-item" 
             data-id="${e.id}" 
             data-name="${escapeHtml(e.name)}" 
             data-balance="${e.balance}"
             data-emoji="${escapeHtml(e.emoji)}">
          
          <div class="label-row">
            <div class="icon-box">${escapeHtml(e.emoji)}</div>
            <div class="label">${escapeHtml(e.name)}</div>
          </div>

          <div class="right-side">
            <span class="balance">${formatCurrency(e.balance)}</span>
            <div class="item-actions">
              <button class="edit-btn">Edit</button>
              <button class="delete-btn">Delete</button>
            </div>
          </div>

        </div>
      `
        )
        .join("")}
    </div>
  `;
}

/* -----------------------------
   ATTACH EDIT/DELETE
----------------------------- */
function attachActions() {
  // Edit buttons
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.onclick = () => {
      const item = btn.closest("[data-id]");
      if (!item) return;

      const isCategory = item.classList.contains("budget-item");
      const type = isCategory ? "category" : "envelope";

      const amount = isCategory ? Number(item.dataset.limit || 0) : Number(item.dataset.balance || 0);
      const emoji = item.dataset.emoji || "";

      openSheetModal(
        isCategory ? "Edit Category" : "Edit Envelope",
        type,
        item.dataset.id,
        item.dataset.name,
        amount,
        emoji
      );
    };
  });

  // Delete buttons
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = async () => {
      const item = btn.closest("[data-id]");
      if (!item) return;
      const id = item.dataset.id;
      const isCategory = item.classList.contains("budget-item");
      const type = isCategory ? "category" : "envelope";

      if (!id) return;
      const ok = confirm("Delete this item?");
      if (!ok) return;

      try {
        await del(`/api/budget/${type}/${id}`);
        await loadSummary();
      } catch (err) {
        console.error("Delete failed", err);
        alert("Delete failed");
      }
    };
  });
}

/* -----------------------------
   SHEET MODAL OPEN/CLOSE
----------------------------- */
function openSheetModal(title, type, id = "", name = "", amount = "", emoji = "") {
  const sheet = document.getElementById("sheet-modal");
  if (!sheet) return;

  sheet.dataset.type = type;
  sheet.dataset.id = id;
  sheet.dataset.mode = title.startsWith("Add") ? "add" : "edit";

  const nameInput = document.getElementById("sheet-modal-name");
  const amountInput = document.getElementById("sheet-modal-amount");
  const emojiInput = document.getElementById("modal-emoji");
  const emojiPreview = document.getElementById("emoji-preview");

  if (nameInput) nameInput.value = name || "";
  if (amountInput) amountInput.value = amount !== undefined ? amount : "";
  if (emojiInput) emojiInput.value = emoji || "";
  if (emojiPreview) emojiPreview.textContent = emoji || "❓";

  openSheet(sheet);
}

function closeSheetModal() {
  const sheet = document.getElementById("sheet-modal");
  if (!sheet) return;
  closeSheet(sheet);
}

/* -----------------------------
   SAVE
----------------------------- */
let pendingSaveAfterEmoji = false;

async function saveItem() {
  const sheet = document.getElementById("sheet-modal");
  if (!sheet) return;

  const type = sheet.dataset.type;
  const mode = sheet.dataset.mode;
  const id = sheet.dataset.id;

  const nameEl = document.getElementById("sheet-modal-name");
  const amountEl = document.getElementById("sheet-modal-amount");
  const emojiEl = document.getElementById("modal-emoji");

  const name = nameEl ? nameEl.value.trim() : "";
  const amountValue = amountEl ? amountEl.value : "";
  const amount = Number(amountValue);
  const emoji = emojiEl ? emojiEl.value.trim() : "";

  if (!name || amountValue.trim() === "" || !Number.isFinite(amount)) {
    alert("Please provide a valid name and amount.");
    return;
  }

  // Require emoji
  if (!emoji) {
    pendingSaveAfterEmoji = true;
    openSheet(document.getElementById("emoji-sheet"));
    return;
  }

  try {
    if (mode === "add") {
      const payload = {
        name,
        emoji,
        ...(type === "category" ? { limit: amount } : { balance: amount })
      };
      const res = await post(`/api/budget/${type}`, payload);
      if (!res || res.success === false) {
        console.error("Save failed", res);
        alert("Save failed");
        return;
      }
    } else {
      const payload = {
        name,
        emoji,
        ...(type === "category" ? { limit: amount } : { balance: amount })
      };
      await put(`/api/budget/${type}/${id}`, payload);
    }
  } catch (err) {
    console.error("Save error", err);
    alert("Save failed");
    return;
  }

  closeSheetModal();
  loadSummary();
}

/* -----------------------------
   BOTTOM SHEET LOGIC
----------------------------- */
function openSheet(sheet) {
  if (!sheet) return;
  sheet.classList.remove("hidden");
  sheet.classList.add("visible");

  const backdrop = document.getElementById("sheet-backdrop");
  if (backdrop) {
    backdrop.classList.remove("hidden");
    backdrop.classList.add("visible");
  }
}

function closeSheet(sheet) {
  if (!sheet) return;
  sheet.classList.remove("visible", "expanded");

  const backdrop = document.getElementById("sheet-backdrop");
  if (backdrop) {
    backdrop.classList.remove("visible");
  }

  setTimeout(() => {
    sheet.classList.add("hidden");
    if (backdrop) backdrop.classList.add("hidden");
  }, 250);
}

function enableSheetDrag(sheet) {
  let startY = 0;
  let currentY = 0;
  let dragging = false;

  sheet.addEventListener("touchstart", e => {
    dragging = true;
    startY = e.touches[0].clientY;
  });

  sheet.addEventListener("touchmove", e => {
    if (!dragging) return;
    currentY = e.touches[0].clientY - startY;

    if (currentY > 0) {
      sheet.style.transform = `translateY(${currentY}px)`;
    }
  });

  sheet.addEventListener("touchend", () => {
    dragging = false;

    if (currentY > 120) {
      closeSheet(sheet);
    } else {
      sheet.style.transform = "";
    }
  });
}

/* -----------------------------
   EMOJI PICKER
----------------------------- */
const RECOMMENDED = [
  "🛒","🚗","🏠","🍽️","💡","🐶","🎮","💊","🎁","💵","💳","🧾","📚",
  "🧼","🧘","🧳","🛠️","🪙"
];

const FULL_EMOJIS = [..."😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🤩🥳😏😒😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😤😠😡🤬🤯😳🥵🥶😱😨😰😥😓🤗🤔🤭🤫🤥😶😐😑"];

function setupEmojiPicker() {
  const sheetModal = document.getElementById("sheet-modal");
  const emojiSheet = document.getElementById("emoji-sheet");
  const recGrid = document.getElementById("emoji-recommended");
  const fullGrid = document.getElementById("emoji-full");
  const moreBtn = document.getElementById("emoji-more");
  const emojiPreviewBtn = document.getElementById("emoji-preview");

  if (sheetModal) enableSheetDrag(sheetModal);
  if (emojiSheet) enableSheetDrag(emojiSheet);

  if (recGrid) {
    recGrid.innerHTML = "";
    RECOMMENDED.forEach(e => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = e;
      btn.onclick = () => selectEmoji(e);
      recGrid.appendChild(btn);
    });
  }

  if (fullGrid) {
    fullGrid.innerHTML = "";
    FULL_EMOJIS.forEach(e => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = e;
      btn.onclick = () => selectEmoji(e);
      fullGrid.appendChild(btn);
    });
  }

  if (moreBtn && fullGrid && emojiSheet) {
    moreBtn.onclick = () => {
      fullGrid.classList.remove("hidden");
      emojiSheet.classList.add("expanded");
    };
  }

  if (emojiPreviewBtn && emojiSheet) {
    emojiPreviewBtn.onclick = () => openSheet(emojiSheet);
  }
}

function selectEmoji(e) {
  const emojiInput = document.getElementById("modal-emoji");
  const emojiPreview = document.getElementById("emoji-preview");
  const emojiSheet = document.getElementById("emoji-sheet");

  if (!emojiInput || !emojiPreview) return;

  emojiInput.value = e;
  emojiPreview.textContent = e;

  if (emojiSheet) closeSheet(emojiSheet);

  if (pendingSaveAfterEmoji) {
    pendingSaveAfterEmoji = false;
    saveItem();
  }
}

/* -----------------------------
   ICON BOX STYLE (DARK, 32px)
----------------------------- */
const style = document.createElement("style");
style.textContent = `
  .icon-box {
    width: 32px;
    height: 32px;
    background: #333;
    color: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    margin-right: 10px;
  }

  .label-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;
document.head.appendChild(style);

/* -----------------------------
   Small utilities
----------------------------- */
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
