let currentMode = "simple";

/**
 * Get the current in-memory budget mode.
 * @returns {"simple"|"envelope"}
 */
function getBudgetMode() {
  return currentMode;
}

/**
 * Update the current in-memory budget mode.
 * @param {"simple"|"envelope"} mode
 */
function setBudgetMode(mode) {
  currentMode = mode;
}

module.exports = {
  getBudgetMode,
  setBudgetMode
};
