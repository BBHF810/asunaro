// 教材ライブラリページ
import { updatePageTitle } from '../app.js';
import { getSettings } from '../store.js';
import { materialsData } from '../data/materials.js';

export async function renderMaterials(container) {
  updatePageTitle('教材ライブラリ', '📚');

  const settings = getSettings();


  renderUI(container, settings, '中1', '');
}

function renderUI(container, settings, selectedGrade, selectedSubject) {
  // フィルタリング
  let filtered = materialsData.filter(m => m.grade === selectedGrade);
  if (selectedSubject) {
    filtered = filtered.filter(m => m.subject === selectedSubject);
  }

  // 解答と通常ファイルを分けるより、同じカード内でうまく表示するか、並べるか
  // ここではシンプルにリストにする

  container.innerHTML = `
    <div class="materials-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-6);">
      <div style="display:flex; gap:var(--space-2);">
        ${['中1', '中2', '中3'].map(g => `
          <button class="btn btn-sm ${selectedGrade === g ? 'btn-primary' : 'btn-secondary'} filter-grade-btn" data-grade="${g}">
            ${g}
          </button>
        `).join('')}
      </div>
      <div style="display:flex; gap:var(--space-2);">
        <button class="btn btn-sm ${selectedSubject === '' ? 'btn-primary' : 'btn-ghost'} filter-subject-btn" data-subject="">すべて</button>
        ${['国語', '数学', '英語'].map(s => `
          <button class="btn btn-sm ${selectedSubject === s ? 'btn-primary' : 'btn-ghost'} filter-subject-btn" data-subject="${s}">
            ${s}
          </button>
        `).join('')}
      </div>
    </div>

    ${filtered.length > 0 ? `
      <div class="grid-3">
        ${filtered.map(m => `
          <div class="card materials-card animate-slideUp">
            <div class="card-body" style="display:flex; flex-direction:column; height:100%;">
              <div style="display:flex; gap:var(--space-2); margin-bottom:var(--space-3);">
                <span class="badge badge-sm" style="background:${settings.subjectColors[m.subject] || '#666'}30; color:${settings.subjectColors[m.subject] || '#999'};">${m.subject}</span>
                <span class="badge badge-sm" style="background:var(--bg-surface); color:var(--text-secondary);">${m.type}</span>
                ${m.isAnswer ? '<span class="badge badge-sm" style="background:rgba(231, 76, 60, 0.2); color:var(--status-danger);">解答</span>' : ''}
              </div>
              <h3 style="font-size:var(--text-md); margin-bottom:var(--space-4); flex-grow:1;">
                ${m.title}
              </h3>
              <a href=".${m.path}" target="_blank" class="btn btn-sm btn-primary" style="text-align:center; display:block; width:100%;">
                開く <svg style="display:inline; margin-left:4px; vertical-align:middle;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <p class="text-muted">該当する教材がありません</p>
      </div>
    `}
  `;

  // イベント登録
  container.querySelectorAll('.filter-grade-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      renderUI(container, settings, e.target.dataset.grade, selectedSubject);
    });
  });

  container.querySelectorAll('.filter-subject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      renderUI(container, settings, selectedGrade, e.target.dataset.subject);
    });
  });
}
