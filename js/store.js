/**
 * store.js - Firestoreベースのリアクティブデータストア（ローカルキャッシュ付き）
 * 「あすなろ」オンライン家庭教師 宿題管理Webアプリ
 */

import { db } from './firebase.js';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

// データモデルの初期値
const DEFAULT_DATA = {
  users: [
    { id: 'teacher', name: '先生', role: 'teacher', avatar: '🍎' },
    { id: 'student1', name: '生徒1', role: 'student', avatar: '📚' },
    { id: 'student2', name: '生徒2', role: 'student', avatar: '✏️' },
    { id: 'parent', name: '保護者', role: 'parent', avatar: '👨‍👩‍👧‍👦' }
  ],
  weeklyPlans: [],
  assignments: [],
  testResults: [],
  studyLogs: [],
  settings: {
    lessonDays: [
      { dayOfWeek: 2, time: '19:00' },
      { dayOfWeek: 5, time: '19:00' }
    ],
    subjects: ['英語', '数学', '国語', '理科', '社会'],
    subjectColors: {
      '英語': '#4A90D9',
      '数学': '#E74C3C',
      '国語': '#2ECC71',
      '理科': '#9B59B6',
      '社会': '#F39C12'
    }
  }
};

let localState = structuredClone(DEFAULT_DATA);
let isInitialized = false;
let initPromiseResolve = null;
let storeReady = false;

// initStoreが完了するまで待てるPromise
export const storeReadyPromise = new Promise((resolve) => {
  initPromiseResolve = resolve;
});

// イベントターゲット（カスタムイベント用）
const storeEventTarget = new EventTarget();

// ========================================
// ストア基本操作
// ========================================

/**
 * ストア初期化（FirestoreのonSnapshotをセットアップ）
 */
export function initStore() {
  if (isInitialized) return;
  isInitialized = true;

  const collections = ['users', 'weeklyPlans', 'assignments', 'testResults', 'studyLogs'];
  let loadedCount = 0;
  const totalToLoad = collections.length + 1; // +1 for settings

  collections.forEach(colName => {
    onSnapshot(collection(db, colName), (snapshot) => {
      localState[colName] = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      emitDataChange(colName, { action: 'sync' });
      loadedCount++;
      checkReady(loadedCount, totalToLoad);
    }, (error) => {
      console.error(`Firestore listen error on ${colName}:`, error);
      loadedCount++;
      checkReady(loadedCount, totalToLoad);
    });
  });

  // Settings document
  onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
    if (docSnap.exists()) {
      localState.settings = docSnap.data();
    } else {
      // 初回起動時など設定がない場合は初期設定を保存
      setDoc(doc(db, 'settings', 'global'), DEFAULT_DATA.settings);
      localState.settings = structuredClone(DEFAULT_DATA.settings);
    }
    emitDataChange('settings', { action: 'sync' });
    loadedCount++;
    checkReady(loadedCount, totalToLoad);
  }, (error) => {
    console.error('Firestore listen error on settings:', error);
    loadedCount++;
    checkReady(loadedCount, totalToLoad);
  });

  // Usersの初期化チェック（一度だけ）
  getDoc(doc(db, 'users', 'teacher')).then((docSnap) => {
    if (!docSnap.exists()) {
      DEFAULT_DATA.users.forEach(u => {
        setDoc(doc(db, 'users', u.id), u);
      });
    }
  }).catch(err => {
    console.warn('Users init check failed:', err);
  });
}

function checkReady(count, total) {
  if (!storeReady && count >= total) {
    storeReady = true;
    if (initPromiseResolve) {
      initPromiseResolve();
    }
  }
}

/**
 * 全データ取得（ローカルキャッシュから）
 * @returns {object} ストア全体のデータ
 */
export function getData() {
  if (!isInitialized) initStore();
  return localState;
}

/**
 * 全データ保存（非推奨・インポート時のみ使用）
 */
export function saveData(data) {
  const collections = ['users', 'weeklyPlans', 'assignments', 'testResults', 'studyLogs'];
  const promises = [];
  collections.forEach(colName => {
    if (data[colName]) {
      data[colName].forEach(item => {
        promises.push(setDoc(doc(db, colName, item.id), item));
      });
    }
  });
  if (data.settings) {
    promises.push(setDoc(doc(db, 'settings', 'global'), data.settings));
  }
  return Promise.all(promises);
}

/**
 * ユニークID生成
 */
export function generateId() {
  return doc(collection(db, 'dummy')).id;
}

// ========================================
// ユーザー管理
// ========================================

export function getUsers() {
  return getData().users;
}

export function getUser(id) {
  // ローカルキャッシュにまだデータがない場合はデフォルトから探す
  const found = getData().users.find(u => u.id === id);
  if (found) return found;
  return DEFAULT_DATA.users.find(u => u.id === id);
}

export function updateUser(id, updates) {
  updateDoc(doc(db, 'users', id), updates);
  const user = localState.users.find(u => u.id === id);
  if (user) Object.assign(user, updates);
  return user;
}

export function getStudents() {
  const students = getData().users.filter(u => u.role === 'student');
  // まだFirestoreからデータが来ていない場合はデフォルトを返す
  if (students.length === 0) {
    return DEFAULT_DATA.users.filter(u => u.role === 'student');
  }
  return students;
}

// ========================================
// 週間予定
// ========================================

export function getWeeklyPlan(studentId, weekStart) {
  return getData().weeklyPlans.find(
    p => p.studentId === studentId && p.weekStart === weekStart
  );
}

export function saveWeeklyPlan(plan) {
  const existing = getWeeklyPlan(plan.studentId, plan.weekStart);
  if (existing) {
    const merged = { ...existing, ...plan };
    setDoc(doc(db, 'weeklyPlans', existing.id), merged);
    // 楽観的UI更新
    const idx = localState.weeklyPlans.findIndex(p => p.id === existing.id);
    if (idx >= 0) localState.weeklyPlans[idx] = merged;
    return merged;
  } else {
    plan.id = plan.id || generateId();
    setDoc(doc(db, 'weeklyPlans', plan.id), plan);
    // 楽観的UI更新
    localState.weeklyPlans.push(plan);
    return plan;
  }
}

export function getWeeklyPlans(studentId) {
  return getData().weeklyPlans.filter(p => p.studentId === studentId);
}

// ========================================
// 宿題管理
// ========================================

export function getAssignments(studentId, filters = {}) {
  let assignments = getData().assignments.filter(a => a.studentId === studentId);

  if (filters.status) assignments = assignments.filter(a => a.status === filters.status);
  if (filters.subject) assignments = assignments.filter(a => a.subject === filters.subject);
  if (filters.dueDate) assignments = assignments.filter(a => a.dueDate === filters.dueDate);

  return assignments;
}

export function addAssignment(assignment) {
  assignment.id = assignment.id || generateId();
  assignment.status = assignment.status || 'pending';
  assignment.createdAt = assignment.createdAt || new Date().toISOString();
  setDoc(doc(db, 'assignments', assignment.id), assignment);
  // 楽観的UI更新
  localState.assignments.push(assignment);
  emitDataChange('assignments', { action: 'add' });
  return assignment;
}

export function updateAssignment(id, updates) {
  updates.updatedAt = new Date().toISOString();
  updateDoc(doc(db, 'assignments', id), updates);
  // 楽観的UI更新
  const idx = localState.assignments.findIndex(a => a.id === id);
  if (idx >= 0) Object.assign(localState.assignments[idx], updates);
  emitDataChange('assignments', { action: 'update' });
  return { id, ...updates };
}

export function deleteAssignment(id) {
  deleteDoc(doc(db, 'assignments', id));
  // 楽観的UI更新
  localState.assignments = localState.assignments.filter(a => a.id !== id);
  emitDataChange('assignments', { action: 'delete' });
  return true;
}

// ========================================
// テスト結果
// ========================================

export function getTestResults(studentId, subject) {
  let results = getData().testResults.filter(r => r.studentId === studentId);
  if (subject) results = results.filter(r => r.subject === subject);
  return results;
}

export function addTestResult(result) {
  result.id = result.id || generateId();
  result.createdAt = result.createdAt || new Date().toISOString();
  setDoc(doc(db, 'testResults', result.id), result);
  // 楽観的UI更新
  localState.testResults.push(result);
  emitDataChange('testResults', { action: 'add' });
  return result;
}

export function updateTestResult(id, updates) {
  updateDoc(doc(db, 'testResults', id), updates);
  // 楽観的UI更新
  const idx = localState.testResults.findIndex(r => r.id === id);
  if (idx >= 0) Object.assign(localState.testResults[idx], updates);
  emitDataChange('testResults', { action: 'update' });
  return { id, ...updates };
}

export function deleteTestResult(id) {
  deleteDoc(doc(db, 'testResults', id));
  // 楽観的UI更新
  localState.testResults = localState.testResults.filter(r => r.id !== id);
  emitDataChange('testResults', { action: 'delete' });
  return true;
}

// ========================================
// 勉強ログ
// ========================================

export function getStudyLogs(studentId, dateRange) {
  let logs = getData().studyLogs.filter(l => l.studentId === studentId);

  if (dateRange) {
    if (dateRange.from) logs = logs.filter(l => l.date >= dateRange.from);
    if (dateRange.to) logs = logs.filter(l => l.date <= dateRange.to);
  }

  return logs;
}

export function addStudyLog(log) {
  log.id = log.id || generateId();
  log.createdAt = log.createdAt || new Date().toISOString();
  setDoc(doc(db, 'studyLogs', log.id), log);
  // 楽観的UI更新
  localState.studyLogs.push(log);
  emitDataChange('studyLogs', { action: 'add' });
  return log;
}

export function getStudyStats(studentId) {
  const logs = getStudyLogs(studentId);
  const totalMinutes = logs.reduce((sum, l) => sum + (l.duration || 0), 0);

  const bySubject = {};
  logs.forEach(l => {
    if (!bySubject[l.subject]) bySubject[l.subject] = 0;
    bySubject[l.subject] += l.duration || 0;
  });

  const byDate = {};
  logs.forEach(l => {
    if (!byDate[l.date]) byDate[l.date] = 0;
    byDate[l.date] += l.duration || 0;
  });

  const today = formatDate(new Date());
  const todayMinutes = byDate[today] || 0;

  const weekStart = getWeekStart(new Date());
  const weekLogs = getStudyLogs(studentId, { from: weekStart, to: today });
  const weekMinutes = weekLogs.reduce((sum, l) => sum + (l.duration || 0), 0);

  const streak = calcStreak(byDate);

  return { totalMinutes, todayMinutes, weekMinutes, bySubject, byDate, streak };
}

function calcStreak(byDate) {
  const dates = Object.keys(byDate).sort().reverse();
  if (dates.length === 0) return 0;

  const today = formatDate(new Date());
  const yesterday = formatDate(new Date(Date.now() - 86400000));

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    const current = new Date(dates[i]);
    const prev = new Date(dates[i + 1]);
    const diffDays = (current - prev) / 86400000;

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ========================================
// 設定
// ========================================

export function getSettings() {
  return getData().settings;
}

export function updateSettings(updates) {
  // setDoc with merge-like behavior
  const merged = { ...localState.settings, ...updates };
  setDoc(doc(db, 'settings', 'global'), merged);
  // 楽観的UI更新
  localState.settings = merged;
  emitDataChange('settings', { action: 'update' });
  return merged;
}

// ========================================
// ユーティリティ
// ========================================

export function exportData() {
  return JSON.stringify(localState, null, 2);
}

export function importData(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { success: false, error: '無効なJSONフォーマットです。' };
  }

  const requiredKeys = ['users', 'weeklyPlans', 'assignments', 'testResults', 'studyLogs', 'settings'];
  for (const key of requiredKeys) {
    if (!(key in parsed)) return { success: false, error: `必須フィールド "${key}" が見つかりません。` };
  }

  saveData(parsed);
  return { success: true };
}

export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}

export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ========================================
// イベント
// ========================================

export function onDataChange(callback) {
  const handler = (e) => callback(e.detail);
  storeEventTarget.addEventListener('dataChange', handler);
  return () => storeEventTarget.removeEventListener('dataChange', handler);
}

export function emitDataChange(type, data) {
  const event = new CustomEvent('dataChange', {
    detail: { type, ...data, timestamp: Date.now() }
  });
  storeEventTarget.dispatchEvent(event);
}
