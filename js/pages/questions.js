// 疑問箱ページ
import { getCurrentUser, isTeacher, isStudent } from '../auth.js';
import { getQuestions, addQuestion, updateQuestion, getStudents, getSettings } from '../store.js';
import { updatePageTitle, showToast, showModal, closeModal } from '../app.js';

let filterStatus = 'all';
let selectedStudentId = null;

export function renderQuestions(container) {
  updatePageTitle('疑問箱');
  const user = getCurrentUser();
  const students = getStudents();
  const settings = getSettings();

  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  selectedStudentId = params.get('student') || (isStudent() ? user.id : null);

  // 教師は全生徒の質問を見る
  let questions = [];
  if (isTeacher()) {
    if (selectedStudentId) {
      questions = getQuestions(selectedStudentId, filterStatus === 'all' ? undefined : filterStatus);
    } else {
      students.forEach(s => {
        const qs = getQuestions(s.id, filterStatus === 'all' ? undefined : filterStatus);
        questions = questions.concat(qs.map(q => ({ ...q, studentName: s.name, studentAvatar: s.avatar })));
      });
    }
  } else {
    questions = getQuestions(user.id, filterStatus === 'all' ? undefined : filterStatus);
  }

  questions.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  container.innerHTML = `
    <div class="questions-page">
      ${isTeacher() ? `
        <div class="student-selector animate-fadeIn">
          <button class="btn ${!selectedStudentId ? 'btn-primary' : 'btn-secondary'} btn-sm student-select-btn"
                  data-student="">全員</button>
          ${students.map(s => `
            <button class="btn ${s.id === selectedStudentId ? 'btn-primary' : 'btn-secondary'} btn-sm student-select-btn"
                    data-student="${s.id}">
              ${s.avatar} ${s.name}
            </button>
          `).join('')}
        </div>
      ` : ''}

      <div class="questions-toolbar animate-fadeIn">
        <div class="questions-filters">
          <select class="select select-sm" id="filter-q-status">
            <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>すべて</option>
            <option value="open" ${filterStatus === 'open' ? 'selected' : ''}>未回答</option>
            <option value="answered" ${filterStatus === 'answered' ? 'selected' : ''}>回答済み</option>
            <option value="resolved" ${filterStatus === 'resolved' ? 'selected' : ''}>解決済み</option>
          </select>
        </div>
        ${isStudent() ? `
          <button class="btn btn-primary btn-sm" id="add-question-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            質問する
          </button>
        ` : ''}
      </div>

      <div class="question-list animate-slideUp">
        ${questions.length > 0 ? questions.map(q => `
          <div class="question-card" data-id="${q.id}">
            <div class="question-card-header">
              <div class="question-card-meta">
                ${q.studentName ? `<span class="text-sm"><span class="avatar avatar-sm">${q.studentAvatar}</span> ${q.studentName}</span>` : ''}
                <span class="badge badge-sm" style="background: ${settings.subjectColors[q.subject]}20; color: ${settings.subjectColors[q.subject]}">${q.subject}</span>
                <span class="status-dot status-${q.status}"></span>
                <span class="text-muted text-sm">${getStatusLabel(q.status)}</span>
              </div>
              <span class="text-muted text-xs">${formatRelativeTime(q.createdAt)}</span>
            </div>

            ${q.imageData ? `
              <div class="question-image-container">
                <img src="${q.imageData}" alt="質問画像" class="question-image" onclick="this.classList.toggle('expanded')" />
              </div>
            ` : ''}

            <div class="question-comment">
              <p>${q.comment || ''}</p>
            </div>

            ${q.teacherReply ? `
              <div class="question-reply">
                <div class="question-reply-header">
                  <span class="avatar avatar-sm">🍎</span>
                  <span class="text-sm font-medium">先生の回答</span>
                </div>
                <p>${q.teacherReply}</p>
              </div>
            ` : ''}

            <div class="question-card-actions">
              ${isTeacher() && q.status !== 'resolved' ? `
                <button class="btn btn-sm btn-primary reply-btn" data-id="${q.id}">回答する</button>
              ` : ''}
              ${isStudent() && q.status === 'answered' ? `
                <button class="btn btn-sm btn-primary resolve-btn" data-id="${q.id}">解決済みにする</button>
              ` : ''}
              ${isStudent() && q.status === 'open' ? `
                <button class="btn btn-sm btn-ghost delete-q-btn" data-id="${q.id}" style="color:var(--status-danger)">削除</button>
              ` : ''}
            </div>
          </div>
        `).join('') : `
          <div class="empty-state">
            <div class="empty-state-icon">💡</div>
            <p class="empty-state-text">${isStudent() ? '質問はまだありません。分からないことがあれば質問しましょう！' : '質問はまだありません'}</p>
          </div>
        `}
      </div>
    </div>
  `;

  // イベント
  setupQuestionEvents(container, settings, questions);
}

function setupQuestionEvents(container, settings, questions) {
  // フィルター
  document.getElementById('filter-q-status')?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    renderQuestions(container);
  });

  // 生徒選択
  container.querySelectorAll('.student-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStudentId = btn.dataset.student || null;
      renderQuestions(container);
    });
  });

  // 質問追加
  document.getElementById('add-question-btn')?.addEventListener('click', () => {
    showQuestionForm(container, settings);
  });

  // 回答
  container.querySelectorAll('.reply-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = questions.find(q => q.id === btn.dataset.id);
      if (q) showReplyForm(container, q);
    });
  });

  // 解決済み
  container.querySelectorAll('.resolve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      updateQuestion(btn.dataset.id, { status: 'resolved' });
      showToast('質問を解決済みにしました', 'success');
      renderQuestions(container);
    });
  });

  // 削除
  container.querySelectorAll('.delete-q-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('この質問を削除しますか？')) {
        // 実際はdeleteする（storeに追加が必要だが、ここではstatusをdeletedに）
        updateQuestion(btn.dataset.id, { status: 'deleted' });
        showToast('質問を削除しました', 'info');
        renderQuestions(container);
      }
    });
  });
}

function showQuestionForm(container, settings) {
  showModal(`
    <form id="question-form">
      <div class="input-group">
        <label>教科</label>
        <select class="select" name="subject" required>
          ${settings.subjects.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="input-group">
        <label>スクリーンショット</label>
        <div class="question-upload" id="question-upload">
          <input type="file" id="question-file" accept="image/*" style="display:none" />
          <div class="upload-area" id="upload-area">
            <div class="upload-icon">📷</div>
            <p>クリックまたはドラッグ&ドロップで画像を追加</p>
            <p class="text-muted text-xs">PNG, JPG, JPEG</p>
          </div>
          <div class="upload-preview" id="upload-preview" style="display:none">
            <img id="preview-img" alt="プレビュー" />
            <button type="button" class="btn btn-sm btn-ghost" id="remove-image">✕ 削除</button>
          </div>
        </div>
      </div>
      <div class="input-group">
        <label>どこが分からないですか？</label>
        <textarea class="textarea" name="comment" placeholder="分からないところを説明してください..." rows="4" required></textarea>
      </div>
    </form>
  `, {
    title: '質問する',
    footer: `
      <button class="btn btn-ghost" id="modal-cancel">キャンセル</button>
      <button class="btn btn-primary" id="modal-save">投稿する</button>
    `,
  });

  let imageData = null;

  // ファイルアップロード
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('question-file');
  const preview = document.getElementById('upload-preview');
  const previewImg = document.getElementById('preview-img');

  uploadArea?.addEventListener('click', () => fileInput?.click());

  uploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea?.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  });

  document.getElementById('remove-image')?.addEventListener('click', () => {
    imageData = null;
    uploadArea.style.display = '';
    preview.style.display = 'none';
  });

  function processFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('画像ファイルを選択してください', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('画像は5MB以下にしてください', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      imageData = e.target.result;
      previewImg.src = imageData;
      uploadArea.style.display = 'none';
      preview.style.display = '';
    };
    reader.readAsDataURL(file);
  }

  // 送信
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-save')?.addEventListener('click', () => {
    const form = document.getElementById('question-form');
    const fd = new FormData(form);
    const comment = fd.get('comment');
    const subject = fd.get('subject');

    if (!comment) {
      showToast('質問内容を入力してください', 'warning');
      return;
    }

    addQuestion({
      studentId: selectedStudentId || getCurrentUser().id,
      subject,
      imageData,
      comment,
      teacherReply: '',
      status: 'open',
      createdAt: new Date().toISOString(),
    });

    showToast('質問を投稿しました！先生の回答をお待ちください。', 'success');
    closeModal();
    renderQuestions(container);
  });
}

function showReplyForm(container, question) {
  showModal(`
    <div class="question-detail">
      ${question.imageData ? `<img src="${question.imageData}" alt="質問画像" class="question-detail-image" />` : ''}
      <p class="question-detail-comment">${question.comment}</p>
    </div>
    <div class="input-group">
      <label>回答</label>
      <textarea class="textarea" id="reply-text" placeholder="回答を入力..." rows="4">${question.teacherReply || ''}</textarea>
    </div>
  `, {
    title: `${question.subject} の質問に回答`,
    footer: `
      <button class="btn btn-ghost" id="modal-cancel">キャンセル</button>
      <button class="btn btn-primary" id="modal-save">回答する</button>
    `,
  });

  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-save')?.addEventListener('click', () => {
    const reply = document.getElementById('reply-text')?.value;
    if (!reply) {
      showToast('回答を入力してください', 'warning');
      return;
    }
    updateQuestion(question.id, { teacherReply: reply, status: 'answered' });
    showToast('回答を送信しました', 'success');
    closeModal();
    renderQuestions(container);
  });
}

function getStatusLabel(status) {
  switch (status) {
    case 'open': return '未回答';
    case 'answered': return '回答済み';
    case 'resolved': return '解決済み';
    default: return status;
  }
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
