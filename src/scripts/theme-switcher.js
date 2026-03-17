const THEMES = ['dark', 'clinical', 'biohazard', 'fog', 'dossier', 'abyss', 'cctv', 'noir'];
const LABELS = { dark: 'DARK', clinical: 'CLIN', biohazard: 'BIO', fog: 'FOG', dossier: 'DOS', abyss: 'ABYSS', cctv: 'CCTV', noir: 'NOIR' };

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('hz-theme', theme); } catch (_) {}
  const labelEl = document.getElementById('theme-label');
  if (labelEl) labelEl.textContent = LABELS[theme] || theme.toUpperCase();
}

function initThemeSwitcher() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  // Restore saved theme on init
  let saved = 'dark';
  try { saved = localStorage.getItem('hz-theme') || 'dark'; } catch (_) {}
  applyTheme(saved);

  // Replace node to drop any previous event listeners (safe after astro:after-swap)
  const btn = toggle.cloneNode(true);
  toggle.replaceWith(btn);

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const idx = THEMES.indexOf(current);
    applyTheme(THEMES[(idx + 1) % THEMES.length]);
  });
}

initThemeSwitcher();
document.addEventListener('astro:after-swap', initThemeSwitcher);
