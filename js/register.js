document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  if (!form) return;

  const otherRadio = form.querySelector('input[name="orgType"][value="기타"]');
  const otherInput = document.getElementById('org-other');
  const orgTypeRadios = form.querySelectorAll('input[name="orgType"]');

  orgTypeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      if (otherRadio && otherRadio.checked) {
        otherInput.classList.add('is-visible');
        otherInput.querySelector('input').required = true;
      } else {
        otherInput.classList.remove('is-visible');
        otherInput.querySelector('input').required = false;
        otherInput.querySelector('input').value = '';
      }
    });
  });

  function showError(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('is-visible', !!show);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let valid = true;

    const consent = form.querySelector('input[name="consent"]:checked');
    if (!consent || consent.value !== 'agree') {
      showError('err-consent', true);
      valid = false;
    } else {
      showError('err-consent', false);
    }

    const name = form.name.value.trim();
    const org = form.org.value.trim();
    const orgType = form.querySelector('input[name="orgType"]:checked');
    const title = form.title.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    const forumApply = form.querySelector('input[name="forumApply"]:checked');
    const password = form.password.value;
    const passwordConfirm = form.passwordConfirm.value;

    if (!name) { showError('err-name', true); valid = false; } else showError('err-name', false);
    if (!org) { showError('err-org', true); valid = false; } else showError('err-org', false);
    if (!orgType) { showError('err-orgType', true); valid = false; } else showError('err-orgType', false);
    if (orgType && orgType.value === '기타' && !form.orgOther.value.trim()) {
      showError('err-orgType', true);
      valid = false;
    }
    if (!title) { showError('err-title', true); valid = false; } else showError('err-title', false);
    if (!phone) { showError('err-phone', true); valid = false; } else showError('err-phone', false);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('err-email', true);
      valid = false;
    } else showError('err-email', false);

    if (!forumApply) {
      showError('err-forumApply', true);
      valid = false;
    } else {
      showError('err-forumApply', false);
    }

    if (!password || password.length < 4) {
      showError('err-password', true);
      valid = false;
    } else showError('err-password', false);

    if (password !== passwordConfirm) {
      showError('err-passwordConfirm', true);
      valid = false;
    } else showError('err-passwordConfirm', false);

    if (!valid) {
      const firstErr = form.querySelector('.field-error.is-visible');
      if (firstErr) firstErr.previousElementSibling?.focus?.();
      return;
    }

    const orgTypeValue =
      orgType.value === '기타'
        ? `기타(${form.orgOther.value.trim()})`
        : orgType.value;

    const FORUM_APPLY_LABELS = {
      forum915:
        '9월15일(화) 사회서비스 정책포럼 : 사회서비스 정책 20년, 회고와 전망(15:00-17:00)',
      forum916:
        '9월16일(수) 한국사회보장정보원 특별세션 : 사회서비스 전자바우처 제도 도입 20년, 성과와 발전방향(14:00-16:00)',
      both: '둘다 신청',
      none: '신청 안함',
    };

    const forumApplyLabel = FORUM_APPLY_LABELS[forumApply.value] || forumApply.value;

    try {
      await window.KSSE.saveRegistration({
        name,
        org,
        orgType: orgTypeValue,
        title,
        phone,
        email,
        forumApply: forumApply.value,
        forumApplyLabel,
        password,
      });
    } catch {
      alert('등록 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    alert('사전등록이 완료되었습니다.\n사전신청확인 페이지에서 등록 내용을 확인할 수 있습니다.');
    location.href = 'register-check.html';
  });
});
