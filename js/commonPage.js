import { requireAuth, logout } from './auth.js';

export async function setupProtectedPage() {
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
  return user;
}
