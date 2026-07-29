document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('check-form');
  const result = document.getElementById('check-result');
  if (!form || !result) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const password = form.password.value;

    if (!name || !phone || !password) {
      result.classList.add('is-visible');
      result.innerHTML = '<p class="result-fail">이름, 휴대폰 번호, 비밀번호를 모두 입력해 주세요.</p>';
      return;
    }

    const found = await window.KSSE.findRegistration({ name, phone, password });
    result.classList.add('is-visible');

    if (!found) {
      result.innerHTML =
        '<p class="result-fail">일치하는 사전등록 정보가 없습니다.<br>입력 내용을 다시 확인해 주세요.</p>';
      return;
    }

    const created = new Date(found.createdAt).toLocaleString('ko-KR');
    const forumText = window.KSSE.formatForumApplyLabel(found.forumApply, found.forumApplyLabel);
    const forumHtml = escapeHtml(forumText).replace(/\n/g, '<br>');
    result.innerHTML = `
      <h3>사전등록이 확인되었습니다.</h3>
      <div class="info-list">
        <div class="info-row"><span class="info-label">이름</span><div class="info-value">${escapeHtml(found.name)}</div></div>
        <div class="info-row"><span class="info-label">소속</span><div class="info-value">${escapeHtml(found.org)}</div></div>
        <div class="info-row"><span class="info-label">소속 유형</span><div class="info-value">${escapeHtml(found.orgType)}</div></div>
        <div class="info-row"><span class="info-label">직함/직책</span><div class="info-value">${escapeHtml(found.title)}</div></div>
        <div class="info-row"><span class="info-label">휴대폰</span><div class="info-value">${escapeHtml(found.phone)}</div></div>
        <div class="info-row"><span class="info-label">이메일</span><div class="info-value">${escapeHtml(found.email)}</div></div>
        <div class="info-row"><span class="info-label">포럼참가</span><div class="info-value">${forumHtml}</div></div>
        <div class="info-row"><span class="info-label">신청일시</span><div class="info-value">${escapeHtml(created)}</div></div>
      </div>
      <p class="form-hint check-result-hint">전시 개막 3일 전 등록하신 이메일로 QR코드가 발송됩니다.</p>
    `;
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
