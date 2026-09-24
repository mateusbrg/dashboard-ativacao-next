const params = new URLSearchParams(window.location.search);
const activeLayout = params.get('layout') || '1';

document.querySelectorAll('[data-layout]').forEach((screen) => {
  screen.hidden = screen.dataset.layout !== activeLayout;
});

document.querySelectorAll('[data-layout-link]').forEach((link) => {
  const isActive = link.dataset.layoutLink === activeLayout;
  link.classList.toggle('active', isActive);
  if (isActive) link.setAttribute('aria-current', 'page');
});
