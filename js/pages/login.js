// \u30ed\u30b0\u30a4\u30f3\u30da\u30fc\u30b8
import { getUsers } from '../store.js';
import { login } from '../auth.js';
import { navigate } from '../router.js';
import { refreshAppShell, showToast, showModal, closeModal } from '../app.js';

// \u30d1\u30b9\u30ef\u30fc\u30c9\u8a2d\u5b9a\uff08\u5148\u751f\u30e2\u30fc\u30c9\u3068\u4fdd\u8b77\u8005\u30e2\u30fc\u30c9\uff09
const ROLE_PASSWORDS = {
  teacher: 'asunaro2026',
  parent: 'hogosya2026',
};

export function renderLogin(container) {
  const users = getUsers();

  container.innerHTML = `
    <div class="login-wrapper">
      <div class="login-bg-orbs">
        <div class="login-orb login-orb-1"></div>
        <div class="login-orb login-orb-2"></div>
        <div class="login-orb login-orb-3"></div>
      </div>
      <div class="login-content animate-fadeIn">
        <div class="login-header">
          <div class="login-logo">\ud83c\udf32</div>
          <h1 class="login-title">\u3042\u3059\u306a\u308d</h1>
          <p class="login-subtitle">\u30aa\u30f3\u30e9\u30a4\u30f3\u5bb6\u5ead\u6559\u5e2b \u5bbf\u984c\u7ba1\u7406\u30a2\u30d7\u30ea</p>
        </div>
        <div class="login-cards">
          ${users.map(user => `
            <button class="login-card" data-user-id="${user.id}" data-role="${user.role}" id="login-${user.id}">
              <div class="login-card-avatar">${user.avatar}</div>
              <div class="login-card-name">${user.name}</div>
              <div class="login-card-role">${getRoleLabel(user.role)}</div>
              ${needsPassword(user.role) ? '<div class="login-card-lock">\ud83d\udd12</div>' : ''}
              <div class="login-card-glow"></div>
            </button>
          `).join('')}
        </div>
        <p class="login-hint">\u30e6\u30fc\u30b6\u30fc\u3092\u9078\u629e\u3057\u3066\u30ed\u30b0\u30a4\u30f3\u3057\u3066\u304f\u3060\u3055\u3044</p>
      </div>
    </div>
  `;

  // \u30ab\u30fc\u30c9\u30af\u30ea\u30c3\u30af\u3067\u30ed\u30b0\u30a4\u30f3
  container.querySelectorAll('.login-card').forEach(card => {
    card.addEventListener('click', () => {
      const userId = card.dataset.userId;
      const role = card.dataset.role;

      if (needsPassword(role)) {
        showPasswordPrompt(userId, card);
      } else {
        // \u30af\u30ea\u30c3\u30af\u30a2\u30cb\u30e1\u30fc\u30b7\u30e7\u30f3
        card.classList.add('login-card-selected');
        setTimeout(() => {
          login(userId);
          refreshAppShell();
          navigate('/dashboard');
        }, 400);
      }
    });
  });
}

function needsPassword(role) {
  return role in ROLE_PASSWORDS;
}

function showPasswordPrompt(userId, card) {
  const formHtml = `
    <form id="password-form" style="display: flex; flex-direction: column; gap: var(--space-4);">
      <p style="color: var(--text-secondary); font-size: var(--text-sm);">\u3053\u306e\u30e2\u30fc\u30c9\u306b\u30ed\u30b0\u30a4\u30f3\u3059\u308b\u306b\u306f\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u5fc5\u8981\u3067\u3059\u3002</p>
      <div class="input-group">
        <label for="login-password">\u30d1\u30b9\u30ef\u30fc\u30c9</label>
        <input class="input" type="password" id="login-password" name="password" placeholder="\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5165\u529b" required autofocus />
      </div>
      <div style="display: flex; gap: var(--space-2); justify-content: flex-end;">
        <button type="button" class="btn btn-secondary" id="pw-cancel">\u30ad\u30e3\u30f3\u30bb\u30eb</button>
        <button type="submit" class="btn btn-primary">\u30ed\u30b0\u30a4\u30f3</button>
      </div>
    </form>
  `;

  showModal(formHtml, { title: '\ud83d\udd12 \u30d1\u30b9\u30ef\u30fc\u30c9\u5165\u529b' });

  document.getElementById('pw-cancel')?.addEventListener('click', closeModal);

  const form = document.getElementById('password-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const password = document.getElementById('login-password').value;
      const user = getUsers().find(u => u.id === userId);
      
      if (user && password === ROLE_PASSWORDS[user.role]) {
        closeModal();
        card.classList.add('login-card-selected');
        setTimeout(() => {
          login(userId);
          refreshAppShell();
          navigate('/dashboard');
        }, 400);
      } else {
        showToast('\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u6b63\u3057\u304f\u3042\u308a\u307e\u305b\u3093', 'error');
      }
    });
  }
}

function getRoleLabel(role) {
  switch (role) {
    case 'teacher': return '\ud83c\udf4e \u6559\u5e2b';
    case 'student': return '\ud83d\udcda \u751f\u5f92';
    case 'parent': return '\ud83d\udc68\u200d\ud83d\udc69\u200d\ud83d\udc67\u200d\ud83d\udc66 \u4fdd\u8b77\u8005';
    default: return '';
  }
}
