import { get, post } from "./utils/api.js";

export function initBudget() {
  loadMode();
  loadSummary();
  setupEmojiPicker();

  // Mode toggle
  document.querySelectorAll("input[name='budget-mode']").forEach(radio => {
    radio.addEventListener("change", () => {
      post("/api/budget/mode", { mode: radio.value });
      updateAddButtons(radio.value);
      loadSummary();
    });
  });

  // Add buttons
  document.getElementById("add-category-btn").onclick = () =>
    openSheetModal("Add Category", "category");

  document.getElementById("add-envelope-btn").onclick = () =>
    openSheetModal("Add Envelope", "envelope");

  // Sheet modal buttons
  document.getElementById("sheet-modal-save").onclick = saveItem;
  document.getElementById("sheet-modal-cancel").onclick = closeSheetModal;

  // ⭐ REQUIRED so transactions update the budget UI
  window.refreshBudgetSummary = loadSummary;
}

async function loadMode() {
  const data = await get("/api/budget/mode");
  const radio = document.querySelector(`input[value='${data.mode}']`);
  if (radio) radio.checked = true;
}

async function loadSummary() {
  const container = document.getElementById("budget-content");
  if (!container) return; // <-- prevents all null errors

  const data = await get("/api/budget/summary");
  updateAddButtons(data.mode);

  container.innerHTML =
    data.mode === "simple" ? renderSimple(data) : renderEnvelope(data);

  attachActions();
}

function updateAddButtons(mode) {
  const addCategory = document.getElementById("add-category-btn");
  const addEnvelope = document.getElementById("add-envelope-btn");
  if (!addCategory || !addEnvelope) return;

  // If we're not on the Budget page, just bail out
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
  return `
    <div class="simple-budget">
      ${data.categories
        .map(
          c => `
        <div class="budget-item" 
             data-id="${c.id}" 
             data-name="${c.name}" 
             data-limit="${c.limit}"
             data-emoji="${c.emoji || ""}">
          
          <div class="label-row">
            <div class="icon-box">${c.emoji || "❓"}</div>
            <div class="label">${c.name}</div>

            <div class="item-actions">
              <button class="edit-btn">Edit</button>
              <button class="delete-btn">Delete</button>
            </div>
          </div>

          <div class="bar">
            <div class="fill" style="width:${(c.spent / c.limit) * 100}%"></div>
          </div>

          <div class="numbers">$${c.spent} / $${c.limit}</div>
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
  return `
    <div class="envelope-budget">
      ${data.envelopes
        .map(
          e => `
        <div class="envelope-item" 
             data-id="${e.id}" 
             data-name="${e.name}" 
             data-balance="${e.balance}"
             data-emoji="${e.emoji || ""}">
          
          <div class="label-row">
            <div class="icon-box">${e.emoji || "❓"}</div>
            <div class="label">${e.name}</div>
          </div>

          <div class="right-side">
            <span class="balance">$${e.balance}</span>
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
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.onclick = () => {
      const item = btn.closest("[data-id]");
      const type = item.classList.contains("budget-item")
        ? "category"
        : "envelope";

      const amount = item.dataset.limit ?? item.dataset.balance;
      const emoji = item.dataset.emoji || "";

      openSheetModal(
        type === "category" ? "Edit Category" : "Edit Envelope",
        type,
        item.dataset.id,
        item.dataset.name,
        amount,
        emoji
      );
    };
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = async () => {
      const item = btn.closest("[data-id]");
      const id = item.dataset.id;
      const type = item.classList.contains("budget-item")
        ? "category"
        : "envelope";

      if (!id) return;

      const ok = confirm("Delete this item?");
      if (!ok) return;

      const res = await fetch(`/api/budget/${type}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        console.error("Delete failed", await res.text());
        return;
      }

      loadSummary();
    };
  });
}

/* -----------------------------
   SHEET MODAL OPEN/CLOSE
----------------------------- */
function openSheetModal(title, type, id = "", name = "", amount = "", emoji = "") {
  const sheet = document.getElementById("sheet-modal");

  sheet.dataset.type = type;
  sheet.dataset.id = id;
  sheet.dataset.mode = title.startsWith("Add") ? "add" : "edit";

  document.getElementById("sheet-modal-name").value = name;
  document.getElementById("sheet-modal-amount").value = amount;

  const emojiInput = document.getElementById("modal-emoji");
  const emojiPreview = document.getElementById("emoji-preview");

  emojiInput.value = emoji || "";
  emojiPreview.textContent = emoji || "❓";

  openSheet(sheet);
}

function closeSheetModal() {
  closeSheet(document.getElementById("sheet-modal"));
}

/* -----------------------------
   SAVE
----------------------------- */
let pendingSaveAfterEmoji = false;

async function saveItem() {
  const sheet = document.getElementById("sheet-modal");
  const type = sheet.dataset.type;
  const mode = sheet.dataset.mode;
  const id = sheet.dataset.id;

  const name = document.getElementById("sheet-modal-name").value.trim();
  const amountValue = document.getElementById("sheet-modal-amount").value;
  const amount = Number(amountValue);

  const emoji = document.getElementById("modal-emoji").value.trim();

  if (!name || amountValue.trim() === "" || !Number.isFinite(amount)) return;

  // Require emoji
  if (!emoji) {
    pendingSaveAfterEmoji = true;
    openSheet(document.getElementById("emoji-sheet"));
    return;
  }

  if (mode === "add") {
    const result = await post(`/api/budget/${type}`, {
      name,
      emoji,
      [type === "category" ? "limit" : "balance"]: amount
    });
    if (!result || !result.success) {
      console.error("Save failed", result);
      return;
    }
  } else {
    const res = await fetch(`/api/budget/${type}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        emoji,
        [type === "category" ? "limit" : "balance"]: amount
      })
    });
    if (!res.ok) {
      console.error("Update failed", await res.text());
      return;
    }
  }

  closeSheetModal();
  loadSummary();
}

/* -----------------------------
   BOTTOM SHEET LOGIC
----------------------------- */
function openSheet(sheet) {
  sheet.classList.remove("hidden");
  sheet.classList.add("visible");

  const backdrop = document.getElementById("sheet-backdrop");
  if (backdrop) {
    backdrop.classList.remove("hidden");
    backdrop.classList.add("visible");
  }
}

function closeSheet(sheet) {
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
