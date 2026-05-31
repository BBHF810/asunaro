// ログインページ
import { getUsers } from '../store.js';
import { login } from '../auth.js';
import { navigate } from '../router.js';
import { refreshAppShell } from '../app.js';

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
          <div class="login-logo">🌲</div>
          <h1 class="login-title">あすなろ</h1>
          <p class="login-subtitle">オンライン家庭教師 宿題管理アプリ</p>
        </div>
        <div class="login-cards">
          ${users.map(user => `
            <button class="login-card" data-user-id="${user.id}" id="login-${user.id}">
              <div class="login-card-avatar">${user.avatar}</div>
              <div class="login-card-name">${user.name}</div>
              <div class="login-card-role">${getRoleLabel(user.role)}</div>
              <div class="login-card-glow"></div>
            </button>
          `).join('')}
        </div>
        <p class="login-hint">ユーザーを選択してログインしてください</p>
      </div>
    </div>
  `;

  // カードクリックでログイン
  container.querySelectorAll('.login-card').forEach(card => {
    card.addEventListener('click', () => {
      const userId = card.dataset.userId;
      // クリックアニメーション
      card.classList.add('login-card-selected');
      setTimeout(() => {
        login(userId);
        refreshAppShell();
        navigate('/dashboard');
      }, 400);
    });
  });
}

function getRoleLabel(role) {
  switch (role) {
    case 'teacher': return '🍎 教師';
    case 'student': return '📚 生徒';
    case 'parent': return '👨‍👩‍👧‍👦 保護者';
    default: return '';
  }
}
