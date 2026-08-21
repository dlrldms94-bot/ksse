(function () {
  const DISMISS_PREFIX = 'ksse_popup_dismiss_';

  function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}${m}${day}`;
  }

  function isDismissed(popupId) {
    return localStorage.getItem(`${DISMISS_PREFIX}${popupId}_${todayKey()}`) === '1';
  }

  function dismissForToday(popupId) {
    localStorage.setItem(`${DISMISS_PREFIX}${popupId}_${todayKey()}`, '1');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function nl2br(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function closeModal(root) {
    root.hidden = true;
    document.body.classList.remove('popup-open');
  }

  function renderModal(popup) {
    let root = document.getElementById('site-popup');
    if (!root) {
      root = document.createElement('div');
      root.id = 'site-popup';
      root.className = 'site-popup';
      root.innerHTML = `
        <div class="site-popup__backdrop" data-close></div>
        <div class="site-popup__dialog" role="dialog" aria-modal="true" aria-labelledby="site-popup-title">
          <button type="button" class="site-popup__close" aria-label="닫기" data-close>&times;</button>
          <div class="site-popup__body">
            <h2 class="site-popup__title" id="site-popup-title"></h2>
            <div class="site-popup__image-wrap" hidden>
              <img class="site-popup__image" alt="">
            </div>
            <div class="site-popup__text"></div>
            <a class="btn btn-primary site-popup__link" hidden target="_blank" rel="noopener noreferrer"></a>
          </div>
          <div class="site-popup__footer">
            <label class="site-popup__dismiss">
              <input type="checkbox" id="site-popup-dismiss-check">
              <span>오늘 하루 보지 않기</span>
            </label>
            <button type="button" class="btn btn-outline site-popup__confirm" data-close>닫기</button>
          </div>
        </div>`;
      document.body.appendChild(root);

      root.addEventListener('click', (event) => {
        if (event.target.closest('[data-close]')) {
          const dismissCheck = root.querySelector('#site-popup-dismiss-check');
          if (dismissCheck?.checked && root.dataset.popupId) {
            dismissForToday(root.dataset.popupId);
          }
          closeModal(root);
        }
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !root.hidden) closeModal(root);
      });
    }

    root.dataset.popupId = String(popup.id);
    root.querySelector('#site-popup-title').textContent = popup.title;
    root.querySelector('.site-popup__text').innerHTML = nl2br(popup.body);

    const imageWrap = root.querySelector('.site-popup__image-wrap');
    const imageEl = root.querySelector('.site-popup__image');
    if (popup.imageUrl) {
      imageEl.src = popup.imageUrl;
      imageEl.alt = popup.title;
      imageWrap.hidden = false;
    } else {
      imageEl.removeAttribute('src');
      imageWrap.hidden = true;
    }

    const linkEl = root.querySelector('.site-popup__link');
    if (popup.linkUrl) {
      linkEl.href = popup.linkUrl;
      linkEl.textContent = popup.linkLabel || '자세히 보기';
      linkEl.hidden = false;
    } else {
      linkEl.hidden = true;
      linkEl.removeAttribute('href');
    }

    const dismissCheck = root.querySelector('#site-popup-dismiss-check');
    if (dismissCheck) dismissCheck.checked = false;

    root.hidden = false;
    document.body.classList.add('popup-open');
  }

  async function initHomePopup() {
    if (document.body.dataset.page !== 'home') return;

    const popup = await window.KSSE.fetchActivePopup();
    if (!popup || isDismissed(popup.id)) return;

    renderModal(popup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePopup);
  } else {
    initHomePopup();
  }
})();
