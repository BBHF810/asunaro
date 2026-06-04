// ダッシュボードページ
import { getCurrentUser } from '../auth.js';
import { getAssignments, getStudyStats, getTestResults, getStudents, getSettings, updateAssignment } from '../store.js';
import { navigate } from '../router.js';
import { updatePageTitle, showToast, fireConfetti } from '../app.js';

export function renderDashboard(container) {
  const user = getCurrentUser();
  updatePageTitle('ダッシュボード');

  switch (user.role) {
    case 'teacher':
      renderTeacherDashboard(container, user);
      break;
    case 'student':
      renderStudentDashboard(container, user);
      break;
    case 'parent':
      renderParentDashboard(container, user);
      break;
  }
}

function renderTeacherDashboard(container, user) {
  const students = getStudents();
  const settings = getSettings();

  let studentsHtml = students.map(student => {
    const assignments = getAssignments(student.id);
    const completed = assignments.filter(a => a.status === 'completed').length;
    const total = assignments.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const recentTests = getTestResults(student.id).slice(-3);

    return `
      <div class="card animate-slideUp">
        <div class="card-header">
          <div class="flex-center" style="gap: var(--space-3)">
            <div class="avatar avatar-md">${student.avatar}</div>
            <div>
              <h3 class="card-title">${student.name}</h3>
              <span class="text-muted">生徒</span>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="stat-row">
            <span class="stat-label">宿題進捗</span>
            <span class="stat-value-sm">${completed}/${total}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%; background: var(--accent-gradient)"></div>
          </div>
          ${recentTests.length > 0 ? `
            <div class="stat-row" style="margin-top: var(--space-3)">
              <span class="stat-label">最近のテスト</span>
            </div>
            <div class="test-badges">
              ${recentTests.map(t => `
                <span class="badge" style="background: ${settings.subjectColors[t.subject] || 'var(--bg-tertiary)'}20; color: ${settings.subjectColors[t.subject] || 'var(--text-secondary)'}">
                  ${t.subject} ${t.score}/${t.maxScore}
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="card-footer">
          <button class="btn btn-sm btn-ghost" onclick="location.hash='#/schedule?student=${student.id}'">予定表</button>
          <button class="btn btn-sm btn-primary" onclick="location.hash='#/homework?student=${student.id}'">宿題管理</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-welcome animate-fadeIn">
        <h2>おかえりなさい、${user.name}！</h2>
        <p class="text-secondary">今日も生徒たちの学習をサポートしましょう。</p>
      </div>

      <div class="dashboard-stats animate-slideUp">
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--accent-gradient)">👨‍🎓</div>
          <div class="stat-card-content">
            <span class="stat-card-value">${students.length}</span>
            <span class="stat-card-label">生徒数</span>
          </div>
        </div>
      </div>

      <h3 class="section-title">生徒一覧</h3>
      <div class="grid-2">
        ${studentsHtml}
      </div>
    </div>
  `;
}

function renderStudentDashboard(container, user) {
  const assignments = getAssignments(user.id);
  const pendingAssignments = assignments.filter(a => a.status !== 'completed');
  const completedToday = assignments.filter(a => a.status === 'completed' && isToday(a.completedAt));
  const stats = getStudyStats(user.id);
  const settings = getSettings();

  container.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-welcome animate-fadeIn">
        <h2>がんばろう、${user.name}！</h2>
        <p class="text-secondary">今日のタスクを確認しましょう。</p>
      </div>

      <div class="dashboard-stats animate-slideUp">
        <div class="stat-card">
          <div class="stat-card-icon" style="background: var(--accent-gradient)">📝</div>
          <div class="stat-card-content">
            <span class="stat-card-value">${pendingAssignments.length}</span>
            <span class="stat-card-label">未完了の宿題</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: linear-gradient(135deg, #2ECC71, #27AE60)">🔥</div>
          <div class="stat-card-content">
            <span class="stat-card-value">${stats.streak}</span>
            <span class="stat-card-label">連続学習日数</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon" style="background: linear-gradient(135deg, #9B59B6, #8E44AD)">⏱️</div>
          <div class="stat-card-content">
            <span class="stat-card-value">${stats.todayMinutes}</span>
            <span class="stat-card-label">今日の勉強(分)</span>
          </div>
        </div>
      </div>

      ${pendingAssignments.length > 0 ? `
        <h3 class="section-title">今日のやること</h3>
        <div class="todo-list animate-slideUp">
          ${pendingAssignments.slice(0, 5).map(a => `
            <div class="todo-item" data-id="${a.id}">
              <button class="todo-check" data-assignment-id="${a.id}" aria-label="完了にする">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              </button>
              <div class="todo-content">
                <span class="badge badge-sm" style="background: ${settings.subjectColors[a.subject] || '#666'}30; color: ${settings.subjectColors[a.subject] || '#999'}">${a.subject}</span>
                <span class="todo-text">${a.content}</span>
                ${a.pages ? `<span class="text-muted text-xs">${a.pages}</span>` : ''}
              </div>
              ${a.scheduledDate ? `<span class="todo-due">${formatScheduledDate(a.scheduledDate)}</span>` : ''}
            </div>
          `).join('')}
          ${pendingAssignments.length > 5 ? `
            <button class="btn btn-ghost btn-sm" onclick="location.hash='#/homework'" style="width:100%; margin-top: var(--space-2)">
              他 ${pendingAssignments.length - 5} 件の宿題を見る →
            </button>
          ` : ''}
        </div>
      ` : `
        <div class="empty-state animate-fadeIn">
          <div class="empty-state-icon">🎉</div>
          <p class="empty-state-text">すべての宿題が完了しています！</p>
        </div>
      `}

      <div class="grid-2" style="margin-top: var(--space-6)">
        <div class="card quick-action animate-slideUp" onclick="location.hash='#/study-time'" style="cursor:pointer">
          <div class="card-body" style="text-align:center">
            <div style="font-size: 2rem; margin-bottom: var(--space-2)">⏱️</div>
            <h4>勉強を始める</h4>
            <p class="text-muted text-sm">タイマーで記録する</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // TODOチェック
  container.querySelectorAll('.todo-check').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const assignmentId = btn.dataset.assignmentId;
      const todoItem = btn.closest('.todo-item');
      
      // アニメーション用クラス
      todoItem.classList.add('completing');
      btn.querySelector('circle').setAttribute('fill', 'var(--status-success)');
      btn.querySelector('circle').setAttribute('stroke', 'var(--status-success)');
      
      updateAssignment(assignmentId, { status: 'completed', completedAt: new Date().toISOString() });
      fireConfetti();
      showToast('宿題を完了にしました！🎉', 'success');
      
      setTimeout(() => renderDashboard(container), 800);
    });
  });
}

function renderParentDashboard(container, user) {
  const students = getStudents();
  const settings = getSettings();

  let studentsHtml = students.map(student => {
    const assignments = getAssignments(student.id);
    const completed = assignments.filter(a => a.status === 'completed').length;
    const total = assignments.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const stats = getStudyStats(student.id);
    const recentTests = getTestResults(student.id).slice(-5);

    return `
      <div class="card animate-slideUp">
        <div class="card-header">
          <div class="flex-center" style="gap: var(--space-3)">
            <div class="avatar avatar-lg">${student.avatar}</div>
            <div>
              <h3 class="card-title">${student.name}</h3>
              <div class="streak-badge">🔥 ${stats.streak}日連続</div>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="parent-stats-grid">
            <div class="parent-stat">
              <span class="parent-stat-value">${completed}/${total}</span>
              <span class="parent-stat-label">宿題完了</span>
            </div>
            <div class="parent-stat">
              <span class="parent-stat-value">${stats.weekMinutes}</span>
              <span class="parent-stat-label">今週の勉強(分)</span>
            </div>
          </div>
          <div class="progress-bar" style="margin-top: var(--space-3)">
            <div class="progress-fill" style="width: ${percentage}%; background: var(--accent-gradient)"></div>
          </div>
          ${recentTests.length > 0 ? `
            <div style="margin-top: var(--space-4)">
              <span class="stat-label">最近のテスト結果</span>
              <div class="test-results-mini">
                ${recentTests.map(t => {
                  const pct = Math.round((t.score / t.maxScore) * 100);
                  return `
                    <div class="test-result-mini">
                      <span class="badge badge-sm" style="background: ${settings.subjectColors[t.subject] || '#666'}30; color: ${settings.subjectColors[t.subject] || '#999'}">${t.subject}</span>
                      <span class="test-score-mini ${pct >= 80 ? 'score-good' : pct >= 60 ? 'score-ok' : 'score-low'}">${t.score}/${t.maxScore}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="card-footer">
          <button class="btn btn-sm btn-ghost" onclick="location.hash='#/stats?student=${student.id}'">詳細を見る</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-welcome animate-fadeIn">
        <h2>こんにちは、${user.name}！</h2>
        <p class="text-secondary">お子さんの学習状況を確認しましょう。</p>
      </div>

      <div class="grid-2">
        ${studentsHtml}
      </div>
    </div>
  `;
}

// ヘルパー関数
function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr.startsWith(today);
}

function formatScheduledDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`;
}
