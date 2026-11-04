/* Organize the published company philosophy without changing its wording. */
(() => {
  document.body.classList.add('about-page');
  let stopReadingProgress = () => {};

  function setupReadingProgress(nav, chapters) {
    stopReadingProgress();
    const links = Array.from(nav.querySelectorAll('a'));
    const percent = nav.querySelector('.about-reading-percent');
    const progress = nav.querySelector('.about-reading-progress span');
    let frame = 0;

    const update = () => {
      frame = 0;
      if (!chapters.length || !links.length) return;
      const marker = Math.min(window.innerHeight * 0.35, 260);
      let activeIndex = 0;
      chapters.forEach((chapter, index) => {
        if (chapter.getBoundingClientRect().top <= marker) activeIndex = index;
      });
      const firstTop = chapters[0].getBoundingClientRect().top + window.scrollY;
      const last = chapters[chapters.length - 1];
      const lastBottom = last.getBoundingClientRect().bottom + window.scrollY;
      const readingPosition = window.scrollY + marker;
      const readingProgress = Math.max(0, Math.min(1, (readingPosition - firstTop) / Math.max(1, lastBottom - firstTop)));

      links.forEach((link, index) => {
        const active = index === activeIndex;
        link.classList.toggle('is-active', active);
        link.classList.toggle('is-read', index < activeIndex);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      if (progress) progress.style.transform = `scaleX(${readingProgress})`;
      if (percent) percent.textContent = `${Math.round(readingProgress * 100)}%`;
    };
    const requestUpdate = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    links.forEach((link, index) => link.addEventListener('click', (event) => {
      event.preventDefault();
      chapters[index].scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', link.hash);
    }));
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    stopReadingProgress = () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
    update();
  }

  function organizeValues() {
    const section = document.querySelector('main .values-section');
    if (!section || section.classList.contains('values-organized')) return;
    const wheel = section.querySelector('.value-wheel');
    const definitions = section.querySelector('.value-definitions');
    const cards = definitions && Array.from(definitions.children);
    if (!wheel || cards?.length !== 4) return;

    const illustrations = [
      'storyset-bro-gold-professional.svg',
      'storyset-bro-gold-integrity.svg',
      'storyset-bro-gold-responsibility.svg',
      'storyset-bro-gold-passion.svg'
    ];
    cards.forEach((card, index) => {
      card.classList.add('value-card');
      const number = document.createElement('span');
      number.className = 'value-card-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const image = document.createElement('img');
      image.src = `assets/${illustrations[index]}`;
      image.alt = '';
      image.width = 280;
      image.height = 180;
      image.loading = 'lazy';
      card.prepend(number, image);
    });
    wheel.remove();
    const credit = document.createElement('p');
    credit.className = 'value-illustration-credit';
    const creditLink = document.createElement('a');
    creditLink.href = 'https://storyset.com/';
    creditLink.textContent = 'Illustrations by Storyset';
    credit.append(creditLink);
    definitions.after(credit);
    section.classList.add('values-organized');
  }

  function organize() {
    organizeValues();
    const article = document.querySelector('main article.reading');
    if (!article || article.classList.contains('about-organized')) return;

    const original = Array.from(article.children);
    const headings = original.filter((node) => node.tagName === 'H2');
    if (!headings.length) return;

    const layout = document.createElement('div');
    layout.className = 'about-reading-layout';
    const nav = document.createElement('nav');
    nav.className = 'about-chapters';
    nav.setAttribute('aria-label', '公司理念章節');
    const navTitle = document.createElement('span');
    navTitle.className = 'about-chapters-title';
    navTitle.append(document.createTextNode('文章章節'));
    const readingPercent = document.createElement('span');
    readingPercent.className = 'about-reading-percent';
    readingPercent.textContent = '0%';
    navTitle.append(readingPercent);
    const readingProgress = document.createElement('span');
    readingProgress.className = 'about-reading-progress';
    readingProgress.setAttribute('aria-hidden', 'true');
    readingProgress.append(document.createElement('span'));
    nav.append(navTitle, readingProgress);
    const content = document.createElement('div');
    content.className = 'about-reading-content';
    const intro = document.createElement('div');
    intro.className = 'about-opening';
    content.append(intro);

    let current = intro;
    headings.forEach((heading, index) => {
      heading.id = `about-chapter-${index + 1}`;
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      link.append(number, document.createTextNode(heading.textContent.trim().replace(/^[一二三四五六七八九十]+、/, '')));
      nav.append(link);
    });

    for (const node of original) {
      if (node.tagName === 'H2') {
        current = document.createElement('section');
        current.className = 'about-chapter';
        content.append(current);
      }
      current.append(node);
    }
    layout.append(nav, content);
    article.append(layout);
    article.classList.add('about-organized');
    setupReadingProgress(nav, Array.from(content.querySelectorAll('.about-chapter')));
  }

  organize();
  new MutationObserver((records) => {
    if (records.some((record) => Array.from(record.addedNodes).some((node) => node.nodeName === 'MAIN'))) organize();
  }).observe(document.body, { childList: true });
})();
