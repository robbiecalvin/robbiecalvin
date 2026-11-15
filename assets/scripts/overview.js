(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  const main = document.querySelector('main');
  if (main) main.tabIndex = -1;
  if (main && !document.querySelector('.skip-link')) {
    if (!main.id) main.id = 'main-content';
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#' + main.id;
    skip.textContent = 'Skip to content';
    document.body.prepend(skip);
  }
  document.querySelectorAll('header .nav-links a').forEach(link => {
    const url = new URL(link.href, location.href);
    if (url.origin === location.origin && !url.hash && url.pathname === location.pathname) {
      link.setAttribute('aria-current', 'page');
    }
  });
  const form = document.querySelector('[data-brief]');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const content = `${document.title.split(' — ')[0]} — project brief\n\nProject / name: ${data.get('name')}\nGoals and deliverables: ${data.get('goals')}\nBudget and timing: ${data.get('timing')}\n\nThis brief is saved locally. It has not been sent and does not confirm a booking or quote.\n`;
    const url = URL.createObjectURL(new Blob([content], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'project-brief.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    document.getElementById('brief-status').textContent = 'Your brief download is ready. Nothing has been sent or booked.';
  });
})();
