export function qs(selector) {
  return document.querySelector(selector);
}

export function qsa(selector) {
  return document.querySelectorAll(selector);
}

export function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

export function on(selector, event, handler) {
  const el = document.querySelector(selector);
  if (el) el.addEventListener(event, handler);
}

export function animateCounter(id, endValue, duration = 1200) {
  const el = document.getElementById(id);
  if (!el) return;

  let start = 0;
  const increment = endValue / (duration / 16);

  function update() {
    start += increment;
    if (start >= endValue) {
      el.innerText = "$" + endValue.toLocaleString();
    } else {
      el.innerText = "$" + Math.floor(start).toLocaleString();
      requestAnimationFrame(update);
    }
  }

  update();
}
