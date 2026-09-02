(function () {
  const GROUP_CLASS = {
    A: 'exhibitor-row--a',
    B: 'exhibitor-row--b',
    C: 'exhibitor-row--c',
    D: 'exhibitor-row--d',
    E: 'exhibitor-row--e',
    F: 'exhibitor-row--f',
    G: 'exhibitor-row--g',
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatLines(text) {
    return escapeHtml(text)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join('<br>');
  }

  function formatInline(text) {
    return escapeHtml(String(text || '').replace(/\s+/g, ' ').trim());
  }

  function renderExhibitors(items) {
    const tbody = document.getElementById('exhibitor-list-body');
    const emptyEl = document.getElementById('exhibitor-list-empty');
    if (!tbody) return;

    if (!items.length) {
      tbody.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    tbody.innerHTML = items
      .map((item) => {
        const prefix = String(item.booth || '').charAt(0).toUpperCase();
        const rowClass = GROUP_CLASS[prefix] || '';
        return `
          <tr class="exhibitor-row ${rowClass}">
            <th scope="row" class="exhibitor-cell exhibitor-cell--booth">${escapeHtml(item.booth)}</th>
            <td class="exhibitor-cell exhibitor-cell--name">${formatLines(item.name)}</td>
            <td class="exhibitor-cell exhibitor-cell--desc">${formatInline(item.desc)}</td>
          </tr>`;
      })
      .join('');
  }

  async function initExhibitorList() {
    try {
      const res = await fetch('/data/exhibitors.json');
      if (!res.ok) throw new Error('failed');
      const items = await res.json();
      renderExhibitors(Array.isArray(items) ? items : []);
    } catch {
      renderExhibitors([]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExhibitorList);
  } else {
    initExhibitorList();
  }
})();
