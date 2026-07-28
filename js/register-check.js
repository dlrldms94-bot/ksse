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
    result.innerHTML = `
      <h3>사전등록이 확인되었습니다.</h3>
      <div class="info-list">
        <div class="info-row"><span class="info-label">이름</span><div class="info-value">${escapeHtml(found.name)}</div></div>
        <div class="info-row"><span class="info-label">소속</span><div class="info-value">${escapeHtml(found.org)}</div></div>
        <div class="info-row"><span class="info-label">소속 유형</span><div class="info-value">${escapeHtml(found.orgType)}</div></div>
        <div class="info-row"><span class="info-label">직함/직책</span><div class="info-value">${escapeHtml(found.title)}</div></div>
        <div class="info-row"><span class="info-label">휴대폰</span><div class="info-value">${escapeHtml(found.phone)}</div></div>
        <div class="info-row"><span class="info-label">이메일</span><div class="info-value">${escapeHtml(found.email)}</div></div>
        <div class="info-row"><span class="info-label">포럼참가</span><div class="info-value">${escapeHtml(
      found.forumApplyLabel ||
        ({
          forum915:
            '9월15일(화) 사회서비스 정책포럼 : 사회서비스 정책 20년, 회고와 전망(15:00-17:00)',
          forum916:
            '9월16일(수) 한국사회보장정보원 특별세션 : 사회서비스 전자바우처 제도 도입 20년, 성과와 발전방향(14:00-16:00)',
          both: '둘다 신청',
          none: '신청 안함',
        }[found.forumApply] || '-')
    )}</div></div>
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
