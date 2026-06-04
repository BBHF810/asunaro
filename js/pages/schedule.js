// 週間予定表ページ
import { getCurrentUser, isTeacher, isStudent } from '../auth.js';
import { getWeeklyPlan, saveWeeklyPlan, getStudents, getSettings, getWeekStart, formatDate, getAssignments, addAssignment, updateAssignment, deleteAssignment } from '../store.js';
import { updatePageTitle, showToast } from '../app.js';

const DAYS = ['月', '火', '水', '木', '金', '土'];

let currentWeekStart = null;
let selectedStudentId = null;
let initialized = false;

export function renderSchedule(container) {
  updatePageTitle('週間予定表');
  const user = getCurrentUser();
  const students = getStudents();
  const settings = getSettings();
  const subjects = settings.subjects;

  // URLパラメータからstudentIdを取得（初回表示 or パラメータ指定時のみ）
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
  currentWeekStart = currentWeekStart || getWeekStart(new Date());

  const plan = getWeeklyPlan(selectedStudentId, currentWeekStart) || createEmptyPlan(selectedStudentId, currentWeekStart, subjects);
  const assignments = getAssignments(selectedStudentId);
  const canEdit = isTeacher() || (isStudent() && user.id === selectedStudentId);
  const selectedStudent = students.find(s => s.id === selectedStudentId) || user;

  // 週の日付を計算
  const weekStartDate = new Date(currentWeekStart);
  const weekDates = DAYS.map((_, i) => {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });

  container.innerHTML = `
    <div class="schedule-page">
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

      <div class="week-navigator animate-fadeIn">
        <button class="btn btn-ghost btn-icon" id="prev-week" aria-label="前週">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div class="week-label">
          <span class="week-range">${formatWeekRange(currentWeekStart)}</span>
          <button class="btn btn-ghost btn-sm" id="today-btn">今週</button>
        </div>
        <button class="btn btn-ghost btn-icon" id="next-week" aria-label="次週">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      ${isTeacher() ? `
        <div class="teacher-comment-section card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">📝 先生からのひと言</h3>
          </div>
          <div class="card-body">
            <textarea class="textarea" id="teacher-comment" placeholder="今週のコメントを入力..."
              ${!isTeacher() ? 'readonly' : ''}>${plan.teacherComment || ''}</textarea>
          </div>
        </div>
      ` : plan.teacherComment ? `
        <div class="teacher-comment-section card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">📝 先生からのひと言</h3>
          </div>
          <div class="card-body">
            <p class="teacher-comment-text">${plan.teacherComment}</p>
          </div>
        </div>
      ` : ''}

      <div class="goals-section card animate-slideUp">
        <div class="card-header">
          <h3 class="card-title">🎯 今週の目標</h3>
        </div>
        <div class="card-body">
          <div class="goals-grid">
            ${subjects.map(subject => `
              <div class="goal-item">
                <span class="badge" style="background: ${settings.subjectColors[subject]}20; color: ${settings.subjectColors[subject]}">${subject}</span>
                ${canEdit ? `
                  <input class="input input-sm goal-input" data-subject="${subject}"
                         value="${plan.goals?.[subject] || ''}"
                         placeholder="目標を入力..." />
                ` : `
                  <span class="goal-text">${plan.goals?.[subject] || '—'}</span>
                `}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="weekly-table-container card animate-slideUp">
        <div class="card-body" style="overflow-x: auto; padding: 0;">
          <table class="weekly-table" id="weekly-table">
            <thead>
              <tr>
                <th class="day-col">曜日</th>
                <th class="type-col"></th>
                ${subjects.map(subject => `
                  <th style="background: ${settings.subjectColors[subject]}15; border-bottom: 3px solid ${settings.subjectColors[subject]}">
                    ${subject}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${DAYS.map((day, dayIdx) => {
                const currentDate = weekDates[dayIdx];
                return `
                  <tr class="row-single">
                    <td class="day-label">${day}</td>
                    <td class="type-label type-preview" style="font-size: 0.7rem;">宿題</td>
                    ${subjects.map(subject => {
                      const cellKey = `${dayIdx}-${subject}`;
                      // その日・その教科の宿題を探す（複数ある場合は最初の1つを表示）
                      const assignment = assignments.find(a => a.scheduledDate === currentDate && a.subject === subject);
                      const content = assignment ? assignment.content : '';
                      const isCompleted = assignment ? (assignment.status === 'completed') : false;
                      const assignmentId = assignment ? assignment.id : '';

                      return `
                        <td class="cell ${isCompleted ? 'completed' : ''}"
                            data-key="${cellKey}" data-date="${currentDate}" data-subject="${subject}" data-assignment-id="${assignmentId}">
                          ${canEdit ? `
                            <div class="cell-wrapper">
                              <input class="cell-input" value="${content}" name="cell-${cellKey}" aria-label="${day} ${subject} 宿題"
                                     placeholder="·" data-cell-key="${cellKey}" />
                              <button class="cell-check ${isCompleted ? 'checked' : ''}"
                                      data-cell-key="${cellKey}" aria-label="完了">
                                ${isCompleted ? '✓' : ''}
                              </button>
                            </div>
                          ` : `
                            <div class="cell-wrapper readonly">
                              <span class="cell-text">${content}</span>
                              ${isCompleted ? '<span class="cell-check checked">✓</span>' : ''}
                            </div>
                          `}
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${isStudent() ? `
        <div class="reflection-section card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">💪 今週がんばったこと</h3>
          </div>
          <div class="card-body">
            <textarea class="textarea" id="reflection" placeholder="今週がんばったことを書きましょう...">${plan.reflection || ''}</textarea>
          </div>
        </div>
      ` : plan.reflection ? `
        <div class="reflection-section card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">💪 ${selectedStudent.name}のがんばったこと</h3>
          </div>
          <div class="card-body">
            <p>${plan.reflection}</p>
          </div>
        </div>
      ` : ''}

      ${canEdit ? `
        <div class="schedule-actions">
          <button class="btn btn-primary" id="save-schedule">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            保存する
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // イベントリスナー
  setupScheduleEvents(container, plan, subjects);
}

function setupScheduleEvents(container, plan, subjects) {
  // 週のナビゲーション
  document.getElementById('prev-week')?.addEventListener('click', () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    currentWeekStart = formatDate(d);
    renderSchedule(container);
  });

  document.getElementById('next-week')?.addEventListener('click', () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    currentWeekStart = formatDate(d);
    renderSchedule(container);
  });

  document.getElementById('today-btn')?.addEventListener('click', () => {
    currentWeekStart = getWeekStart(new Date());
    renderSchedule(container);
  });

  // 生徒選択
  container.querySelectorAll('.student-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStudentId = btn.dataset.student;
      renderSchedule(container);
    });
  });

  // セルのチェックボタン
  container.querySelectorAll('.cell-check').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.cellKey;
      const cell = plan.cells?.find(c => c.key === key);
      if (cell) {
        cell.completed = !cell.completed;
      } else {
        if (!plan.cells) plan.cells = [];
        plan.cells.push({ key, content: '', completed: true });
      }
      btn.classList.toggle('checked');
      btn.textContent = btn.classList.contains('checked') ? '✓' : '';
      btn.closest('td')?.classList.toggle('completed');
    });
  });

  // 保存ボタン
  document.getElementById('save-schedule')?.addEventListener('click', () => {
    // 目標・コメントの収集
    const goals = {};
    container.querySelectorAll('.goal-input').forEach(input => {
      if (input.value.trim()) goals[input.dataset.subject] = input.value.trim();
    });
    
    const teacherComment = document.getElementById('teacher-comment')?.value || '';
    const reflection = document.getElementById('reflection')?.value || plan.reflection || '';

    // セル（宿題）の収集と保存
    container.querySelectorAll('.cell').forEach(td => {
      const input = td.querySelector('.cell-input');
      if (!input) return; // read-only mode

      const content = input.value.trim();
      const checkBtn = td.querySelector('.cell-check');
      const isCompleted = checkBtn ? checkBtn.classList.contains('checked') : false;
      const status = isCompleted ? 'completed' : 'pending';
      
      const assignmentId = td.dataset.assignmentId;
      const date = td.dataset.date;
      const subject = td.dataset.subject;

      if (content) {
        if (assignmentId) {
          // 既存を更新
          updateAssignment(assignmentId, { content, status });
        } else {
          // 新規作成
          const newAssignment = addAssignment({
            studentId: selectedStudentId,
            subject: subject,
            content: content,
            status: status,
            scheduledDate: date
          });
          td.dataset.assignmentId = newAssignment.id; // 即座にIDを反映
        }
      } else {
        if (assignmentId) {
          // 内容が空になった場合は削除
          deleteAssignment(assignmentId);
          td.dataset.assignmentId = '';
        }
      }
    });

    saveWeeklyPlan({
      ...plan,
      studentId: selectedStudentId,
      weekStart: currentWeekStart,
      goals,
      teacherComment,
      reflection,
      cells: [] // cellsはもう使わないが互換性のため空配列を入れる
    });

    showToast('予定と宿題を保存しました', 'success');
  });
}

function createEmptyPlan(studentId, weekStart, subjects) {
  return {
    id: null,
    studentId,
    weekStart,
    goals: {},
    teacherComment: '',
    reflection: '',
    cells: [],
  };
}

function formatWeekRange(weekStart) {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 5); // 月～土
  return `${start.getMonth() + 1}/${start.getDate()} ～ ${end.getMonth() + 1}/${end.getDate()}`;
}
