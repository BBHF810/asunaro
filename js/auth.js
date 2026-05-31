/**
 * auth.js - ユーザー認証モジュール
 * 「あすなろ」オンライン家庭教師 宿題管理Webアプリ
 */

import { getUser } from './store.js';

const SESSION_KEY = 'asunaro_session';
let currentUser = null;

/**
 * ログイン
 * @param {string} userId - ユーザーID
 * @returns {object|null} ログインしたユーザー情報
 */
export function login(userId) {
  const user = getUser(userId);
  if (!user) return null;

  sessionStorage.setItem(SESSION_KEY, userId);
  currentUser = user;
  return user;
}

/**
 * ログアウト（sessionStorageクリア、ログインページへ遷移）
 */
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  currentUser = null;
  // ログインページへ遷移
  window.location.hash = '#/login';
}

/**
 * 現在のユーザー取得
 * @returns {object|null} 現在のユーザー情報
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * ログイン状態チェック
 * @returns {boolean} ログイン中かどうか
 */
export function isLoggedIn() {
  return currentUser !== null;
}

/**
 * 教師かチェック
 * @returns {boolean}
 */
export function isTeacher() {
  return currentUser?.role === 'teacher';
}

/**
 * 生徒かチェック
 * @returns {boolean}
 */
export function isStudent() {
  return currentUser?.role === 'student';
}

/**
 * 保護者かチェック
 * @returns {boolean}
 */
export function isParent() {
  return currentUser?.role === 'parent';
}

/**
 * 現在のロール取得
 * @returns {string|null} ロール名
 */
export function getRole() {
  return currentUser?.role || null;
}

/**
 * セッション復元（ページリロード時）
 * @returns {object|null} 復元されたユーザー情報
 */
export function restoreSession() {
  const userId = sessionStorage.getItem(SESSION_KEY);
  if (!userId) {
    currentUser = null;
    return null;
  }

  const user = getUser(userId);
  if (!user) {
    sessionStorage.removeItem(SESSION_KEY);
    currentUser = null;
    return null;
  }

  currentUser = user;
  return user;
}

/**
 * アクセス権チェック
 * @param {Array<string>} roles - 許可されたロールの配列
 * @returns {boolean} アクセス可能かどうか
 */
export function canAccess(roles) {
  if (!roles || roles.length === 0) return true; // rolesが未指定なら全員可
  if (!currentUser) return false;
  return roles.includes(currentUser.role);
}
