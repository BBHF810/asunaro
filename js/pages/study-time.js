// 勉強時間ページ
import { getCurrentUser, isStudent } from '../auth.js';
import { addStudyLog, getStudyLogs, getStudyStats, getStudents, getSettings, formatDate } from '../store.js';
import { updatePageTitle, showToast } from '../app.js';

let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;
let timerSubject = '';
let selectedStudentId = null;

export function renderStudyTime(container) {
  updatePageTitle('勉強時間');
  const user = getCurrentUser();
  const students = getStudents();
  const settings = getSettings();

  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  selectedStudentId = params.get('student') || (isStudent() ? user.id : students[0]?.id);

  const stats = getStudyStats(selectedStudentId);
  const today = formatDate(new Date());
  const todayLogs = getStudyLogs(selectedStudentId, { from: today, to: today });
  const selectedStudent = students.find(s => s.id === selectedStudentId) || user;

  // 今週のログ
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekLogs = getStudyLogs(selectedStudentId, {
    from: formatDate(weekStart),
    to: formatDate(new Date()),
  });

  // 教科別集計
  const subjectTotals = {};
  weekLogs.forEach(log => {
    subjectTotals[log.subject] = (subjectTotals[log.subject] || 0) + log.duration;
  });

  container.innerHTML = `
    <div class="study-time-page">
      ${!isStudent() ? `
        <div class="student-selector animate-fadeIn">
          ${students.map(s => `
            <button class="btn ${s.id === selectedStudentId ? 'btn-primary' : 'btn-secondary'} btn-sm student-select-btn"
                    data-student="${s.id}">
              ${s.avatar} ${s.name}
            </button>
          `).join('')}
        </div>
      ` : ''}

      ${isStudent() ? `
        <div class="timer-section card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">⏱️ 勉強タイマー</h3>
          </div>
          <div class="card-body">
            <div class="timer-display" id="timer-display">
              ${formatTime(timerSeconds)}
            </div>
            <div class="timer-subject-select">
              <label class="text-sm text-muted">教科を選択:</label>
              <div class="timer-subject-buttons">
                ${settings.subjects.map(s => `
                  <button class="btn btn-sm ${timerSubject === s ? 'btn-primary' : 'btn-secondary'} timer-subject-btn"
                          data-subject="${s}" style="${timerSubject === s ? `background: ${settings.subjectColors[s]}` : ''}">
                    ${s}
                  </button>
                `).join('')}
              </div>
            </div>
            <div class="timer-controls">
              <button class="btn ${timerRunning ? 'btn-secondary' : 'btn-primary'} btn-lg" id="timer-toggle">
                ${timerRunning ? '⏸ 一時停止' : '▶ スタート'}
              </button>
              <button class="btn btn-ghost btn-lg" id="timer-save" ${timerSeconds === 0 ? 'disabled' : ''}>
                💾 記録する
              </button>
              <button class="btn btn-ghost btn-lg" id="timer-reset" ${timerSeconds === 0 ? 'disabled' : ''}>
                🔄 リセット
              </button>
            </div>
          </div>
        </div>

        <div class="manual-entry card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">✏️ 手動で記録</h3>
          </div>
          <div class="card-body">
            <div class="manual-entry-form">
              <select class="select" id="manual-subject">
                ${settings.subjects.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
              <input class="input" type="number" id="manual-duration" placeholder="分数" min="1" style="width: 100px" />
              <button class="btn btn-primary btn-sm" id="manual-save">記録</button>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="study-stats animate-slideUp">
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--accent-gradient)">📅</div>
            <div class="stat-card-content">
              <span class="stat-card-value">${stats.todayMinutes}</span>
              <span class="stat-card-label">今日 (分)</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: linear-gradient(135deg, #4A90D9, #357ABD)">📊</div>
            <div class="stat-card-content">
              <span class="stat-card-value">${stats.weekMinutes}</span>
              <span class="stat-card-label">今週 (分)</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: linear-gradient(135deg, #2ECC71, #27AE60)">🔥</div>
            <div class="stat-card-content">
              <span class="stat-card-value">${stats.streak}</span>
              <span class="stat-card-label">連続日数</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: linear-gradient(135deg, #9B59B6, #8E44AD)">⏱️</div>
            <div class="stat-card-content">
              <span class="stat-card-value">${stats.totalMinutes}</span>
              <span class="stat-card-label">累計 (分)</span>
            </div>
          </div>
        </div>
      </div>

      ${Object.keys(subjectTotals).length > 0 ? `
        <div class="subject-breakdown card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">📚 今週の教科別</h3>
          </div>
          <div class="card-body">
            ${settings.subjects.map(sub => {
              const mins = subjectTotals[sub] || 0;
              const maxMins = Math.max(...Object.values(subjectTotals), 1);
              const pct = Math.round((mins / maxMins) * 100);
              return `
                <div class="subject-bar-row">
                  <span class="subject-bar-label" style="color: ${settings.subjectColors[sub]}">${sub}</span>
                  <div class="progress-bar" style="flex: 1">
                    <div class="progress-fill" style="width: ${pct}%; background: ${settings.subjectColors[sub]}"></div>
                  </div>
                  <span class="subject-bar-value">${mins}分</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div class="today-logs card animate-slideUp">
        <div class="card-header">
          <h3 class="card-title">📝 今日の記録</h3>
        </div>
        <div class="card-body">
          ${todayLogs.length > 0 ? `
            <div class="study-log-list">
              ${todayLogs.map(log => `
                <div class="study-log-item">
                  <span class="badge badge-sm" style="background: ${settings.subjectColors[log.subject]}20; color: ${settings.subjectColors[log.subject]}">${log.subject}</span>
                  <span class="study-log-duration">${log.duration}分</span>
                  <span class="text-muted text-sm">${log.method === 'timer' ? 'タイマー' : '手動'}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-state" style="padding: var(--space-4)">
              <p class="text-muted">今日の記録はまだありません</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  // イベント
  setupStudyTimeEvents(container, settings);
}

function setupStudyTimeEvents(container, settings) {
  // 生徒選択
  container.querySelectorAll('.student-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStudentId = btn.dataset.student;
      renderStudyTime(container);
    });
  });

  // 教科選択
  container.querySelectorAll('.timer-subject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      timerSubject = btn.dataset.subject;
      container.querySelectorAll('.timer-subject-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
        b.style.background = '';
      });
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      btn.style.background = settings.subjectColors[timerSubject];
    });
  });

  // タイマートグル
  document.getElementById('timer-toggle')?.addEventListener('click', () => {
    if (!timerSubject) {
      showToast('教科を選択してください', 'warning');
      return;
    }
    if (timerRunning) {
      clearInterval(timerInterval);
      timerRunning = false;
    } else {
      timerRunning = true;
      timerInterval = setInterval(() => {
        timerSeconds++;
        const display = document.getElementById('timer-display');
        if (display) display.textContent = formatTime(timerSeconds);
      }, 1000);
    }
    const btn = document.getElementById('timer-toggle');
    if (btn) {
      btn.textContent = timerRunning ? '⏸ 一時停止' : '▶ スタート';
      btn.className = `btn ${timerRunning ? 'btn-secondary' : 'btn-primary'} btn-lg`;
    }
  });

  // タイマー保存
  document.getElementById('timer-save')?.addEventListener('click', () => {
    if (timerSeconds < 60) {
      showToast('1分以上勉強してから記録してください', 'warning');
      return;
    }
    const minutes = Math.round(timerSeconds / 60);
    addStudyLog({
      studentId: selectedStudentId,
      subject: timerSubject,
      date: formatDate(new Date()),
      duration: minutes,
      method: 'timer',
    });
    clearInterval(timerInterval);
    timerSeconds = 0;
    timerRunning = false;
    showToast(`${timerSubject} ${minutes}分を記録しました！🎉`, 'success');
    renderStudyTime(container);
  });

  // タイマーリセット
  document.getElementById('timer-reset')?.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerSeconds = 0;
    timerRunning = false;
    const display = document.getElementById('timer-display');
    if (display) display.textContent = formatTime(0);
    const btn = document.getElementById('timer-toggle');
    if (btn) {
      btn.textContent = '▶ スタート';
      btn.className = 'btn btn-primary btn-lg';
    }
  });

  // 手動記録
  document.getElementById('manual-save')?.addEventListener('click', () => {
    const subject = document.getElementById('manual-subject')?.value;
    const duration = parseInt(document.getElementById('manual-duration')?.value);
    if (!subject || !duration || duration < 1) {
      showToast('教科と時間を入力してください', 'warning');
      return;
    }
    addStudyLog({
      studentId: selectedStudentId,
      subject,
      date: formatDate(new Date()),
      duration,
      method: 'manual',
    });
    showToast(`${subject} ${duration}分を記録しました！`, 'success');
    renderStudyTime(container);
  });
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
