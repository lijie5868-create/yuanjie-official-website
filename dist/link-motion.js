/* Uiverse-inspired sliding text for the site's existing underlined links. */
window.enhanceLinkMotion = (root = document) => {
  for (const link of root.querySelectorAll('a.text-link, a.team-section-link')) {
    const existingText = link.querySelector('.link-motion-text');
    if (existingText) {
      if (existingText.textContent.trim().startsWith('←')) {
        link.classList.add('link-motion-back');
        link.querySelector('.link-motion-icon')?.remove();
      }
      continue;
    }
    const label = link.textContent.trim();
    const isBackLink = label.startsWith('←');
    link.textContent = '';
    if (link.classList.contains('team-section-link')) link.classList.add('text-link');
    link.classList.add('link-motion');
    if (isBackLink) link.classList.add('link-motion-back');
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
    link.append(text, clone);
    if (!isBackLink) link.append(icon);
    link.setAttribute('aria-label', label);
  }
};
window.enhanceLinkMotion(document.querySelector('main'));
