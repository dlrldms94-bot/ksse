(function () {
  const ADMIN_SESSION_KEY = 'ksse_popup_admin_session';
  const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

  const gate = document.getElementById('admin-gate');
  const app = document.getElementById('admin-app');
  const loginForm = document.getElementById('login-form');
  const listSection = document.getElementById('admin-list-section');
  const editorSection = document.getElementById('admin-editor-section');
  const listBody = document.getElementById('admin-popup-list');
  const listEmpty = document.getElementById('admin-list-empty');
  const popupForm = document.getElementById('popup-form');
  const editorHeading = document.getElementById('editor-heading');
  const imageUrlInput = document.getElementById('popup-image-url');
  const imagePreview = document.getElementById('popup-image-preview');
  const imageFileInput = document.getElementById('popup-image-file');
  const clearImageBtn = document.getElementById('btn-clear-image');

  if (!gate || !app) return;

  let popupsCache = [];

  function isAuthed() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1' && !!window.KSSE.getAdminToken();
  }

  function setAuthed(on) {
    if (on) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      window.KSSE.adminLogout();
    }
  }

  function showApp(on) {
    gate.hidden = on;
    app.hidden = !on;
    if (on) renderList();
  }

  function handleAdminError(error) {
    if (error && error.status === 401) {
      setAuthed(false);
      showApp(false);
      document.getElementById('err-login')?.classList.add('is-visible');
      return true;
    }
    return false;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatPeriod(popup) {
    const start = popup.startsAt || '—';
    const end = popup.endsAt || '—';
    if (!popup.startsAt && !popup.endsAt) return '제한 없음';
    return `${start} ~ ${end}`;
  }

  function statusBadge(popup) {
    if (!popup.enabled) return '<span class="popup-badge popup-badge--off">OFF</span>';
    return '<span class="popup-badge popup-badge--on">ON</span>';
  }

  function setImagePreview(url) {
    if (url) {
      imagePreview.src = url;
      imagePreview.hidden = false;
      clearImageBtn.hidden = false;
    } else {
      imagePreview.removeAttribute('src');
      imagePreview.hidden = true;
      clearImageBtn.hidden = true;
    }
  }

  function showEditor(show) {
    listSection.hidden = show;
    editorSection.hidden = !show;
  }

  function resetForm() {
    popupForm.reset();
    document.getElementById('popup-id').value = '';
    imageUrlInput.value = '';
    document.getElementById('popup-link-label').value = '자세히 보기';
    setImagePreview('');
    imageFileInput.value = '';
  }

  function openEditor(popup) {
    resetForm();
    if (popup) {
      editorHeading.textContent = '팝업 수정';
      document.getElementById('popup-id').value = popup.id;
      document.getElementById('popup-title').value = popup.title;
      document.getElementById('popup-body').value = popup.body;
      imageUrlInput.value = popup.imageUrl || '';
      document.getElementById('popup-link-url').value = popup.linkUrl || '';
      document.getElementById('popup-link-label').value = popup.linkLabel || '자세히 보기';
      document.getElementById('popup-starts').value = popup.startsAt || '';
      document.getElementById('popup-ends').value = popup.endsAt || '';
      document.getElementById('popup-enabled').checked = !!popup.enabled;
      setImagePreview(popup.imageUrl || '');
    } else {
      editorHeading.textContent = '팝업 작성';
    }
    showEditor(true);
  }

  async function renderList() {
    try {
      const json = await window.KSSE.adminNoticeRequest('/api/admin/popups');
      popupsCache = json.popups || [];
    } catch (error) {
      if (handleAdminError(error)) return;
      alert(error.message || '팝업 목록을 불러오지 못했습니다.');
      return;
    }

    if (!popupsCache.length) {
      listBody.innerHTML = '';
      listEmpty.hidden = false;
      return;
    }

    listEmpty.hidden = true;
    listBody.innerHTML = popupsCache
      .map(
        (popup, index) => `
      <tr>
        <td>${popupsCache.length - index}</td>
        <td class="popup-col-title">${escapeHtml(popup.title || '(제목 없음)')}</td>
        <td>${statusBadge(popup)}</td>
        <td class="popup-col-period">${escapeHtml(formatPeriod(popup))}</td>
        <td>
          <div class="admin-row-actions">
            <button type="button" class="btn btn-outline btn-sm" data-edit="${popup.id}">수정</button>
            <button type="button" class="btn btn-outline btn-sm" data-delete="${popup.id}">삭제</button>
          </div>
        </td>
      </tr>`
      )
      .join('');
  }

  listBody?.addEventListener('click', async (event) => {
    const editBtn = event.target.closest('[data-edit]');
    const deleteBtn = event.target.closest('[data-delete]');

    if (editBtn) {
      const popup = popupsCache.find((p) => String(p.id) === editBtn.dataset.edit);
      if (popup) openEditor(popup);
      return;
    }

    if (deleteBtn) {
      if (!confirm('이 팝업을 삭제할까요?')) return;
      try {
        await window.KSSE.adminNoticeRequest(`/api/admin/popups/${encodeURIComponent(deleteBtn.dataset.delete)}`, {
          method: 'DELETE',
        });
        await renderList();
      } catch (error) {
        if (handleAdminError(error)) return;
        alert(error.message || '삭제에 실패했습니다.');
      }
    }
  });

  imageFileInput?.addEventListener('change', async () => {
    const file = imageFileInput.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      imageFileInput.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert('이미지는 3MB 이하여야 합니다.');
      imageFileInput.value = '';
      return;
    }
    try {
      const uploaded = await window.KSSE.adminUploadNoticeFile(file, 'image');
      imageUrlInput.value = uploaded.url;
      setImagePreview(uploaded.url);
    } catch (error) {
      if (handleAdminError(error)) return;
      alert(error.message || '이미지 업로드에 실패했습니다.');
    }
  });

  clearImageBtn?.addEventListener('click', () => {
    imageUrlInput.value = '';
    imageFileInput.value = '';
    setImagePreview('');
  });

  document.getElementById('btn-new')?.addEventListener('click', () => openEditor(null));

  document.getElementById('btn-cancel')?.addEventListener('click', () => {
    showEditor(false);
    resetForm();
  });

  popupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const idRaw = document.getElementById('popup-id').value;
    const payload = {
      title: document.getElementById('popup-title').value.trim(),
      body: document.getElementById('popup-body').value.trim(),
      imageUrl: imageUrlInput.value.trim(),
      linkUrl: document.getElementById('popup-link-url').value.trim(),
      linkLabel: document.getElementById('popup-link-label').value.trim() || '자세히 보기',
      startsAt: document.getElementById('popup-starts').value,
      endsAt: document.getElementById('popup-ends').value,
      enabled: document.getElementById('popup-enabled').checked,
    };

    try {
      if (idRaw) {
        await window.KSSE.adminNoticeRequest(`/api/admin/popups/${encodeURIComponent(idRaw)}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
        await window.KSSE.adminNoticeRequest('/api/admin/popups', {
          method: 'POST',
          body: payload,
        });
      }
      showEditor(false);
      resetForm();
      await renderList();
    } catch (error) {
      if (handleAdminError(error)) return;
      alert(error.message || '저장에 실패했습니다.');
    }
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const pw = loginForm.password.value;
    const err = document.getElementById('err-login');
    try {
      await window.KSSE.adminLogin(pw);
      err?.classList.remove('is-visible');
      setAuthed(true);
      showApp(true);
    } catch {
      err?.classList.add('is-visible');
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    setAuthed(false);
    showApp(false);
  });

  if (window.KSSE.getAdminToken()) {
    setAuthed(true);
    showApp(true);
  } else if (isAuthed()) {
    showApp(true);
  } else {
    showApp(false);
  }
})();
