const SHARED_SUMMARY_TEXT =
  'Engineer, physicist, and software developer with a diverse technical background spanning computational math, data-driven operations research, and optics.';

document.addEventListener('DOMContentLoaded', () => {
  const summaryEls = document.querySelectorAll('.hero-summary');
  summaryEls.forEach((el) => {
    el.textContent = SHARED_SUMMARY_TEXT;
  });
});

