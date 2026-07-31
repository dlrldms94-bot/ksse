document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('event-modal');
  const modalImg = document.getElementById('event-modal-img');
  const closeBtn = modal?.querySelector('.event-modal__close');
  const backdrop = modal?.querySelector('.event-modal__backdrop');
  const triggers = document.querySelectorAll('.event-gallery__trigger');

  if (!modal || !modalImg || !triggers.length) return;

  let lastFocus = null;

  function openModal(img) {
    lastFocus = document.activeElement;
    modalImg.src = img.src;
    modalImg.alt = img.alt;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modalImg.removeAttribute('src');
    document.body.style.overflow = '';
    lastFocus?.focus();
  }

  triggers.forEach((btn) => {
    btn.addEventListener('click', () => {
      const img = btn.querySelector('img');
      if (img) openModal(img);
    });
  });

  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (!modal.hidden && e.key === 'Escape') closeModal();
  });
});
