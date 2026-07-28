(function () {
  const ADMIN_SESSION_KEY = 'ksse_reg_admin_session';
  const ADMIN_PASSWORD = 'ksse2026';

  const gate = document.getElementById('admin-gate');
  const app = document.getElementById('admin-app');
  const loginForm = document.getElementById('login-form');
  const listEl = document.getElementById('reg-list');
  const emptyEl = document.getElementById('reg-empty');
  const countEl = document.getElementById('reg-count');
  const fetchErr = document.getElementById('admin-fetch-error');

  if (!gate || !app) return;

  let rows = [];
  let adminPassword = '';

  function isAuthed() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  }

  function setAuthed(on) {
    if (on) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    else sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString('ko-KR');
    } catch {
      return iso;
    }
  }

  function showApp(on) {
    gate.hidden = on;
    app.hidden = !on;
    if (on) loadRows();
  }

  async function loadRows() {
    fetchErr.hidden = true;
    try {
      rows = await window.KSSE.fetchRegistrationsAdmin(adminPassword);
    } catch {
      rows = window.KSSE.getRegistrationsLocal().slice().sort((a, b) => b.id - a.id);
      fetchErr.hidden = false;
      fetchErr.textContent =
        '서버 DB를 불러오지 못했습니다. PHP(api/registrations.php) 호스팅 여부를 확인해 주세요. (현재: 이 브라우저 localStorage 목록 표시)';
    }
    renderTable();
  }

  function renderTable() {
    countEl.textContent = String(rows.length);
    if (!rows.length) {
      listEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    listEl.innerHTML = rows
      .map(
        (r, i) => `
      <tr>
        <td>${rows.length - i}</td>
        <td>${escapeHtml(formatDate(r.createdAt))}</td>
        <td>${escapeHtml(r.name)}</td>
        <td class="reg-col-title">${escapeHtml(r.org)}<br><span class="reg-sub">${escapeHtml(r.orgType)} · ${escapeHtml(r.title)}</span></td>
        <td>${escapeHtml(r.phone)}</td>
        <td>${escapeHtml(r.email)}</td>
        <td class="reg-col-forum">${escapeHtml(r.forumApplyLabel || r.forumApply || '-')}</td>
      </tr>`
      )
      .join('');
  }

  function exportCsv() {
    if (!rows.length) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }
    const headers = [
      '신청ID',
      '신청일시',
      '이름',
      '소속',
      '소속유형',
      '직함직책',
      '휴대폰',
      '이메일',
      '포럼참가',
      '확인비밀번호',
    ];
    const lines = [headers.join(',')];
    rows.forEach((r) => {
      const cols = [
        r.id,
        formatDate(r.createdAt),
        r.name,
        r.org,
        r.orgType,
        r.title,
        r.phone,
        r.email,
        r.forumApplyLabel || r.forumApply,
        r.password,
      ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`);
      lines.push(cols.join(','));
    });
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ksse_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw = loginForm.password.value;
    const err = document.getElementById('err-login');
    if (pw !== ADMIN_PASSWORD) {
      err?.classList.add('is-visible');
      return;
    }
    err?.classList.remove('is-visible');
    adminPassword = pw;
    setAuthed(true);
    showApp(true);
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    adminPassword = '';
    setAuthed(false);
    showApp(false);
  });

  document.getElementById('btn-refresh')?.addEventListener('click', () => loadRows());
  document.getElementById('btn-export')?.addEventListener('click', exportCsv);

  if (isAuthed()) {
    adminPassword = ADMIN_PASSWORD;
    showApp(true);
  } else {
    showApp(false);
  }
})();
