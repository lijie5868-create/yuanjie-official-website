/* Uiverse-inspired sliding text for the site's existing underlined links. */
(() => {
  for (const link of document.querySelectorAll('main a.text-link, main a.team-section-link')) {
    if (link.querySelector('.link-motion-text')) continue;
    const label = link.textContent.trim();
    link.textContent = '';
    if (link.classList.contains('team-section-link')) link.classList.add('text-link');
    link.classList.add('link-motion');
    const text = document.createElement('span');
    text.className = 'link-motion-text';
    text.textContent = label;
    const clone = document.createElement('span');
    clone.className = 'link-motion-clone';
    clone.textContent = label;
    clone.setAttribute('aria-hidden', 'true');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    icon.classList.add('link-motion-icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 12h14m-6-6 6 6-6 6');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.7');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    icon.append(path);
    link.append(text, clone, icon);
    link.setAttribute('aria-label', label);
  }
})();
