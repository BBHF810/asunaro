// 設定ページ
import { getCurrentUser, isTeacher } from '../auth.js';
import { getUsers, updateUser, getSettings, updateSettings, exportData, importData, getStudents } from '../store.js';
import { updatePageTitle, showToast, refreshAppShell } from '../app.js';
import { navigate } from '../router.js';
import { renderSidebar } from '../components/sidebar.js';

export function renderSettings(container) {
  updatePageTitle('設定');
  const user = getCurrentUser();
  const users = getUsers();
  const settings = getSettings();

  const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];

  container.innerHTML = `
    <div class="settings-page">

      <div class="settings-section card animate-slideUp">
        <div class="card-header">
          <h3 class="card-title">👤 プロフィール</h3>
        </div>
        <div class="card-body">
          <div class="settings-item">
            <label>表示名</label>
            <input class="input" id="user-name" value="${user.name}" placeholder="名前を入力" />
          </div>
          <div class="settings-item">
            <label>アバター</label>
            <div class="avatar-selector">
              ${['🍎', '📚', '✏️', '👨‍👩‍👧‍👦', '🌟', '🎓', '📝', '🦉', '🌸', '🎯', '🚀', '💡'].map(emoji => `
                <button class="avatar-option ${user.avatar === emoji ? 'selected' : ''}" data-avatar="${emoji}">${emoji}</button>
              `).join('')}
            </div>
          </div>
          <button class="btn btn-primary" id="save-profile">プロフィールを保存</button>
        </div>
      </div>

      ${isTeacher() ? `
        <div class="settings-section card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">👨‍🎓 生徒名の変更</h3>
          </div>
          <div class="card-body">
            ${getStudents().map(student => `
              <div class="settings-item">
                <label>${student.avatar} ${student.name}</label>
                <input class="input student-name-input" data-student-id="${student.id}" value="${student.name}" placeholder="生徒名" />
              </div>
            `).join('')}
            <button class="btn btn-primary" id="save-student-names">生徒名を保存</button>
          </div>
        </div>
      ` : ''}

      ${isTeacher() ? `
        <div class="settings-section card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">📅 授業スケジュール</h3>
          </div>
          <div class="card-body">
            <p class="text-muted text-sm" style="margin-bottom: var(--space-3)">授業のある曜日と時間を設定します。</p>
            <div class="schedule-config">
              ${DAYS_OF_WEEK.map((day, idx) => {
                const existing = settings.lessonDays?.find(d => d.dayOfWeek === idx);
                return `
                  <div class="schedule-day-row">
                    <label class="schedule-day-toggle">
                      <input type="checkbox" class="schedule-day-check" data-day="${idx}" ${existing ? 'checked' : ''} />
                      <span class="schedule-day-name">${day}曜日</span>
                    </label>
                    <input class="input input-sm schedule-time" data-day="${idx}" type="time"
                           value="${existing?.time || '19:00'}" ${!existing ? 'disabled' : ''} />
                  </div>
                `;
              }).join('')}
            </div>
            <button class="btn btn-primary" id="save-schedule" style="margin-top: var(--space-4)">スケジュールを保存</button>
          </div>
        </div>
      ` : `
        <div class="settings-section card animate-slideUp">
          <div class="card-header">
            <h3 class="card-title">📅 授業スケジュール</h3>
          </div>
          <div class="card-body">
            ${settings.lessonDays?.length > 0 ? `
              <div class="schedule-display">
                ${settings.lessonDays.map(d => `
                  <div class="schedule-display-item">
                    <span class="badge badge-sm">${DAYS_OF_WEEK[d.dayOfWeek]}曜日</span>
                    <span>${d.time}</span>
                  </div>
                `).join('')}
              </div>
            ` : `<p class="text-muted">授業スケジュールが設定されていません</p>`}
          </div>
        </div>
      `}

      <div class="settings-section card animate-slideUp">
        <div class="card-header">
          <h3 class="card-title">💾 データ管理</h3>
        </div>
        <div class="card-body">
          <div class="settings-item">
            <div>
              <h4>データのエクスポート</h4>
              <p class="text-muted text-sm">すべてのデータをJSONファイルとしてダウンロードします。</p>
            </div>
            <button class="btn btn-secondary" id="export-btn">📥 エクスポート</button>
          </div>
          <div class="settings-item" style="margin-top: var(--space-4)">
            <div>
              <h4>データのインポート</h4>
              <p class="text-muted text-sm">エクスポートしたJSONファイルからデータを復元します。</p>
            </div>
            <div>
              <input type="file" id="import-file" accept=".json" style="display:none" />
              <button class="btn btn-secondary" id="import-btn">📤 インポート</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // イベント
  setupSettingsEvents(container);
}

function setupSettingsEvents(container) {
  const user = getCurrentUser();
  let selectedAvatar = user.avatar;

  // アバター選択
  container.querySelectorAll('.avatar-option').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedAvatar = btn.dataset.avatar;
    });
  });

  // プロフィール保存
  document.getElementById('save-profile')?.addEventListener('click', () => {
    const name = document.getElementById('user-name')?.value;
    if (!name) {
      showToast('名前を入力してください', 'warning');
      return;
    }
    updateUser(user.id, { name, avatar: selectedAvatar });
    showToast('プロフィールを更新しました', 'success');
    // サイドバーとヘッダーを更新
    refreshAppShell();
    navigate('/settings');
  });

  // 生徒名保存
  document.getElementById('save-student-names')?.addEventListener('click', () => {
    container.querySelectorAll('.student-name-input').forEach(input => {
      const studentId = input.dataset.studentId;
      const name = input.value;
      if (name) updateUser(studentId, { name });
    });
    showToast('生徒名を更新しました', 'success');
  });

  // スケジュールチェックボックス
  container.querySelectorAll('.schedule-day-check').forEach(check => {
    check.addEventListener('change', () => {
      const dayIdx = check.dataset.day;
      const timeInput = container.querySelector(`.schedule-time[data-day="${dayIdx}"]`);
      if (timeInput) timeInput.disabled = !check.checked;
    });
  });

  // スケジュール保存
  document.getElementById('save-schedule')?.addEventListener('click', () => {
    const lessonDays = [];
    container.querySelectorAll('.schedule-day-check').forEach(check => {
      if (check.checked) {
        const dayIdx = parseInt(check.dataset.day);
        const time = container.querySelector(`.schedule-time[data-day="${dayIdx}"]`)?.value || '19:00';
        lessonDays.push({ dayOfWeek: dayIdx, time });
      }
    });
    updateSettings({ lessonDays });
    showToast('授業スケジュールを保存しました', 'success');
  });

  // エクスポート
  document.getElementById('export-btn')?.addEventListener('click', () => {
    const jsonStr = exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asunaro_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('データをエクスポートしました', 'success');
  });

  // インポート
  const importFile = document.getElementById('import-file');
  document.getElementById('import-btn')?.addEventListener('click', () => importFile?.click());

  importFile?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = importData(ev.target.result);
        if (result.success) {
          showToast('データをインポートしました！ページを再読み込みします...', 'success');
          setTimeout(() => location.reload(), 1500);
        } else {
          showToast(`インポートに失敗しました: ${result.error}`, 'error');
        }
      } catch (err) {
        showToast('無効なファイルです', 'error');
      }
    };
    reader.readAsText(file);
  });
}
