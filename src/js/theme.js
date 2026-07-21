/* ============================================================
   THEME — Light/Dark mode toggle with localStorage persistence
   ============================================================ */

const THEME_KEY = "qg_tema";

export function initTheme() {
  let tema = "light";
  try {
    tema =
      localStorage.getItem(THEME_KEY) ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
  } catch (e) {
    /* localStorage not available, default to light */
  }
  applyTheme(tema);

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(current === "light" ? "dark" : "light");
    });
  }
}

export function applyTheme(tema) {
  document.documentElement.setAttribute("data-theme", tema);

  const ttSwitch = document.getElementById("ttSwitch");
  if (ttSwitch) {
    ttSwitch.classList.toggle("on", tema === "dark");
  }

  const themeLabel = document.getElementById("themeLabel");
  if (themeLabel) {
    themeLabel.textContent = tema === "dark" ? "Tema Scuro" : "Tema Chiaro";
  }

  try {
    localStorage.setItem(THEME_KEY, tema);
  } catch (e) {
    /* storage unavailable, ignore */
  }
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}
