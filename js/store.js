/**
 * store.js - localStorageベースのリアクティブデータストア
 * 「あすなろ」オンライン家庭教師 宿題管理Webアプリ
 */

// ストアの初期化
const STORAGE_KEY = 'asunaro_data';

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
  questions: [],
  settings: {
    lessonDays: [
      { dayOfWeek: 2, time: '19:00' },  // 火曜
      { dayOfWeek: 5, time: '19:00' }   // 金曜
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

// イベントターゲット（カスタムイベント用）
const storeEventTarget = new EventTarget();

// ========================================
// ストア基本操作
// ========================================

/**
 * ストア初期化（localStorageから読み込み、なければDEFAULT_DATA）
 */
export function initStore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    saveData(structuredClone(DEFAULT_DATA));
    return;
  }
  try {
    JSON.parse(raw);
  } catch {
    // 破損データの場合は初期データで上書き
    saveData(structuredClone(DEFAULT_DATA));
  }
}

/**
 * 全データ取得
 * @returns {object} ストア全体のデータ
 */
export function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    initStore();
    return structuredClone(DEFAULT_DATA);
  }
  try {
    return JSON.parse(raw);
  } catch {
    initStore();
    return structuredClone(DEFAULT_DATA);
  }
}

/**
 * 全データ保存
 * @param {object} data - 保存するデータ
 */
export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * ユニークID生成（timestamp + random）
 * @returns {string} ユニークID
 */
export function generateId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}`;
}

// ========================================
// ユーザー管理
// ========================================

/**
 * 全ユーザー取得
 * @returns {Array} ユーザー一覧
 */
export function getUsers() {
  return getData().users;
}

/**
 * 特定ユーザー取得
 * @param {string} id - ユーザーID
 * @returns {object|undefined} ユーザー情報
 */
export function getUser(id) {
  return getData().users.find(u => u.id === id);
}

/**
 * ユーザー更新
 * @param {string} id - ユーザーID
 * @param {object} updates - 更新内容
 * @returns {object|null} 更新されたユーザー
 */
export function updateUser(id, updates) {
  const data = getData();
  const index = data.users.findIndex(u => u.id === id);
  if (index === -1) return null;

  data.users[index] = { ...data.users[index], ...updates, id }; // idの上書きを防止
  saveData(data);
  emitDataChange('users', { action: 'update', id });
  return data.users[index];
}

/**
 * 生徒のみ取得
 * @returns {Array} 生徒一覧
 */
export function getStudents() {
  return getData().users.filter(u => u.role === 'student');
}

// ========================================
// 週間予定
// ========================================

/**
 * 特定週の予定取得
 * @param {string} studentId - 生徒ID
 * @param {string} weekStart - 週の開始日（YYYY-MM-DD）
 * @returns {object|undefined} 週間予定
 */
export function getWeeklyPlan(studentId, weekStart) {
  return getData().weeklyPlans.find(
    p => p.studentId === studentId && p.weekStart === weekStart
  );
}

/**
 * 週間予定保存（upsert: weekStart + studentId で既存があれば更新）
 * @param {object} plan - 週間予定データ
 * @returns {object} 保存された週間予定
 */
export function saveWeeklyPlan(plan) {
  const data = getData();
  const index = data.weeklyPlans.findIndex(
    p => p.studentId === plan.studentId && p.weekStart === plan.weekStart
  );

  if (index !== -1) {
    // 既存を更新
    data.weeklyPlans[index] = { ...data.weeklyPlans[index], ...plan };
  } else {
    // 新規追加
    plan.id = plan.id || generateId();
    data.weeklyPlans.push(plan);
  }

  saveData(data);
  emitDataChange('weeklyPlans', {
    action: index !== -1 ? 'update' : 'add',
    plan: index !== -1 ? data.weeklyPlans[index] : plan
  });
  return index !== -1 ? data.weeklyPlans[index] : plan;
}

/**
 * 生徒の全週間予定取得
 * @param {string} studentId - 生徒ID
 * @returns {Array} 週間予定一覧
 */
export function getWeeklyPlans(studentId) {
  return getData().weeklyPlans.filter(p => p.studentId === studentId);
}

// ========================================
// 宿題管理
// ========================================

/**
 * 宿題一覧取得（フィルター対応）
 * @param {string} studentId - 生徒ID
 * @param {object} [filters] - フィルター条件 { status, subject, dueDate }
 * @returns {Array} 宿題一覧
 */
export function getAssignments(studentId, filters = {}) {
  let assignments = getData().assignments.filter(a => a.studentId === studentId);

  if (filters.status) {
    assignments = assignments.filter(a => a.status === filters.status);
  }
  if (filters.subject) {
    assignments = assignments.filter(a => a.subject === filters.subject);
  }
  if (filters.dueDate) {
    assignments = assignments.filter(a => a.dueDate === filters.dueDate);
  }

  return assignments;
}

/**
 * 宿題追加
 * @param {object} assignment - 宿題データ
 * @returns {object} 追加された宿題
 */
export function addAssignment(assignment) {
  const data = getData();
  assignment.id = assignment.id || generateId();
  assignment.status = assignment.status || 'pending';
  assignment.createdAt = assignment.createdAt || new Date().toISOString();
  data.assignments.push(assignment);
  saveData(data);
  emitDataChange('assignments', { action: 'add', assignment });
  return assignment;
}

/**
 * 宿題更新
 * @param {string} id - 宿題ID
 * @param {object} updates - 更新内容
 * @returns {object|null} 更新された宿題
 */
export function updateAssignment(id, updates) {
  const data = getData();
  const index = data.assignments.findIndex(a => a.id === id);
  if (index === -1) return null;

  data.assignments[index] = { ...data.assignments[index], ...updates, id };
  data.assignments[index].updatedAt = new Date().toISOString();
  saveData(data);
  emitDataChange('assignments', { action: 'update', assignment: data.assignments[index] });
  return data.assignments[index];
}

/**
 * 宿題削除
 * @param {string} id - 宿題ID
 * @returns {boolean} 削除成功かどうか
 */
export function deleteAssignment(id) {
  const data = getData();
  const index = data.assignments.findIndex(a => a.id === id);
  if (index === -1) return false;

  const deleted = data.assignments.splice(index, 1)[0];
  saveData(data);
  emitDataChange('assignments', { action: 'delete', assignment: deleted });
  return true;
}

// ========================================
// テスト結果
// ========================================

/**
 * テスト結果取得
 * @param {string} studentId - 生徒ID
 * @param {string} [subject] - 教科（省略で全教科）
 * @returns {Array} テスト結果一覧
 */
export function getTestResults(studentId, subject) {
  let results = getData().testResults.filter(r => r.studentId === studentId);
  if (subject) {
    results = results.filter(r => r.subject === subject);
  }
  return results;
}

/**
 * テスト結果追加
 * @param {object} result - テスト結果データ
 * @returns {object} 追加されたテスト結果
 */
export function addTestResult(result) {
  const data = getData();
  result.id = result.id || generateId();
  result.createdAt = result.createdAt || new Date().toISOString();
  data.testResults.push(result);
  saveData(data);
  emitDataChange('testResults', { action: 'add', result });
  return result;
}

/**
 * テスト結果更新
 * @param {string} id - テスト結果ID
 * @param {object} updates - 更新内容
 * @returns {object|null} 更新されたテスト結果
 */
export function updateTestResult(id, updates) {
  const data = getData();
  const index = data.testResults.findIndex(r => r.id === id);
  if (index === -1) return null;

  data.testResults[index] = { ...data.testResults[index], ...updates, id };
  saveData(data);
  emitDataChange('testResults', { action: 'update', result: data.testResults[index] });
  return data.testResults[index];
}

/**
 * テスト結果削除
 * @param {string} id - テスト結果ID
 * @returns {boolean} 削除成功かどうか
 */
export function deleteTestResult(id) {
  const data = getData();
  const index = data.testResults.findIndex(r => r.id === id);
  if (index === -1) return false;

  const deleted = data.testResults.splice(index, 1)[0];
  saveData(data);
  emitDataChange('testResults', { action: 'delete', result: deleted });
  return true;
}

// ========================================
// 勉強ログ
// ========================================

/**
 * 勉強ログ取得（日付範囲フィルター対応）
 * @param {string} studentId - 生徒ID
 * @param {object} [dateRange] - 日付範囲 { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
 * @returns {Array} 勉強ログ一覧
 */
export function getStudyLogs(studentId, dateRange) {
  let logs = getData().studyLogs.filter(l => l.studentId === studentId);

  if (dateRange) {
    if (dateRange.from) {
      logs = logs.filter(l => l.date >= dateRange.from);
    }
    if (dateRange.to) {
      logs = logs.filter(l => l.date <= dateRange.to);
    }
  }

  return logs;
}

/**
 * 勉強ログ追加
 * @param {object} log - 勉強ログデータ
 * @returns {object} 追加された勉強ログ
 */
export function addStudyLog(log) {
  const data = getData();
  log.id = log.id || generateId();
  log.createdAt = log.createdAt || new Date().toISOString();
  data.studyLogs.push(log);
  saveData(data);
  emitDataChange('studyLogs', { action: 'add', log });
  return log;
}

/**
 * 勉強統計取得
 * @param {string} studentId - 生徒ID
 * @returns {object} 統計情報 { totalMinutes, bySubject, byDate, streak }
 */
export function getStudyStats(studentId) {
  const logs = getStudyLogs(studentId);

  // 総時間（分）
  const totalMinutes = logs.reduce((sum, l) => sum + (l.duration || 0), 0);

  // 教科別集計
  const bySubject = {};
  logs.forEach(l => {
    if (!bySubject[l.subject]) {
      bySubject[l.subject] = 0;
    }
    bySubject[l.subject] += l.duration || 0;
  });

  // 日別集計
  const byDate = {};
  logs.forEach(l => {
    if (!byDate[l.date]) {
      byDate[l.date] = 0;
    }
    byDate[l.date] += l.duration || 0;
  });

  // 今日の勉強時間
  const today = formatDate(new Date());
  const todayMinutes = byDate[today] || 0;

  // 今週の勉強時間
  const weekStart = getWeekStart(new Date());
  const weekLogs = getStudyLogs(studentId, { from: weekStart, to: today });
  const weekMinutes = weekLogs.reduce((sum, l) => sum + (l.duration || 0), 0);

  // 連続日数（streak）計算
  const streak = calcStreak(byDate);

  return { totalMinutes, todayMinutes, weekMinutes, bySubject, byDate, streak };
}

/**
 * 連続日数（streak）計算
 * @param {object} byDate - 日別勉強時間マップ
 * @returns {number} 連続日数
 */
function calcStreak(byDate) {
  const dates = Object.keys(byDate).sort().reverse(); // 新しい順
  if (dates.length === 0) return 0;

  const today = formatDate(new Date());
  const yesterday = formatDate(new Date(Date.now() - 86400000));

  // 今日または昨日から始まっていなければ streak は 0
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
// 疑問箱
// ========================================

/**
 * 疑問取得
 * @param {string} studentId - 生徒ID
 * @param {string} [status] - ステータスフィルター ('open'|'answered'|'resolved')
 * @returns {Array} 疑問一覧
 */
export function getQuestions(studentId, status) {
  let questions = getData().questions.filter(q => q.studentId === studentId);
  if (status) {
    questions = questions.filter(q => q.status === status);
  }
  return questions;
}

/**
 * 疑問追加
 * @param {object} question - 疑問データ
 * @returns {object} 追加された疑問
 */
export function addQuestion(question) {
  const data = getData();
  question.id = question.id || generateId();
  question.status = question.status || 'open';
  question.createdAt = question.createdAt || new Date().toISOString();
  data.questions.push(question);
  saveData(data);
  emitDataChange('questions', { action: 'add', question });
  return question;
}

/**
 * 疑問更新（回答追加等）
 * @param {string} id - 疑問ID
 * @param {object} updates - 更新内容
 * @returns {object|null} 更新された疑問
 */
export function updateQuestion(id, updates) {
  const data = getData();
  const index = data.questions.findIndex(q => q.id === id);
  if (index === -1) return null;

  data.questions[index] = { ...data.questions[index], ...updates, id };
  data.questions[index].updatedAt = new Date().toISOString();
  saveData(data);
  emitDataChange('questions', { action: 'update', question: data.questions[index] });
  return data.questions[index];
}

// ========================================
// 設定
// ========================================

/**
 * 設定取得
 * @returns {object} 設定データ
 */
export function getSettings() {
  return getData().settings;
}

/**
 * 設定更新
 * @param {object} updates - 更新内容
 * @returns {object} 更新された設定
 */
export function updateSettings(updates) {
  const data = getData();
  data.settings = { ...data.settings, ...updates };
  saveData(data);
  emitDataChange('settings', { action: 'update', settings: data.settings });
  return data.settings;
}

// ========================================
// ユーティリティ
// ========================================

/**
 * JSONエクスポート（全データをJSON文字列に）
 * @returns {string} JSON文字列
 */
export function exportData() {
  const data = getData();
  return JSON.stringify(data, null, 2);
}

/**
 * JSONインポート（バリデーション付き）
 * @param {string} jsonString - インポートするJSON文字列
 * @returns {boolean} インポート成功かどうか
 * @throws {Error} バリデーションエラー
 */
export function importData(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { success: false, error: '無効なJSONフォーマットです。' };
  }

  // 必須フィールドのバリデーション
  const requiredKeys = ['users', 'weeklyPlans', 'assignments', 'testResults', 'studyLogs', 'questions', 'settings'];
  for (const key of requiredKeys) {
    if (!(key in parsed)) {
      return { success: false, error: `必須フィールド "${key}" が見つかりません。` };
    }
  }

  // 配列であるべきフィールドの検証
  const arrayKeys = ['users', 'weeklyPlans', 'assignments', 'testResults', 'studyLogs', 'questions'];
  for (const key of arrayKeys) {
    if (!Array.isArray(parsed[key])) {
      return { success: false, error: `"${key}" は配列である必要があります。` };
    }
  }

  // settings がオブジェクトであるかの検証
  if (typeof parsed.settings !== 'object' || parsed.settings === null || Array.isArray(parsed.settings)) {
    return { success: false, error: '"settings" はオブジェクトである必要があります。' };
  }

  saveData(parsed);
  emitDataChange('all', { action: 'import' });
  return { success: true };
}

/**
 * 指定日の週の月曜日を取得
 * @param {Date|string} date - 対象日
 * @returns {string} 月曜日の日付文字列（YYYY-MM-DD）
 */
export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=日 1=月 ... 6=土
  const diff = day === 0 ? -6 : 1 - day; // 日曜の場合は前の月曜に
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}

/**
 * 日付フォーマット（YYYY-MM-DD）
 * @param {Date|string} date - 対象日
 * @returns {string} YYYY-MM-DD形式の日付文字列
 */
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

/**
 * データ変更イベントリスナー登録
 * @param {function} callback - コールバック関数 (event) => void
 * @returns {function} リスナー解除関数
 */
export function onDataChange(callback) {
  const handler = (e) => callback(e.detail);
  storeEventTarget.addEventListener('dataChange', handler);
  // リスナー解除関数を返す
  return () => storeEventTarget.removeEventListener('dataChange', handler);
}

/**
 * データ変更イベント発火
 * @param {string} type - 変更されたデータの種類
 * @param {object} data - 変更内容の詳細
 */
export function emitDataChange(type, data) {
  const event = new CustomEvent('dataChange', {
    detail: { type, ...data, timestamp: Date.now() }
  });
  storeEventTarget.dispatchEvent(event);
}
