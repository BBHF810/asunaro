// サイドバーナビゲーションコンポーネント
import { getCurrentUser } from '../auth.js';
import { navigate, getCurrentRoute } from '../router.js';

const NAV_ITEMS = {
  teacher: [
    { path: '/dashboard', icon: '🏠', label: 'ダッシュボード' },
    { path: '/schedule', icon: '📅', label: '週間予定表' },
    { path: '/homework', icon: '📝', label: '宿題管理' },
    { path: '/tests', icon: '📊', label: 'テスト結果' },
    { path: '/study-time', icon: '⏱️', label: '勉強時間' },
    { path: '/questions', icon: '❓', label: '疑問箱' },
    { path: '/stats', icon: '📈', label: '学習統計' },
    { path: '/settings', icon: '⚙️', label: '設定' },
  ],
  student: [
    { path: '/dashboard', icon: '🏠', label: 'ダッシュボード' },
    { path: '/schedule', icon: '📅', label: '週間予定表' },
    { path: '/homework', icon: '📝', label: '宿題管理' },
    { path: '/tests', icon: '📊', label: 'テスト結果' },
    { path: '/study-time', icon: '⏱️', label: '勉強時間' },
    { path: '/questions', icon: '❓', label: '疑問箱' },
    { path: '/stats', icon: '📈', label: '学習統計' },
    { path: '/settings', icon: '⚙️', label: '設定' },
  ],
  parent: [
    { path: '/dashboard', icon: '🏠', label: 'ダッシュボード' },
    { path: '/schedule', icon: '📅', label: '週間予定表' },
    { path: '/tests', icon: '📊', label: 'テスト結果' },
    { path: '/study-time', icon: '⏱️', label: '勉強時間' },
    { path: '/stats', icon: '📈', label: '学習統計' },
    { path: '/settings', icon: '⚙️', label: '設定' },
  ],
};

export function renderSidebar(container) {
  if (!container) return;

  const user = getCurrentUser();
  const role = user?.role || 'student';
  const items = NAV_ITEMS[role] || NAV_ITEMS.student;
  const currentPath = getCurrentRoute();

  container.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <span class="sidebar-logo-icon">🌲</span>
        <span class="sidebar-logo-text">あすなろ</span>
      </div>
      <button class="btn-icon sidebar-close" id="sidebar-close" aria-label="閉じる">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div class="sidebar-user">
      <div class="avatar avatar-md">${user?.avatar || '👤'}</div>
      <div class="sidebar-user-info">
        <span class="sidebar-user-name">${user?.name || 'ゲスト'}</span>
        <span class="sidebar-user-role">${getRoleLabel(role)}</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      ${items.map(item => `
        <a href="#${item.path}"
           class="sidebar-nav-item ${currentPath === item.path ? 'active' : ''}"
           data-path="${item.path}"
           id="nav-${item.path.slice(1)}">
          <span class="sidebar-nav-icon">${item.icon}</span>
          <span class="sidebar-nav-label">${item.label}</span>
        </a>
      `).join('')}
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-version">v1.0.0</div>
    </div>
  `;

  // イベントリスナー
  container.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const path = item.dataset.path;
      navigate(path);
      updateActiveItem(container, path);
      // モバイルではサイドバーを閉じる
      container.classList.remove('open');
    });
  });

  document.getElementById('sidebar-close')?.addEventListener('click', () => {
    container.classList.remove('open');
  });
}

function updateActiveItem(container, path) {
  container.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.path === path);
  });
}

function getRoleLabel(role) {
  switch (role) {
    case 'teacher': return '教師';
    case 'student': return '生徒';
    case 'parent': return '保護者';
    default: return '';
  }
}

// サイドバーのアクティブアイテムを外部から更新
export function updateSidebarActive(path) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) updateActiveItem(sidebar, path);
}
