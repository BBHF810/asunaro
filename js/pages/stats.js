// 学習統計ページ
import { getCurrentUser, isStudent } from '../auth.js';
import { getStudyLogs, getTestResults, getStudyStats, getAssignments, getStudents, getSettings, formatDate } from '../store.js';
import { updatePageTitle } from '../app.js';

let selectedStudentId = null;

export function renderStats(container) {
  updatePageTitle('学習統計');
  const user = getCurrentUser();
  const students = getStudents();
  const settings = getSettings();

  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  selectedStudentId = params.get('student') || (isStudent() ? user.id : students[0]?.id);

  const stats = getStudyStats(selectedStudentId);
  const assignments = getAssignments(selectedStudentId);
  const testResults = getTestResults(selectedStudentId);
  const selectedStudent = students.find(s => s.id === selectedStudentId) || user;

  // 教科別宿題完了率
  const subjectCompletion = {};
  settings.subjects.forEach(sub => {
    const subAssignments = assignments.filter(a => a.subject === sub);
    const completed = subAssignments.filter(a => a.status === 'completed').length;
    subjectCompletion[sub] = {
      total: subAssignments.length,
      completed,
      percentage: subAssignments.length > 0 ? Math.round((completed / subAssignments.length) * 100) : 0,
    };
  });

  // 過去4週間の勉強時間推移
  const weeklyData = getWeeklyStudyData(selectedStudentId, 4);

  // 学習ヒートマップデータ（過去3ヶ月）
  const heatmapData = getHeatmapData(selectedStudentId, 90);

  container.innerHTML = `
    <div class="stats-page">
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

      <div class="stats-summary animate-slideUp">
        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-card-icon" style="background: var(--accent-gradient)">📚</div>
            <div class="stat-card-content">
              <span class="stat-card-value">${stats.totalMinutes}</span>
              <span class="stat-card-label">累計勉強時間 (分)</span>
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
            <div class="stat-card-icon" style="background: linear-gradient(135deg, #4A90D9, #357ABD)">✅</div>
            <div class="stat-card-content">
              <span class="stat-card-value">${assignments.filter(a => a.status === 'completed').length}/${assignments.length}</span>
              <span class="stat-card-label">宿題完了</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon" style="background: linear-gradient(135deg, #9B59B6, #8E44AD)">📊</div>
            <div class="stat-card-content">
              <span class="stat-card-value">${testResults.length}</span>
              <span class="stat-card-label">テスト記録数</span>
            </div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">📊 教科別完了率</h3>
          </div>
          <div class="card-body">
            ${settings.subjects.map(sub => {
              const data = subjectCompletion[sub];
              return `
                <div class="subject-bar-row">
                  <span class="subject-bar-label" style="color: ${settings.subjectColors[sub]}">${sub}</span>
                  <div class="progress-bar" style="flex: 1">
                    <div class="progress-fill" style="width: ${data.percentage}%; background: ${settings.subjectColors[sub]}"></div>
                  </div>
                  <span class="subject-bar-value">${data.percentage}%</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">⏱️ 週別勉強時間</h3>
          </div>
          <div class="card-body">
            <div class="bar-chart" id="weekly-chart">
              ${weeklyData.map((week, i) => {
                const maxMins = Math.max(...weeklyData.map(w => w.totalMinutes), 1);
                const pct = Math.round((week.totalMinutes / maxMins) * 100);
                return `
                  <div class="bar-chart-column">
                    <div class="bar-chart-bar" style="height: ${pct}%; background: var(--accent-gradient)" title="${week.totalMinutes}分"></div>
                    <span class="bar-chart-label">${week.label}</span>
                    <span class="bar-chart-value">${week.totalMinutes}分</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      ${testResults.length > 0 ? `
        <div class="card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">📈 テスト成績推移</h3>
          </div>
          <div class="card-body">
            <div class="test-trend-chart">
              ${settings.subjects.map(sub => {
                const subTests = testResults.filter(r => r.subject === sub).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
                if (subTests.length === 0) return '';
                return `
                  <div class="test-trend-subject">
                    <span class="test-trend-label" style="color: ${settings.subjectColors[sub]}">${sub}</span>
                    <div class="test-trend-scores">
                      ${subTests.map(t => {
                        const pct = Math.round((t.score / t.maxScore) * 100);
                        return `<span class="test-trend-score ${pct >= 80 ? 'score-good' : pct >= 60 ? 'score-ok' : 'score-low'}" title="${t.testName}: ${t.score}/${t.maxScore}">${pct}%</span>`;
                      }).join(' → ')}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <div class="card animate-slideUp">
        <div class="card-header">
          <h3 class="card-title">🗓️ 学習ヒートマップ（過去3ヶ月）</h3>
        </div>
        <div class="card-body">
          <div class="heatmap" id="heatmap">
            ${renderHeatmap(heatmapData)}
          </div>
        </div>
      </div>

      <div class="card animate-slideUp">
        <div class="card-header">
          <h3 class="card-title">📊 教科別勉強時間バランス</h3>
        </div>
        <div class="card-body">
          <div class="radar-chart-container">
            ${renderRadarChart(selectedStudentId, settings)}
          </div>
        </div>
      </div>
    </div>
  `;

  // イベント
  container.querySelectorAll('.student-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStudentId = btn.dataset.student;
      renderStats(container);
    });
  });
}

function getWeeklyStudyData(studentId, weeks) {
  const data = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const logs = getStudyLogs(studentId, {
      from: formatDate(weekStart),
      to: formatDate(weekEnd),
    });

    const totalMinutes = logs.reduce((sum, l) => sum + l.duration, 0);
    data.push({
      label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      totalMinutes,
    });
  }
  return data;
}

function getHeatmapData(studentId, days) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date);
    const logs = getStudyLogs(studentId, { from: dateStr, to: dateStr });
    const minutes = logs.reduce((sum, l) => sum + l.duration, 0);
    data.push({ date: dateStr, minutes });
  }
  return data;
}

function renderHeatmap(data) {
  const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];
  const CELL_SIZE = 17; // 14px cell + 3px gap

  // データを週ごとにグループ化（月曜始まり）
  // まず最初の日の曜日を計算してパディング
  const firstDate = new Date(data[0].date);
  let firstDayOfWeek = firstDate.getDay(); // 0=日, 1=月...
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // 月曜=0に変換

  // パディング用の空セルを前に追加
  const paddedData = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    paddedData.push(null);
  }
  data.forEach(d => paddedData.push(d));

  // 週数計算
  const totalWeeks = Math.ceil(paddedData.length / 7);

  // 月ラベルの生成
  const monthLabels = [];
  let lastMonth = -1;
  for (let w = 0; w < totalWeeks; w++) {
    const idx = w * 7 - firstDayOfWeek; // 元データのインデックス
    if (idx >= 0 && idx < data.length) {
      const d = new Date(data[idx].date);
      const month = d.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ week: w, label: `${month + 1}月` });
        lastMonth = month;
      }
    }
  }

  // グリッドセル生成（grid-auto-flow: column で曜日が行、週が列になる）
  const cells = paddedData.map(day => {
    if (!day) return '<div class="heatmap-cell" style="visibility:hidden"></div>';
    const level = day.minutes === 0 ? 0 : day.minutes < 30 ? 1 : day.minutes < 60 ? 2 : day.minutes < 120 ? 3 : 4;
    return `<div class="heatmap-cell heatmap-level-${level}" title="${day.date}: ${day.minutes}分"></div>`;
  }).join('');

  return `
    <div class="heatmap-months" style="padding-left: 32px;">
      ${monthLabels.map((m, i) => {
        const nextWeek = i < monthLabels.length - 1 ? monthLabels[i + 1].week : totalWeeks;
        const span = nextWeek - m.week;
        return `<span class="heatmap-month-label" style="width: ${span * CELL_SIZE}px">${m.label}</span>`;
      }).join('')}
    </div>
    <div class="heatmap-grid-wrap">
      <div class="heatmap-day-labels">
        ${DAY_LABELS.map(d => `<div class="heatmap-day-label">${d}</div>`).join('')}
      </div>
      <div class="heatmap-grid">
        ${cells}
      </div>
    </div>
    <div class="heatmap-legend">
      <span class="text-muted text-xs">少ない</span>
      <div class="heatmap-cell heatmap-level-0"></div>
      <div class="heatmap-cell heatmap-level-1"></div>
      <div class="heatmap-cell heatmap-level-2"></div>
      <div class="heatmap-cell heatmap-level-3"></div>
      <div class="heatmap-cell heatmap-level-4"></div>
      <span class="text-muted text-xs">多い</span>
    </div>
  `;
}


function renderRadarChart(studentId, settings) {
  const allLogs = getStudyLogs(studentId, {});
  const subjectTotals = {};
  let maxTotal = 0;

  settings.subjects.forEach(sub => {
    const total = allLogs.filter(l => l.subject === sub).reduce((sum, l) => sum + l.duration, 0);
    subjectTotals[sub] = total;
    if (total > maxTotal) maxTotal = total;
  });

  if (maxTotal === 0) {
    return `<div class="empty-state" style="padding: var(--space-4)"><p class="text-muted">データがまだありません</p></div>`;
  }

  // CSSベースの簡易レーダーチャート
  return `
    <div class="simple-radar">
      ${settings.subjects.map(sub => {
        const pct = Math.round((subjectTotals[sub] / maxTotal) * 100);
        return `
          <div class="radar-bar-row">
            <span class="radar-label" style="color: ${settings.subjectColors[sub]}">${sub}</span>
            <div class="progress-bar" style="flex:1">
              <div class="progress-fill" style="width:${pct}%; background:${settings.subjectColors[sub]}"></div>
            </div>
            <span class="radar-value">${subjectTotals[sub]}分</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
