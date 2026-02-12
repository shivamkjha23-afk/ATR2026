import { requireAuth, logout, isAdmin } from './auth.js';

function getTheme() {
  return localStorage.getItem('atr_theme') || 'dark';
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', getTheme());
}

function setupThemeToggle() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    localStorage.setItem('atr_theme', getTheme() === 'dark' ? 'light' : 'dark');
    applyTheme();
  });
}

export async function setupProtectedPage() {
  applyTheme();
  setupThemeToggle();

  const user = await requireAuth('./login.html');
  if (!user) return null;

  const loggedEl = document.getElementById('loggedInUser');
  if (loggedEl) loggedEl.textContent = user.email;

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logout();
      window.location.href = './login.html';
    });
  }

  document.querySelectorAll('.admin-only').forEach((el) => {
    el.style.display = isAdmin(user.email) ? 'block' : 'none';
  });

  return user;
}
