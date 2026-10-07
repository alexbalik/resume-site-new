const SHARED_SUMMARY_TEXT =
  'Engineer, physicist, and software developer with a diverse background spanning computational math, algorithm development, and people skills.';

document.addEventListener('DOMContentLoaded', () => {
  const summaryEls = document.querySelectorAll('.hero-summary');
  summaryEls.forEach((el) => {
    el.textContent = SHARED_SUMMARY_TEXT;
  });
});

