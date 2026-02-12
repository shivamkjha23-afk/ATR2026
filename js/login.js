import { login, signup, watchAuth } from './auth.js';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const message = document.getElementById('authMessage');

watchAuth((user) => {
  if (user) window.location.href = './pages/dashboard.html';
});

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    await login(email, password);
    window.location.href = './pages/dashboard.html';
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
