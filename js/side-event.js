document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.day-tab');
  const days = document.querySelectorAll('.side-event-day');
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const day = tab.dataset.day;
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      days.forEach((d) => d.classList.toggle('is-active', d.dataset.day === day));
    });
  });
});
