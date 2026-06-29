const keys = {};
const justReleased = {};

// ── Teclado ──────────────────────────────

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
});

window.addEventListener("keyup", e => {
  const k = e.key.toLowerCase();
  keys[k]         = false;
  justReleased[k] = true;
});

// ── Touch buttons ─────────────────────────

document.querySelectorAll(".touch-btn").forEach(btn => {

  const lane = btn.dataset.lane;

  btn.addEventListener("touchstart", e => {
    e.preventDefault();
    keys[lane] = true;
    btn.classList.add("active");
  }, { passive: false });

  btn.addEventListener("touchend", e => {
    e.preventDefault();
    keys[lane]         = false;
    justReleased[lane] = true;
    btn.classList.remove("active");
  }, { passive: false });

  btn.addEventListener("touchcancel", () => {
    keys[lane]         = false;
    justReleased[lane] = true;
    btn.classList.remove("active");
  });

});

// ── Exports ───────────────────────────────

export function isPressed(k) {
  return !!keys[k.toLowerCase()];
}

export function wasReleased(k) {
  return !!justReleased[k.toLowerCase()];
}

export function clearReleased() {
  Object.keys(justReleased).forEach(k => {
    delete justReleased[k];
  });
}