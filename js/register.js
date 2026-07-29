document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  if (!form) return;

  const otherRadio = form.querySelector('input[name="orgType"][value="기타"]');
  const otherInput = document.getElementById('org-other');
  const orgTypeRadios = form.querySelectorAll('input[name="orgType"]');
  const forumChecks = form.querySelectorAll('input[name="forumApply"]');
  const forumNone = document.getElementById('forumApplyNone');

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

  forumChecks.forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked && forumNone) forumNone.checked = false;
    });
  });
  forumNone?.addEventListener('change', () => {
    if (forumNone.checked) {
      forumChecks.forEach((cb) => {
        cb.checked = false;
      });
    }
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
    const selectedForums = [...form.querySelectorAll('input[name="forumApply"]:checked')];
    const noneSelected = forumNone?.checked;
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

    if (!noneSelected && selectedForums.length === 0) {
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

    const labels = window.KSSE.FORUM_APPLY_LABELS;
    let forumApply;
    let forumApplyLabel;

    if (noneSelected) {
      forumApply = 'none';
      forumApplyLabel = labels.none;
    } else {
      const ids = selectedForums.map((el) => el.value);
      forumApply = ids.join(',');
      forumApplyLabel = ids.map((id) => labels[id] || id).join('\n');
    }

    try {
      await window.KSSE.saveRegistration({
        name,
        org,
        orgType: orgTypeValue,
        title,
        phone,
        email,
        forumApply,
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
