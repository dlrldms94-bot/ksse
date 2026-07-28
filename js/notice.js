document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('notice-list');
  const emptyEl = document.getElementById('notice-empty');
  const paginationEl = document.getElementById('notice-pagination');
  const viewRoot = document.getElementById('notice-view');

  if (viewRoot) {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const notice = window.KSSE.getNotice(id);
    if (!notice) {
      viewRoot.innerHTML = `
        <h2 class="section-title"><span class="dot"></span>공지사항</h2>
        <p class="notice-empty">존재하지 않는 게시글입니다.</p>
        <div class="btn-group"><a class="btn btn-outline" href="notice.html">목록으로</a></div>`;
      return;
    }
    viewRoot.innerHTML = `
      <h2 class="section-title"><span class="dot"></span>공지사항</h2>
      <h3 class="notice-view-title">${escapeHtml(notice.title)}</h3>
      <div class="notice-view-meta">
        <span>번호 ${notice.id}</span>
        <span>${escapeHtml(notice.date)}</span>
      </div>
      <div class="notice-view-body">${window.KSSE.renderNoticeBlocks(notice)}</div>
      <div class="btn-group"><a class="btn btn-outline" href="notice.html">목록으로</a></div>`;
    return;
  }

  if (!listEl) return;

  const PER_PAGE = 10;
  let page = 1;
  const notices = window.KSSE.getNotices().slice().sort((a, b) => b.id - a.id);

  function render() {
    const total = notices.length;
    if (!total) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const start = (page - 1) * PER_PAGE;
    const slice = notices.slice(start, start + PER_PAGE);
    listEl.innerHTML = slice
      .map(
        (n, i) => `
      <tr data-id="${n.id}">
        <td>${total - (start + i)}</td>
        <td class="title">${escapeHtml(n.title)}</td>
        <td>${escapeHtml(n.date)}</td>
      </tr>`
      )
      .join('');

    listEl.querySelectorAll('tr').forEach((tr) => {
      tr.addEventListener('click', () => {
        location.href = `notice-view.html?id=${tr.dataset.id}`;
      });
    });

    const pages = Math.ceil(total / PER_PAGE);
    if (paginationEl) {
      paginationEl.innerHTML = Array.from({ length: pages }, (_, i) => {
        const p = i + 1;
        return `<button type="button" class="${p === page ? 'is-active' : ''}" data-page="${p}">${p}</button>`;
      }).join('');
      paginationEl.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          page = Number(btn.dataset.page);
          render();
        });
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  render();
});
