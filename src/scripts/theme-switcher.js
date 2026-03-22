const THEMES_ALL  = ['dark', 'clinical', 'biohazard', 'fog', 'dossier', 'abyss', 'cctv', 'noir'];
const THEMES_FREE = ['dark', 'dossier'];
const LABELS = { dark: 'DARK', clinical: 'CLIN', biohazard: 'BIO', fog: 'FOG', dossier: 'DOS', abyss: 'ABYSS', cctv: 'CCTV', noir: 'NOIR' };

// Check Clerk login state via __client_uat cookie (non-zero = logged in)
function isMember() {
  try {
    const uat = document.cookie.split(';').find(c => c.trim().startsWith('__client_uat='));
    return uat ? uat.split('=')[1].trim() !== '0' : false;
  } catch { return false; }
}

function getThemes() {
  return isMember() ? THEMES_ALL : THEMES_FREE;
}

function applyTheme(theme) {
  const allowed = getThemes();
  const safe = allowed.includes(theme) ? theme : 'dark';
  document.documentElement.setAttribute('data-theme', safe);
  try { localStorage.setItem('hz-theme', safe); } catch (_) {}
  const labelEl = document.getElementById('theme-label');
  if (labelEl) labelEl.textContent = LABELS[safe] || safe.toUpperCase();
}

function initThemeSwitcher() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  // Restore saved theme (enforce membership restriction)
  let saved = 'dark';
  try { saved = localStorage.getItem('hz-theme') || 'dark'; } catch (_) {}
  applyTheme(saved);

  // Replace node to drop any previous event listeners (safe after astro:after-swap)
  const btn = toggle.cloneNode(true);
  toggle.replaceWith(btn);

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const themes = getThemes();
    const idx = themes.indexOf(current);
    // If current theme not in allowed list (e.g. set while logged in), restart from 0
    applyTheme(themes[(idx < 0 ? 0 : idx + 1) % themes.length]);
  });
}

initThemeSwitcher();
document.addEventListener('astro:after-swap', initThemeSwitcher);
