// 宿題管理ページ
import { getCurrentUser, isTeacher, isStudent } from '../auth.js';
import { getAssignments, addAssignment, updateAssignment, deleteAssignment, getStudents, getSettings } from '../store.js';
import { updatePageTitle, showToast, showModal, closeModal, fireConfetti } from '../app.js';

let filterStatus = 'all';
let filterSubject = 'all';
let selectedStudentId = null;
let initialized = false;

export function renderHomework(container) {
  updatePageTitle('宿題管理');
  const user = getCurrentUser();
  const students = getStudents();
  const settings = getSettings();

  // 初回表示 or URL paramsからの遷移時のみ selectedStudentId を設定
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

  const assignments = getAssignments(selectedStudentId)
    .filter(a => filterStatus === 'all' || a.status === filterStatus)
    .filter(a => filterSubject === 'all' || a.subject === filterSubject)
    .sort((a, b) => {
      // 未完了を先に、予定日順
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return (a.scheduledDate || a.dueDate || '9999') > (b.scheduledDate || b.dueDate || '9999') ? 1 : -1;
    });

  const selectedStudent = students.find(s => s.id === selectedStudentId) || user;

  container.innerHTML = `
    <div class="homework-page">
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

      <div class="homework-toolbar animate-fadeIn">
        <div class="homework-filters">
          <select class="select select-sm" id="filter-status" aria-label="ステータスフィルター">
            <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>すべて</option>
            <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>未着手</option>
            <option value="in_progress" ${filterStatus === 'in_progress' ? 'selected' : ''}>進行中</option>
            <option value="completed" ${filterStatus === 'completed' ? 'selected' : ''}>完了</option>
          </select>
          <select class="select select-sm" id="filter-subject" aria-label="教科フィルター">
            <option value="all" ${filterSubject === 'all' ? 'selected' : ''}>全教科</option>
            ${settings.subjects.map(s => `
              <option value="${s}" ${filterSubject === s ? 'selected' : ''}>${s}</option>
            `).join('')}
          </select>
        </div>
        ${isTeacher() || isStudent() ? `
          <button class="btn btn-primary btn-sm" id="add-homework-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            宿題を追加
          </button>
        ` : ''}
      </div>

      <div class="homework-list animate-slideUp">
        ${assignments.length > 0 ? assignments.map(a => `
          <div class="homework-item ${a.status === 'completed' ? 'completed' : ''}" data-id="${a.id}">
            <div class="homework-item-left" style="border-left-color: ${settings.subjectColors[a.subject] || '#666'}">
              <div class="homework-item-header">
                <span class="badge badge-sm" style="background: ${settings.subjectColors[a.subject] || '#666'}20; color: ${settings.subjectColors[a.subject] || '#999'}">${a.subject}</span>
                <span class="homework-status status-${a.status}">${getStatusLabel(a.status)}</span>
              </div>
              <h4 class="homework-content">${a.content}</h4>
              ${a.pages ? `<p class="homework-pages text-muted text-sm">📄 ${a.pages}</p>` : ''}
              ${a.notes ? `<p class="homework-notes text-muted text-sm">📝 ${a.notes}</p>` : ''}
              ${a.scheduledDate ? `<p class="homework-due text-sm">📅 ${formatScheduledDate(a.scheduledDate)}</p>` : ''}
            </div>
            <div class="homework-item-actions">
              ${isStudent() && a.status !== 'completed' ? `
                <button class="btn btn-sm btn-primary complete-btn" data-id="${a.id}">完了</button>
              ` : ''}
              ${isStudent() && a.status === 'completed' ? `
                <button class="btn btn-sm btn-secondary uncomplete-btn" data-id="${a.id}">未完了に戻す</button>
              ` : ''}
              ${isTeacher() || isStudent() ? `
                <button class="btn btn-sm btn-ghost edit-btn" data-id="${a.id}">編集</button>
              ` : ''}
              ${isTeacher() || isStudent() ? `
                <button class="btn btn-sm btn-ghost delete-btn" data-id="${a.id}" style="color: var(--status-danger)">削除</button>
              ` : ''}
            </div>
          </div>
        `).join('') : `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <p class="empty-state-text">宿題がありません</p>
          </div>
        `}
      </div>
    </div>
  `;

  // イベントリスナー
  setupHomeworkEvents(container, settings);
}

function setupHomeworkEvents(container, settings) {
  // フィルター
  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    renderHomework(container);
  });

  document.getElementById('filter-subject')?.addEventListener('change', (e) => {
    filterSubject = e.target.value;
    renderHomework(container);
  });

  // 生徒選択
  container.querySelectorAll('.student-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStudentId = btn.dataset.student;
      renderHomework(container);
    });
  });

  // 宿題追加
  document.getElementById('add-homework-btn')?.addEventListener('click', () => {
    showHomeworkForm(container, settings, null);
  });

  // 完了ボタン
  container.querySelectorAll('.complete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // 完了アニメーション用に要素を取得
      const item = btn.closest('.homework-item');
      item.classList.add('completed');
      
      updateAssignment(btn.dataset.id, { status: 'completed', completedAt: new Date().toISOString() });
      fireConfetti();
      showToast('宿題を完了にしました！🎉', 'success');
      
      // 少し遅延させて再描画
      setTimeout(() => renderHomework(container), 800);
    });
  });

  // 未完了に戻すボタン
  container.querySelectorAll('.uncomplete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.homework-item');
      item.classList.remove('completed');
      
      updateAssignment(btn.dataset.id, { status: 'pending', completedAt: null });
      showToast('宿題を未完了に戻しました', 'info');
      
      setTimeout(() => renderHomework(container), 400);
    });
  });

  // 編集ボタン
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const assignments = getAssignments(selectedStudentId);
      const assignment = assignments.find(a => a.id === btn.dataset.id);
      if (assignment) showHomeworkForm(container, settings, assignment);
    });
  });

  // 削除ボタン
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('この宿題を削除しますか？')) {
        deleteAssignment(btn.dataset.id);
        showToast('宿題を削除しました', 'info');
        renderHomework(container);
      }
    });
  });
}

function showHomeworkForm(container, settings, existing) {
  const isEdit = !!existing;
  const formHtml = `
    <form id="homework-form">
      <div class="input-group">
        <label for="hw-subject">教科</label>
        <select class="select" name="subject" id="hw-subject" required>
          ${settings.subjects.map(s => `
            <option value="${s}" ${existing?.subject === s ? 'selected' : ''}>${s}</option>
          `).join('')}
        </select>
      </div>
      <div class="input-group">
        <label for="hw-content">内容</label>
        <input class="input" name="content" id="hw-content" value="${existing?.content || ''}" placeholder="宿題の内容を入力" required />
      </div>
      <div class="input-group">
        <label for="hw-pages">ページ・範囲</label>
        <input class="input" name="pages" id="hw-pages" value="${existing?.pages || ''}" placeholder="例: p.42-45" />
      </div>
      <div class="input-group">
        <label for="hw-scheduledDate">予定日（いつやるか）</label>
        <input class="input" type="date" name="scheduledDate" id="hw-scheduledDate" value="${existing?.scheduledDate || ''}" />
      </div>
      <div class="input-group">
        <label for="hw-notes">メモ</label>
        <textarea class="textarea" name="notes" id="hw-notes" placeholder="メモを入力...">${existing?.notes || ''}</textarea>
      </div>
    </form>
  `;

  const modal = showModal(formHtml, {
    title: isEdit ? '宿題を編集' : '宿題を追加',
    footer: `
      <button class="btn btn-ghost" id="modal-cancel">キャンセル</button>
      <button class="btn btn-primary" id="modal-save">${isEdit ? '更新' : '追加'}</button>
    `,
  });

  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-save')?.addEventListener('click', () => {
    const form = document.getElementById('homework-form');
    const formData = new FormData(form);
    const data = {
      subject: formData.get('subject'),
      content: formData.get('content'),
      pages: formData.get('pages'),
      scheduledDate: formData.get('scheduledDate'),
      notes: formData.get('notes'),
    };

    if (!data.content) {
      showToast('内容を入力してください', 'warning');
      return;
    }

    if (isEdit) {
      updateAssignment(existing.id, data);
      showToast('宿題を更新しました', 'success');
    } else {
      addAssignment({
        ...data,
        studentId: selectedStudentId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      showToast('宿題を追加しました！', 'success');
    }
    closeModal();
    renderHomework(container);
  });
}

function getStatusLabel(status) {
  switch (status) {
    case 'pending': return '未着手';
    case 'in_progress': return '進行中';
    case 'completed': return '完了';
    default: return status;
  }
}

function formatScheduledDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`;
}
