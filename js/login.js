import { login, signup, loginWithGoogle, watchAuth } from './auth.js';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const message = document.getElementById('authMessage');

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

function setupAuthSwitch() {
  document.querySelectorAll('.auth-switch .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.auth-switch .tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.target;
      document.getElementById('loginPanel').classList.toggle('hidden', target !== 'loginPanel');
      document.getElementById('signupPanel').classList.toggle('hidden', target !== 'signupPanel');
    });
  });
}

watchAuth((user) => {
  if (user) window.location.href = './dashboard.html';
});

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    await login(email, password);
    window.location.href = './dashboard.html';
  } catch (error) {
    message.textContent = error.message;
  }
});

document.getElementById('googleLoginBtn')?.addEventListener('click', async () => {
  try {
    await loginWithGoogle();
    window.location.href = './dashboard.html';
  } catch (error) {
    message.textContent = error.message;
  }
});

signupForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;

  try {
    await signup(email, password);
    message.textContent = 'Account created. You can now login.';
    signupForm.reset();
  } catch (error) {
    message.textContent = error.message;
  }
});

applyTheme();
setupThemeToggle();
setupAuthSwitch();
