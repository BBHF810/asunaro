// テスト結果ページ
import { getCurrentUser, isTeacher, isStudent } from '../auth.js';
import { getTestResults, addTestResult, updateTestResult, deleteTestResult, getStudents, getSettings } from '../store.js';
import { updatePageTitle, showToast, showModal, closeModal } from '../app.js';

let selectedStudentId = null;
let initialized = false;

export function renderTests(container) {
  updatePageTitle('テスト結果');
  const user = getCurrentUser();
  const students = getStudents();
  const settings = getSettings();

  if (!initialized || !selectedStudentId) {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const paramStudent = params.get('student');
    if (paramStudent) {
      selectedStudentId = paramStudent;
    } else if (!selectedStudentId) {
      selectedStudentId = isStudent() ? user.id : students[0]?.id;
    }
    initialized = true;
  }

  const results = getTestResults(selectedStudentId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const selectedStudent = students.find(s => s.id === selectedStudentId) || user;

  // 教科別平均スコア
  const subjectAvg = {};
  settings.subjects.forEach(sub => {
    const subResults = results.filter(r => r.subject === sub);
    if (subResults.length > 0) {
      const avg = subResults.reduce((sum, r) => sum + (r.score / r.maxScore) * 100, 0) / subResults.length;
      subjectAvg[sub] = Math.round(avg);
    }
  });

  container.innerHTML = `
    <div class="tests-page">
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

      ${Object.keys(subjectAvg).length > 0 ? `
        <div class="test-summary animate-slideUp">
          <h3 class="section-title">教科別平均点</h3>
          <div class="subject-avg-grid">
            ${settings.subjects.map(sub => {
              const avg = subjectAvg[sub];
              if (avg === undefined) return '';
              return `
                <div class="subject-avg-card" style="border-top: 3px solid ${settings.subjectColors[sub]}">
                  <span class="subject-avg-label">${sub}</span>
                  <span class="subject-avg-value ${avg >= 80 ? 'score-good' : avg >= 60 ? 'score-ok' : 'score-low'}">${avg}%</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div class="test-toolbar animate-fadeIn">
        <h3 class="section-title">テスト履歴</h3>
        ${isStudent() ? `
          <button class="btn btn-primary btn-sm" id="add-test-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            テスト結果を追加
          </button>
        ` : ''}
      </div>

      <div class="test-history animate-slideUp">
        ${results.length > 0 ? results.map(r => {
          const pct = Math.round((r.score / r.maxScore) * 100);
          return `
          <div class="test-item" data-id="${r.id}">
            <div class="test-item-score" style="background: ${settings.subjectColors[r.subject]}15; border: 2px solid ${settings.subjectColors[r.subject]}">
              <span class="test-score-value ${pct >= 80 ? 'score-good' : pct >= 60 ? 'score-ok' : 'score-low'}">${r.score}</span>
              <span class="test-score-max">/${r.maxScore}</span>
              <span class="test-score-pct">${pct}%</span>
            </div>
            <div class="test-item-info">
              <span class="badge badge-sm" style="background: ${settings.subjectColors[r.subject]}20; color: ${settings.subjectColors[r.subject]}">${r.subject}</span>
              <h4>${r.testName || 'テスト'}</h4>
              <span class="text-muted text-sm">${r.date ? formatTestDate(r.date) : ''}</span>
            </div>
            <div class="test-item-actions">
              ${isStudent() ? `
                <button class="btn btn-sm btn-ghost edit-test-btn" data-id="${r.id}">編集</button>
                <button class="btn btn-sm btn-ghost delete-test-btn" data-id="${r.id}" style="color:var(--status-danger)">削除</button>
              ` : ''}
            </div>
          </div>
          `;
        }).join('') : `
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <p class="empty-state-text">テスト結果がまだありません</p>
          </div>
        `}
      </div>
    </div>
  `;

  // イベント
  container.querySelectorAll('.student-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStudentId = btn.dataset.student;
      renderTests(container);
    });
  });

  document.getElementById('add-test-btn')?.addEventListener('click', () => {
    showTestForm(container, settings, null);
  });

  container.querySelectorAll('.edit-test-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const result = results.find(r => r.id === btn.dataset.id);
      if (result) showTestForm(container, settings, result);
    });
  });

  container.querySelectorAll('.delete-test-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('このテスト結果を削除しますか？')) {
        deleteTestResult(btn.dataset.id);
        showToast('テスト結果を削除しました', 'info');
        renderTests(container);
      }
    });
  });
}

function showTestForm(container, settings, existing) {
  const isEdit = !!existing;
  const today = new Date().toISOString().split('T')[0];

  showModal(`
    <form id="test-form">
      <div class="input-group">
        <label>教科</label>
        <select class="select" name="subject" required>
          ${settings.subjects.map(s => `
            <option value="${s}" ${existing?.subject === s ? 'selected' : ''}>${s}</option>
          `).join('')}
        </select>
      </div>
      <div class="input-group">
        <label>テスト名</label>
        <input class="input" name="testName" value="${existing?.testName || ''}" placeholder="例: 中間テスト" required />
      </div>
      <div class="input-group">
        <label>日付</label>
        <input class="input" type="date" name="date" value="${existing?.date || today}" required />
      </div>
      <div class="form-row">
        <div class="input-group">
          <label>点数</label>
          <input class="input" type="number" name="score" value="${existing?.score || ''}" min="0" placeholder="0" required />
        </div>
        <div class="input-group">
          <label>満点</label>
          <input class="input" type="number" name="maxScore" value="${existing?.maxScore || '100'}" min="1" placeholder="100" required />
        </div>
      </div>
    </form>
  `, {
    title: isEdit ? 'テスト結果を編集' : 'テスト結果を追加',
    footer: `
      <button class="btn btn-ghost" id="modal-cancel">キャンセル</button>
      <button class="btn btn-primary" id="modal-save">${isEdit ? '更新' : '追加'}</button>
    `,
  });

  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-save')?.addEventListener('click', () => {
    const form = document.getElementById('test-form');
    const fd = new FormData(form);
    const data = {
      subject: fd.get('subject'),
      testName: fd.get('testName'),
      date: fd.get('date'),
      score: parseInt(fd.get('score')),
      maxScore: parseInt(fd.get('maxScore')),
    };

    if (!data.testName || isNaN(data.score) || isNaN(data.maxScore)) {
      showToast('すべての項目を入力してください', 'warning');
      return;
    }

    if (isEdit) {
      updateTestResult(existing.id, data);
      showToast('テスト結果を更新しました', 'success');
    } else {
      addTestResult({ ...data, studentId: selectedStudentId });
      showToast('テスト結果を追加しました！', 'success');
    }
    closeModal();
    renderTests(container);
  });
}

function formatTestDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
