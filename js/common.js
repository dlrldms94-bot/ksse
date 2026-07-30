(function () {
  const NAV = [
    {
      label: '행사소개',
      key: 'about',
      href: 'overview.html',
      children: [
        { label: '행사개요', href: 'overview.html' },
        { label: '배치도', href: 'layout.html' },
      ],
    },
    {
      label: '사전등록',
      key: 'register',
      href: 'register.html',
      children: [
        { label: '사전등록', href: 'register.html' },
        { label: '사전신청확인', href: 'register-check.html' },
        { label: '관람 안내', href: 'guide.html' },
      ],
    },
    {
      label: '프로그램',
      key: 'program',
      href: 'program.html',
      children: [
        { label: '프로그램', href: 'program.html' },
        { label: '부대행사', href: 'side-event.html' },
        { label: '이벤트', href: 'event.html' },
      ],
    },
    {
      label: '공지사항',
      key: 'notice',
      href: 'notice.html',
      children: [{ label: '공지사항', href: 'notice.html' }],
    },
  ];

  function renderHeader(active) {
    const items = NAV.map((item) => {
      const isActive = item.key === active ? ' is-active' : '';
      const children = item.children
        .map((c) => `<li><a href="${c.href}">${c.label}</a></li>`)
        .join('');
      return `
        <li class="gnb-item${isActive}">
          <a class="gnb-link" href="${item.href}">${item.label}</a>
          <ul class="gnb-sub">${children}</ul>
        </li>`;
    }).join('');

    return `
      <header class="site-header">
        <div class="header-inner">
          <a class="logo" href="index.html">2026 대한민국 사회서비스 박람회</a>
          <button class="menu-toggle" type="button" aria-label="메뉴 열기">
            <span></span><span></span><span></span>
          </button>
          <ul class="gnb">${items}</ul>
        </div>
      </header>`;
  }

  function renderFooter() {
    return `
      <footer class="site-footer">
        <div class="footer-inner">
          <div class="footer-logo">2026 대한민국 사회서비스 박람회</div>
          <div class="footer-center">
            <div class="footer-links">
              <a href="#">개인정보처리방침</a><span class="footer-dot">·</span>
              <a href="#">이용약관</a><span class="footer-dot">·</span>
              <a href="#">사이트맵</a>
            </div>
            <div class="footer-address">(04551) 서울특별시 중구 삼일대로 340, 9층</div>
            <div class="footer-contact">TEL. 02-2271-9017 | E-mail. kssvcexpo@kcpass.or.kr</div>
            <div class="footer-copy">© 2026 대한민국 사회서비스 박람회. All rights reserved.</div>
          </div>
          <div class="footer-logos">
            <img src="img/c-logo-1.png" alt="보건복지부">
            <img src="img/c-logo-2.png" alt="중앙사회서비스원">
          </div>
        </div>
      </footer>`;
  }

  function renderBreadcrumb(items) {
    if (!items || !items.length) return '';
    const html = items
      .map((item, i) => {
        const isLast = i === items.length - 1;
        if (isLast) return `<span class="current">${item.label}</span>`;
        return `<a href="${item.href}">${item.label}</a><span class="sep">&gt;</span>`;
      })
      .join('');
    return `<div class="breadcrumb"><div class="breadcrumb-inner">${html}</div></div>`;
  }

  function mountLayout() {
    const root = document.body;
    const active = root.dataset.nav || '';
    const crumbs = root.dataset.breadcrumb
      ? JSON.parse(root.dataset.breadcrumb)
      : null;
    const isHome = root.dataset.page === 'home';

    const headerMount = document.getElementById('site-header');
    const footerMount = document.getElementById('site-footer');
    const crumbMount = document.getElementById('breadcrumb');

    if (headerMount) headerMount.outerHTML = renderHeader(active);
    if (crumbMount && crumbs) crumbMount.outerHTML = renderBreadcrumb(crumbs);
    if (footerMount) footerMount.outerHTML = renderFooter();

    const toggle = document.querySelector('.menu-toggle');
    const gnb = document.querySelector('.gnb');
    if (toggle && gnb) {
      toggle.addEventListener('click', () => gnb.classList.toggle('is-open'));
    }

    document.querySelectorAll('.gnb-item').forEach((item) => {
      const link = item.querySelector('.gnb-link');
      if (!link) return;
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && item.querySelector('.gnb-sub')) {
          e.preventDefault();
          item.classList.toggle('is-open');
        }
      });
    });

    if (isHome) root.classList.add('is-home');
  }

  window.KSSE = window.KSSE || {};

  window.KSSE.FORUM_APPLY_LABELS = {
    forum915:
      '9월15일(화) 사회서비스 정책포럼 : 사회서비스 정책 20년, 회고와 전망(15:00-17:00)',
    forum916:
      '9월16일(수) 한국사회보장정보원 특별세션 : 사회서비스 전자바우처 제도 도입 20년, 성과와 발전방향(14:00-16:00)',
    forum916talk:
      '9월16일(수) 토론회 : 돌봄인력 양성체계의 현황과 과제(10:00-12:00)',
    none: '신청 안함',
  };

  window.KSSE.formatForumApplyLabel = function (forumApply, forumApplyLabel) {
    if (forumApplyLabel) return forumApplyLabel;
    if (!forumApply || forumApply === 'none') return window.KSSE.FORUM_APPLY_LABELS.none;
    const map = window.KSSE.FORUM_APPLY_LABELS;
    return String(forumApply)
      .split(',')
      .map((id) => map[id.trim()] || id.trim())
      .filter(Boolean)
      .join('\n');
  };

  /* ===== Registration storage ===== */
  const REG_KEY = 'ksse_registrations';
  const REGISTRATION_API = 'api/registrations.php';

  window.KSSE.REGISTRATION_API = REGISTRATION_API;

  window.KSSE.getRegistrationsLocal = function () {
    try {
      return JSON.parse(localStorage.getItem(REG_KEY) || '[]');
    } catch {
      return [];
    }
  };

  window.KSSE.getRegistrations = window.KSSE.getRegistrationsLocal;

  window.KSSE.saveRegistrationLocal = function (data) {
    const list = this.getRegistrationsLocal();
    const entry = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    list.push(entry);
    localStorage.setItem(REG_KEY, JSON.stringify(list));
    return entry;
  };

  window.KSSE.saveRegistration = async function (data) {
    let entry = this.saveRegistrationLocal(data);

    try {
      const res = await fetch(REGISTRATION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', ...data }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.registration) {
        entry = json.registration;
        const list = this.getRegistrationsLocal();
        list.pop();
        list.push(entry);
        localStorage.setItem(REG_KEY, JSON.stringify(list));
      }
    } catch {
      /* PHP 미구동 환경: localStorage만 사용 */
    }
    return entry;
  };

  window.KSSE.findRegistrationLocal = function ({ name, phone, password }) {
    return this.getRegistrationsLocal().find(
      (r) =>
        r.name === name &&
        String(r.phone).replace(/-/g, '') === String(phone).replace(/-/g, '') &&
        r.password === password
    );
  };

  window.KSSE.findRegistration = async function ({ name, phone, password }) {
    try {
      const res = await fetch(REGISTRATION_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', name, phone, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.found && json.registration) {
        return json.registration;
      }
    } catch {
      /* fallback */
    }
    return this.findRegistrationLocal({ name, phone, password });
  };

  window.KSSE.fetchRegistrationsAdmin = async function (adminPassword) {
    const url = `${REGISTRATION_API}?password=${encodeURIComponent(adminPassword)}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      throw new Error(json.error || 'fetch_failed');
    }
    return json.registrations || [];
  };

  /* ===== Notice board storage ===== */
  const NOTICE_KEY = 'ksse_notices';
  const DEFAULT_NOTICES = [
    {
      id: 1,
      title: '2026 대한민국 사회서비스 박람회 사전등록 안내',
      date: '2026-07-01',
      content:
        '안녕하세요.\n2026 대한민국 사회서비스 박람회 사전등록이 시작되었습니다.\n\n■ 사전등록 기간: 2026. 7. 1. ~ 2026. 9. 10.\n■ 행사 일정: 2026. 9. 15.(화) ~ 9. 16.(수)\n■ 장소: aT센터 제2전시장(3층)\n\n홈페이지 사전등록 메뉴에서 신청해 주시기 바랍니다.\n개막 3일 전 QR코드가 등록하신 이메일로 발송됩니다.',
    },
    {
      id: 2,
      title: '박람회 관람 일정 및 입장 안내',
      date: '2026-07-10',
      content:
        '관람객 여러분께 안내드립니다.\n\n■ 1일차 (9.15.화): 13:30 ~ 17:00\n■ 2일차 (9.16.수): 10:00 ~ 17:00\n\n사전등록 후 발송되는 QR코드를 현장에서 제시해 주시면 입장이 가능합니다.\n문의: office@onandme.com / 02-1234-5678',
    },
    {
      id: 3,
      title: '부대행사(정책포럼·특별세션) 참석 안내',
      date: '2026-07-20',
      content:
        '프로그램 중 부대행사로 사회서비스 정책포럼과 특별세션이 진행됩니다.\n자세한 내용은 프로그램 > 부대행사 메뉴를 확인해 주세요.\n\n※ 좌석이 한정되어 있으니 관심 있는 분들은 미리 일정을 확인해 주시기 바랍니다.',
    },
  ];

  window.KSSE.getNotices = function () {
    try {
      const saved = localStorage.getItem(NOTICE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    localStorage.setItem(NOTICE_KEY, JSON.stringify(DEFAULT_NOTICES));
    return [...DEFAULT_NOTICES];
  };

  window.KSSE.getNotice = function (id) {
    return this.getNotices().find((n) => String(n.id) === String(id));
  };

  window.KSSE.saveNotices = function (list) {
    localStorage.setItem(NOTICE_KEY, JSON.stringify(list));
  };

  window.KSSE.nextNoticeId = function () {
    return this.getNotices().reduce((max, n) => Math.max(max, n.id), 0) + 1;
  };

  window.KSSE.upsertNotice = function (notice) {
    const list = this.getNotices();
    const idx = list.findIndex((n) => n.id === notice.id);
    if (idx >= 0) list[idx] = notice;
    else list.push(notice);
    this.saveNotices(list);
    return notice;
  };

  window.KSSE.deleteNotice = function (id) {
    const next = this.getNotices().filter((n) => String(n.id) !== String(id));
    this.saveNotices(next);
  };

  document.addEventListener('DOMContentLoaded', mountLayout);
})();
