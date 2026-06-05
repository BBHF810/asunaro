/**
 * router.js - Hash-based SPAルーター
 * 「あすなろ」オンライン家庭教師 宿題管理Webアプリ
 */

import { isLoggedIn, canAccess } from './auth.js';
import { showToast } from './app.js';

const routes = {};
let currentPath = null;

// アニメーション設定
const TRANSITION_DURATION = 200; // ms

/**
 * ルート登録
 */
export function addRoute(path, config) {
  routes[path] = config;
}

/**
 * プログラマティックなナビゲーション
 */
export function navigate(path) {
  window.location.hash = `#${path}`;
}

/**
 * 現在のルートパスを取得
 */
export function getCurrentRoute() {
  return currentPath;
}

/**
 * ルーター初期化
 */
export function initRouter() {
  window.addEventListener('hashchange', () => handleRoute());
  handleRoute();
}

/**
 * ルート処理
 */
async function handleRoute() {
  const hash = window.location.hash || '';
  // パスとクエリを分離
  const fullPath = hash.replace('#', '') || '/login';
  const path = fullPath.split('?')[0];

  const route = routes[path];

  // 未登録ルート
  if (!route) {
    if (isLoggedIn()) {
      navigate('/dashboard');
      setTimeout(() => showToast('ページが見つかりませんでした', 'warning'), 100);
    } else {
      navigate('/login');
    }
    return;
  }

  // ログインページへのアクセス（ログイン済みならダッシュボードへ）
  if (path === '/login' && isLoggedIn()) {
    navigate('/dashboard');
    return;
  }

  // 認証チェック（publicルート以外）
  if (!route.public) {
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    // ロールベースのアクセス制御
    if (route.roles && route.roles.length > 0 && !canAccess(route.roles)) {
      navigate('/dashboard');
      return;
    }
  }

  // コンテナを取得
  const container = document.getElementById('page-content');
  if (!container) {
    // ログインページの場合、#app直下にレンダリング
    const app = document.getElementById('app');
    if (app && path === '/login') {
      app.innerHTML = '<div id="page-content" class="login-page"></div>';
      const loginContainer = document.getElementById('page-content');
      if (loginContainer) {
        currentPath = path;
        try {
          await route.render(loginContainer);
        } catch (err) {
          console.error('Render error:', err);
        }
      }
    }
    return;
  }

  // ページ遷移アニメーション
  container.style.transition = `opacity ${TRANSITION_DURATION}ms ease`;
  container.style.opacity = '0';

  await new Promise(resolve => setTimeout(resolve, TRANSITION_DURATION));

  currentPath = path;

  try {
    await route.render(container);
  } catch (err) {
    console.error(`Router: ページ "${path}" のレンダリングに失敗しました:`, err);
    container.innerHTML = `
      <div style="text-align:center; padding:2rem; color:#E74C3C;">
        <h2>エラーが発生しました</h2>
        <p>${err.message}</p>
      </div>
    `;
  }

  // フェードイン
  requestAnimationFrame(() => {
    container.style.opacity = '1';
  });
}
