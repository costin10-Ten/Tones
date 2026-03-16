const THEME_LABELS = {
  dark: 'DARK',
  clinical: 'CLIN',
  biohazard: 'BIO',
  fog: 'FOG',
  dossier: 'DOS',
  abyss: 'ABYSS',
  cctv: 'CCTV',
  noir: 'NOIR',
};

function initThemeSwitcher() {
  const switcher = document.getElementById('theme-switcher');
  const toggle = document.getElementById('theme-toggle');
  const dropdown = document.getElementById('theme-dropdown');
  const labelEl = document.getElementById('theme-label');

  if (!switcher || !toggle || !dropdown || !labelEl) return;

  const currentTheme = localStorage.getItem('hz-theme') || 'dark';
  applyTheme(currentTheme);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    dropdown.classList.toggle('open', !isOpen);
    toggle.setAttribute('aria-expanded', String(!isOpen));
  });

  dropdown.querySelectorAll('.theme-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      if (theme) {
        applyTheme(theme);
        dropdown.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!switcher.contains(e.target)) {
      dropdown.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hz-theme', theme);
    if (labelEl) labelEl.textContent = THEME_LABELS[theme] || theme.toUpperCase();

    dropdown.querySelectorAll('.theme-option').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }
}

initThemeSwitcher();
document.addEventListener('astro:after-swap', initThemeSwitcher);
