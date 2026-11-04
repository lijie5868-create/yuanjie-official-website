/* Organize the published company philosophy without changing its wording. */
(() => {
  document.body.classList.add('about-page');

  function organize() {
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
    navTitle.textContent = '文章章節';
    nav.append(navTitle);
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
  }

  organize();
  new MutationObserver((records) => {
    if (records.some((record) => Array.from(record.addedNodes).some((node) => node.nodeName === 'MAIN'))) organize();
  }).observe(document.body, { childList: true });
})();
