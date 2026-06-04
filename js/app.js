// あすなろ - メインアプリケーション
import { initStore, storeReadyPromise } from './store.js';
import { initRouter, addRoute, navigate } from './router.js';
import { restoreSession, isLoggedIn, getCurrentUser, logout } from './auth.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderSchedule } from './pages/schedule.js';
import { renderHomework } from './pages/homework.js';
import { renderTests } from './pages/tests.js';
import { renderStudyTime } from './pages/study-time.js';
import { renderStats } from './pages/stats.js';
import { renderSettings } from './pages/settings.js';
import { renderSidebar } from './components/sidebar.js';

// アプリ初期化
async function initApp() {
  initStore();
  restoreSession();
  registerRoutes();
  renderAppShell();
  
  // データがロードされるのを待つ
  await storeReadyPromise;
  
  initRouter();
}

// ルート登録
function registerRoutes() {
  addRoute('/login', {
    title: 'ログイン',
    render: renderLogin,
    public: true,
  });

  addRoute('/dashboard', {
    title: 'ダッシュボード',
    render: renderDashboard,
    roles: ['teacher', 'student', 'parent'],
  });

  addRoute('/schedule', {
    title: '週間予定表',
    render: renderSchedule,
    roles: ['teacher', 'student', 'parent'],
  });

  addRoute('/homework', {
    title: '宿題管理',
    render: renderHomework,
    roles: ['teacher', 'student'],
  });

  addRoute('/tests', {
    title: 'テスト結果',
    render: renderTests,
    roles: ['teacher', 'student', 'parent'],
  });

  addRoute('/study-time', {
    title: '勉強時間',
    render: renderStudyTime,
    roles: ['teacher', 'student', 'parent'],
  });

  addRoute('/stats', {
    title: '学習統計',
    render: renderStats,
    roles: ['teacher', 'student', 'parent'],
  });

  addRoute('/settings', {
    title: '設定',
    render: renderSettings,
    roles: ['teacher', 'student', 'parent'],
  });
}

// アプリシェルのレンダリング
function renderAppShell() {
  const app = document.getElementById('app');
  if (!isLoggedIn()) {
    app.innerHTML = `<div id="page-content" class="login-page"></div>`;
    return;
  }

  app.innerHTML = `
    <div class="app-container">
      <aside id="sidebar" class="sidebar"></aside>
      <main class="main-content">
        <header id="app-header" class="header"></header>
        <div id="page-content" class="page-content animate-fadeIn"></div>
      </main>
    </div>
  `;

  renderSidebar(document.getElementById('sidebar'));
  renderHeader();
}

// ヘッダーのレンダリング
function renderHeader() {
  const header = document.getElementById('app-header');
  if (!header) return;

  const user = getCurrentUser();
  header.innerHTML = `
    <div class="header-left">
      <button id="sidebar-toggle" class="btn-icon sidebar-toggle" aria-label="メニュー">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <h1 id="page-title" class="page-title"></h1>
    </div>
    <div class="header-right">
      <div class="header-user" id="header-user">
        <span class="header-user-avatar">${user?.avatar || '👤'}</span>
        <span class="header-user-name">${user?.name || ''}</span>
      </div>
      <button id="logout-btn" class="btn btn-ghost btn-sm" title="ログアウト">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
    </div>
  `;

  // イベントリスナー
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
    renderAppShell();
    navigate('/login');
  });

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });
}

// ページタイトルの更新
export function updatePageTitle(title) {
  const el = document.getElementById('page-title');
  if (el) el.textContent = title;
  document.title = `${title} | あすなろ`;
}

// アプリシェルの再レンダリング（ログイン/ログアウト時に呼ばれる）
export function refreshAppShell() {
  renderAppShell();
}

// トースト通知
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-slideUp`;
  toast.innerHTML = `
    <span class="toast-icon">${getToastIcon(type)}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function fireConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E74C3C', '#4A90D9', '#2ECC71', '#F39C12', '#9B59B6']
    });
  }
}

function getToastIcon(type) {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✗';
    case 'warning': return '⚠';
    default: return 'ℹ';
  }
}

// モーダル表示
export function showModal(content, options = {}) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay animate-fadeIn';
  modal.innerHTML = `
    <div class="modal animate-scaleIn ${options.size || ''}">
      ${options.title ? `<div class="modal-header"><h2>${options.title}</h2><button class="btn-icon modal-close" aria-label="閉じる">✕</button></div>` : ''}
      <div class="modal-body">${content}</div>
      ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
    </div>
  `;

  container.appendChild(modal);

  // activeクラスを追加してCSSのvisibility:hiddenを解除（次フレームで追加してトランジションを有効化）
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });

  // 閉じるボタン
  modal.querySelector('.modal-close')?.addEventListener('click', () => closeModal());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  return modal;
}

export function closeModal() {
  const container = document.getElementById('modal-container');
  const overlay = container?.querySelector('.modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 300);
  }
}

// DOM Ready
document.addEventListener('DOMContentLoaded', initApp);
