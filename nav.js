document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const dropdown = document.getElementById('nav-dropdown');

  if (!hamburger || !dropdown) return;

  function closeMenu() {
    hamburger.classList.remove('open');
    dropdown.classList.remove('open');
  }

  hamburger.addEventListener('click', (event) => {
    event.stopPropagation();
    hamburger.classList.toggle('open');
    dropdown.classList.toggle('open');
  });

  dropdown.addEventListener('click', (event) => {
    // Allow link clicks to close menu on mobile
    if (event.target.tagName.toLowerCase() === 'a') {
      closeMenu();
    }
  });

  document.addEventListener('click', (event) => {
    if (!dropdown.classList.contains('open')) return;
    const target = event.target;
    if (target !== hamburger && !hamburger.contains(target) && target !== dropdown && !dropdown.contains(target)) {
      closeMenu();
    }
  });
});

