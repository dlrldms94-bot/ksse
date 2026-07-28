(function () {
  const ADMIN_SESSION_KEY = 'ksse_admin_session';
  const ADMIN_PASSWORD = 'ksse2026';
  const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
  const MAX_FILE_BYTES = 5 * 1024 * 1024;

  const gate = document.getElementById('admin-gate');
  const app = document.getElementById('admin-app');
  const loginForm = document.getElementById('login-form');
  const listSection = document.getElementById('admin-list-section');
  const editorSection = document.getElementById('admin-editor-section');
  const listBody = document.getElementById('admin-notice-list');
  const listEmpty = document.getElementById('admin-list-empty');
  const noticeForm = document.getElementById('notice-form');
  const blocksRoot = document.getElementById('blocks-root');
  const editorHeading = document.getElementById('editor-heading');

  if (!gate || !app) return;

  let blocks = [];

  function isAuthed() {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  }

  function setAuthed(on) {
    if (on) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
    else sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }

  function showApp(on) {
    gate.hidden = on;
    app.hidden = !on;
    if (on) renderAdminList();
  }

  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
  }

  function blockLabel(type) {
    return { text: '텍스트', image: '이미지', file: '문서', youtube: '유튜브' }[type] || type;
  }

  function renderBlocksEditor() {
    blocksRoot.innerHTML = blocks
      .map((block, index) => {
        const upDisabled = index === 0 ? ' disabled' : '';
        const downDisabled = index === blocks.length - 1 ? ' disabled' : '';
        let body = '';
        if (block.type === 'text') {
          body = `<textarea class="block-textarea" data-field="body" rows="5">${escapeHtml(block.body || '')}</textarea>`;
        } else if (block.type === 'image') {
          body = `
            <div class="block-file-row">
              <input type="file" accept="image/*" data-field="file">
              <span class="block-file-name">${escapeHtml(block.name || '파일을 선택하세요')}</span>
            </div>
            ${block.dataUrl ? `<img class="block-preview-img" src="${block.dataUrl}" alt="">` : ''}`;
        } else if (block.type === 'file') {
          body = `
            <div class="block-file-row">
              <input type="file" data-field="file">
              <span class="block-file-name">${escapeHtml(block.name || '파일을 선택하세요')}</span>
            </div>`;
        } else if (block.type === 'youtube') {
          body = `<input class="form-control form-control-wide block-youtube-input" type="url" data-field="url" placeholder="https://www.youtube.com/watch?v=..." value="${escapeHtml(block.url || '')}">`;
        }
        return `
          <div class="block-item" data-index="${index}">
            <div class="block-item-head">
              <span class="block-item-label">${blockLabel(block.type)}</span>
              <div class="block-item-actions">
                <button type="button" data-move="up"${upDisabled}>↑</button>
                <button type="button" data-move="down"${downDisabled}>↓</button>
                <button type="button" class="block-remove" data-remove>삭제</button>
              </div>
            </div>
            ${body}
          </div>`;
      })
      .join('');

    blocksRoot.querySelectorAll('.block-item').forEach((el) => {
      const index = Number(el.dataset.index);
      el.querySelector('[data-remove]')?.addEventListener('click', () => {
        blocks.splice(index, 1);
        renderBlocksEditor();
      });
      el.querySelector('[data-move="up"]')?.addEventListener('click', () => {
        if (index <= 0) return;
        [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
        renderBlocksEditor();
      });
      el.querySelector('[data-move="down"]')?.addEventListener('click', () => {
        if (index >= blocks.length - 1) return;
        [blocks[index + 1], blocks[index]] = [blocks[index], blocks[index + 1]];
        renderBlocksEditor();
      });
      const ta = el.querySelector('[data-field="body"]');
      ta?.addEventListener('input', () => {
        blocks[index].body = ta.value;
      });
      const urlInput = el.querySelector('[data-field="url"]');
      urlInput?.addEventListener('input', () => {
        blocks[index].url = urlInput.value.trim();
      });
      const fileInput = el.querySelector('[data-field="file"]');
      fileInput?.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const max = blocks[index].type === 'image' ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
        if (file.size > max) {
          alert(`파일 크기는 ${max / (1024 * 1024)}MB 이하여야 합니다.`);
          fileInput.value = '';
          return;
        }
        try {
          blocks[index].dataUrl = await readFileAsDataUrl(file);
          blocks[index].name = file.name;
          blocks[index].mime = file.type;
          renderBlocksEditor();
        } catch {
          alert('파일을 불러오지 못했습니다.');
        }
      });
    });
  }

  function addBlock(type) {
    if (type === 'text') blocks.push({ type: 'text', body: '' });
    else if (type === 'image') blocks.push({ type: 'image', name: '', dataUrl: '' });
    else if (type === 'file') blocks.push({ type: 'file', name: '', dataUrl: '', mime: '' });
    else if (type === 'youtube') blocks.push({ type: 'youtube', url: '' });
    renderBlocksEditor();
  }

  function openEditor(notice) {
    listSection.hidden = true;
    editorSection.hidden = false;
    document.getElementById('err-blocks')?.classList.remove('is-visible');

    if (notice) {
      editorHeading.textContent = '글 수정';
      document.getElementById('notice-id').value = notice.id;
      document.getElementById('notice-title').value = notice.title;
      document.getElementById('notice-date').value = notice.date;
      blocks = JSON.parse(JSON.stringify(window.KSSE.getNoticeBlocks(notice)));
    } else {
      editorHeading.textContent = '글 작성';
      document.getElementById('notice-id').value = '';
      noticeForm.reset();
      document.getElementById('notice-date').value = todayISO();
      blocks = [{ type: 'text', body: '' }];
    }
    renderBlocksEditor();
  }

  function closeEditor() {
    editorSection.hidden = true;
    listSection.hidden = false;
    blocks = [];
    blocksRoot.innerHTML = '';
  }

  function renderAdminList() {
    const notices = window.KSSE.getNotices().slice().sort((a, b) => b.id - a.id);
    if (!notices.length) {
      listBody.innerHTML = '';
      listEmpty.hidden = false;
      return;
    }
    listEmpty.hidden = true;
    listBody.innerHTML = notices
      .map(
        (n) => `
      <tr>
        <td>${n.id}</td>
        <td class="title">${escapeHtml(n.title)}</td>
        <td>${escapeHtml(n.date)}</td>
        <td>
          <div class="admin-row-actions">
            <button type="button" class="btn btn-outline btn-sm" data-edit="${n.id}">수정</button>
            <button type="button" class="btn btn-outline btn-sm" data-delete="${n.id}">삭제</button>
          </div>
        </td>
      </tr>`
      )
      .join('');

    listBody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const notice = window.KSSE.getNotice(btn.dataset.edit);
        if (notice) openEditor(notice);
      });
    });
    listBody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!confirm('이 공지를 삭제할까요?')) return;
        window.KSSE.deleteNotice(btn.dataset.delete);
        renderAdminList();
      });
    });
  }

  function collectBlocksFromDom() {
    blocksRoot.querySelectorAll('.block-item').forEach((el) => {
      const index = Number(el.dataset.index);
      const ta = el.querySelector('[data-field="body"]');
      if (ta) blocks[index].body = ta.value;
      const urlInput = el.querySelector('[data-field="url"]');
      if (urlInput) blocks[index].url = urlInput.value.trim();
    });
    return blocks.filter((b) => {
      if (b.type === 'text') return (b.body || '').trim().length > 0;
      if (b.type === 'image' || b.type === 'file') return !!b.dataUrl;
      if (b.type === 'youtube') return !!window.KSSE.parseYoutubeId(b.url);
      return false;
    });
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
    setAuthed(true);
    showApp(true);
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    setAuthed(false);
    closeEditor();
    showApp(false);
  });

  document.getElementById('btn-new')?.addEventListener('click', () => openEditor(null));
  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => closeEditor());

  document.querySelectorAll('[data-add-block]').forEach((btn) => {
    btn.addEventListener('click', () => addBlock(btn.dataset.addBlock));
  });

  noticeForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('notice-title').value.trim();
    const date = document.getElementById('notice-date').value;
    const idRaw = document.getElementById('notice-id').value;
    const savedBlocks = collectBlocksFromDom();
    const errBlocks = document.getElementById('err-blocks');

    if (!title || !date) return;
    if (!savedBlocks.length) {
      errBlocks?.classList.add('is-visible');
      return;
    }
    errBlocks?.classList.remove('is-visible');

    const payload = {
      id: idRaw ? Number(idRaw) : window.KSSE.nextNoticeId(),
      title,
      date,
      blocks: savedBlocks.map((b) => {
        if (b.type === 'youtube') {
          return {
            type: 'youtube',
            url: b.url,
            videoId: window.KSSE.parseYoutubeId(b.url),
          };
        }
        if (b.type === 'image') {
          return { type: 'image', name: b.name, dataUrl: b.dataUrl };
        }
        if (b.type === 'file') {
          return { type: 'file', name: b.name, dataUrl: b.dataUrl, mime: b.mime || '' };
        }
        return { type: 'text', body: b.body };
      }),
    };

    window.KSSE.upsertNotice(payload);
    closeEditor();
    renderAdminList();
    alert('저장되었습니다.');
  });

  if (isAuthed()) showApp(true);
  else showApp(false);
})();
