/* Show the latest published content immediately; checked-in HTML remains the fallback and crawler copy. */
(async()=>{
  const config=window.YUANJIE_CONFIG;
  const fileName=location.pathname.split('/').pop()||'index.html';
  const caseSlug=fileName==='project.html'?new URLSearchParams(location.search).get('case'):null;
  if(caseSlug){
    const oldFile=`project.html?case=${caseSlug}`;
    const canonical=window.ProjectBlocks?.canonicalProjectFile(oldFile);
    if(canonical&&canonical!==oldFile){location.replace(new URL(canonical,location.href));return}
  }
  const sourceFile=window.ProjectBlocks?.sourceProjectFile(fileName)||fileName;
  const headers={apikey:config.publishableKey};
  const base=`${config.supabaseUrl}/rest/v1`;
  const read=async(path)=>{
    const response=await fetch(`${base}/${path}`,{headers,cache:'no-store',signal:AbortSignal.timeout(6000)});
    if(!response.ok)throw new Error(`Published content unavailable: ${response.status}`);
    return response.json();
  };
  const publishedProjectCategory=project=>{
    const main=new DOMParser().parseFromString(project.main_html||'','text/html').querySelector('main');
    const canonical=window.ProjectBlocks?.canonicalProjectFile(project.file_name||'')||project.file_name||'';
    const isProjectFile=/^project-\d+\.html$/i.test(canonical)||/^project\.html\?case=/i.test(canonical);
    const declared=main?.dataset.projectCategory;
    if(!isProjectFile&&declared!=='urban'&&declared!=='renewal')return null;
    if(declared==='urban'||declared==='renewal')return declared;
    if(main?.querySelector('a[href="renewal.html"],a.project-return[href="renewal.html"]'))return 'renewal';
    if(main?.querySelector('a[href="urban.html"],a.project-return[href="urban.html"]'))return 'urban';
    const text=`${project.title||''} ${main?.querySelector('.eyebrow')?.textContent||''} ${main?.querySelector('.page-title')?.textContent||''}`;
    if(/危老|RECONSTRUCTION/i.test(text))return 'renewal';
    if(/都更|URBAN RENEWAL/i.test(text))return 'urban';
    return isProjectFile?'urban':null;
  };
  try{
    const [pages,navigation,managedProjects]=await Promise.all([
      read(caseSlug
        ?`published_pages?select=title,meta_description,main_html&slug=eq.${encodeURIComponent(caseSlug)}&limit=1`
        :`published_pages?select=title,meta_description,main_html&file_name=eq.${encodeURIComponent(sourceFile)}&limit=1`),
      read('published_navigation?select=label,subtitle,href,is_visible&order=nav_order.asc'),
      fileName==='urban.html'||fileName==='renewal.html'
        ?read('published_pages?select=slug,file_name,title,main_html,sort_order&order=sort_order.asc')
        :Promise.resolve([])
    ]);
    const page=pages[0];
    if(page){
      document.title=page.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content',page.meta_description);
      const incoming=document.createRange().createContextualFragment(page.main_html).querySelector('main');
      if(incoming)window.ProjectBlocks?.canonicalizeProjectLinks(incoming);
      const existing=document.querySelector('main');
      if(incoming&&existing){
        if(fileName==='index.html'){
          for(const image of incoming.querySelectorAll('.home-project-category .portal > img')){
            const percent=Number(image.style.width.match(/^(\d+(?:\.\d+)?)%$/)?.[1]);
            if(percent>0&&percent<=100)image.style.setProperty('--image-display-scale',String(percent/100));
          }
          for(const portal of incoming.querySelectorAll('.home-project-category .portal')){
            if(portal.querySelector(':scope > .category-copy'))continue;
            const image=portal.querySelector(':scope > img');
            if(!image)continue;
            const copy=document.createElement('div');copy.className='category-copy';
            while(image.nextSibling)copy.append(image.nextSibling);
            portal.append(copy);
          }
        }
        const meaningfulText=main=>{
          const copy=main.cloneNode(true);
          copy.querySelectorAll('.project-filter,.project-filter-status,.link-motion-clone,.link-motion-icon').forEach(node=>node.remove());
          const text=copy.textContent.replace('進行個案（都更）','進行個案').replace(/\s+/g,'').trim();
          const assets=[...copy.querySelectorAll('img,a')].map(node=>node.getAttribute('src')||node.getAttribute('href')||'').join('|');
          const photoOverrides=copy.querySelector('[data-card-photo-overrides]')?.outerHTML||'';
          const imageStyles=[...copy.querySelectorAll('img')].map(node=>node.getAttribute('style')||'').join('|');
          return `${text}|${assets}|${photoOverrides}|${imageStyles}`;
        };
        const normalizedMarkup=main=>{
          const copy=main.cloneNode(true);
          copy.querySelectorAll('a.text-link,a.team-section-link').forEach(link=>{
            link.textContent=(link.querySelector('.link-motion-text')?.textContent||link.textContent).trim();
            link.classList.remove('link-motion','link-motion-back');
            if(link.classList.contains('team-section-link'))link.classList.remove('text-link');
            link.removeAttribute('aria-label');
          });
          return copy.outerHTML;
        };
        const unchanged=fileName==='index.html'||fileName==='urban.html'
          ?meaningfulText(incoming)===meaningfulText(existing)
          :normalizedMarkup(incoming)===normalizedMarkup(existing);
        if(!unchanged){
          window.enhanceLinkMotion?.(incoming);
          existing.replaceWith(incoming);
        }
      }
    }else if(fileName==='project.html'||/^project-\d+\.html$/i.test(fileName)){
      document.title='個案尚未上線｜元捷建設';
      document.querySelector('meta[name="robots"]')?.setAttribute('content','noindex');
      const main=document.querySelector('main');
      if(main)main.innerHTML='<section class="container page-head"><p class="eyebrow">PROJECT</p><h1 class="page-title">個案尚未上線</h1><p class="lead">請從個案列表選擇目前展示的建案。</p><a href="urban.html">查看進行個案</a></section>';
    }
    const nav=document.querySelector('header nav[aria-label="主要導覽"]');
    if(nav){
      nav.replaceChildren(...navigation.filter(item=>item.is_visible).map(item=>{
        const link=document.createElement('a');
        link.href=window.ProjectBlocks?.canonicalProjectFile(item.href)||item.href;
        link.textContent=item.label;
        if(item.subtitle){const subtitle=document.createElement('span');subtitle.textContent=item.subtitle;link.append(subtitle)}
        if(item.href===fileName)link.setAttribute('aria-current','page');
        return link;
      }));
    }
    if(fileName==='urban.html'||fileName==='renewal.html'){
      const category=fileName==='urban.html'?'urban':'renewal';
      const grid=document.querySelector('.case-grid');
      const publishedFiles=new Set(managedProjects.filter(project=>publishedProjectCategory(project)===category).map(project=>window.ProjectBlocks?.canonicalProjectFile(project.file_name)||project.file_name));
      for(const card of grid?.querySelectorAll(':scope > a.case-card')||[]){
        if(!publishedFiles.has(window.ProjectBlocks?.canonicalProjectFile(card.getAttribute('href'))||card.getAttribute('href')))card.remove();
      }
      for(const project of managedProjects){
        if(publishedProjectCategory(project)!==category)continue;
        const canonical=window.ProjectBlocks?.canonicalProjectFile(project.file_name)||project.file_name;
        const existingCard=[...grid?.querySelectorAll('a.case-card')||[]].find(card=>card.getAttribute('href')===canonical);
        if(existingCard){window.ProjectBlocks?.updateCard(existingCard,project.main_html);continue}
        if(!grid)continue;
        const main=new DOMParser().parseFromString(project.main_html,'text/html').querySelector('main');
        const title=main.querySelector('.page-title')?.textContent?.trim()||project.title;
        const city=main.dataset.projectCity||'';
        const district=main.dataset.projectDistrict||'';
        const cover=main.querySelector('.case-main img')?.getAttribute('src')||'assets/project-placeholder.svg';
        const card=document.createElement('a');
        card.className='case-card';
        card.href=canonical;
        card.dataset.city=city;
        card.dataset.district=district;
        const image=document.createElement('img');
        image.src=cover;
        image.alt=`${title}圖片`;
        image.loading='lazy';
        const copy=document.createElement('div');
        copy.className='case-card-copy';
        const eyebrow=document.createElement('div');
        eyebrow.className='eyebrow';
        eyebrow.textContent=category==='urban'?'都市更新':'危老重建';
        const heading=document.createElement('h2');
        heading.textContent=title;
        const location=document.createElement('p');
        location.className='project-location';
        location.textContent=`${city}${district}`;
        copy.append(eyebrow,heading,location);
        window.ProjectBlocks?.appendProjectCardFacts(copy,main);
        card.append(image,copy);
        window.ProjectBlocks?.syncCardNote(card,main);
        window.ProjectBlocks?.syncCardStatus(card,main);
        grid.append(card);
      }
      const orderedProjects=managedProjects.filter(project=>publishedProjectCategory(project)===category);
      const order=new Map(orderedProjects.map((project,index)=>[window.ProjectBlocks?.canonicalProjectFile(project.file_name)||project.file_name,index]));
      [...grid.querySelectorAll(':scope > a.case-card')].sort((a,b)=>(order.get(a.getAttribute('href'))??Number.MAX_SAFE_INTEGER)-(order.get(b.getAttribute('href'))??Number.MAX_SAFE_INTEGER)).forEach(card=>grid.append(card));
    }
  }catch(error){
    console.warn('Using the last deployed copy of this page.',error);
  }finally{
    if(fileName==='urban.html'||fileName==='renewal.html'){
      const main=document.querySelector('main');
      window.ProjectBlocks?.canonicalizeProjectLinks(main);
      for(const record of main?.querySelectorAll('[data-card-photo-overrides] [data-href]')||[]){
        const card=[...main.querySelectorAll('a.case-card')].find(item=>item.getAttribute('href')===record.dataset.href);
        const img=card?.querySelector('img');
        if(!img||!record.dataset.src)continue;
        img.setAttribute('src',record.dataset.src);
        img.alt=record.dataset.alt||'';
        if(record.dataset.width)img.width=Number(record.dataset.width);
        if(record.dataset.height)img.height=Number(record.dataset.height);
      }
      window.ProjectBlocks?.formatCardFacts(main);
    }
    if(fileName==='index.html'){
      for(const portal of document.querySelectorAll('.home-project-category .portal')){
        if(portal.querySelector(':scope > .category-copy'))continue;
        const image=portal.querySelector(':scope > img');
        if(!image)continue;
        const copy=document.createElement('div');
        copy.className='category-copy';
        while(image.nextSibling)copy.append(image.nextSibling);
        portal.append(copy);
      }
    }
    if(window.ProjectBlocks){
      const main=document.querySelector('main');
      if(ProjectBlocks.applies(location.pathname.split('/').pop()+location.search) || (fileName==='project.html'&&caseSlug) || ProjectBlocks.applies(fileName)){if(ProjectBlocks.prepare(main))ProjectBlocks.refresh(main);}
    }
    for(const source of document.querySelectorAll('script[data-site-init]')){
      const script=document.createElement('script');
      script.textContent=source.textContent;
      source.replaceWith(script);
    }
    const modular=document.querySelector('main[data-block-version="1"]');
    if(modular){
      const dialog=document.querySelector('dialog:not(.assessment-dialog)');
      for(const img of modular.querySelectorAll('img')){
        const old=img.closest('[data-image],[data-lightbox]');
        if(old){if(old.hasAttribute('data-image'))old.dataset.image=img.src;else old.dataset.lightbox=img.src}
        if(!dialog||img.closest('button,a,.project-album'))continue;
        const zoom=document.createElement('button');
        zoom.className='image-zoom';zoom.ariaLabel='放大'+img.alt;
        img.replaceWith(zoom);zoom.append(img);
        zoom.onclick=()=>{const target=dialog.querySelector('img');target.src=img.src;target.alt=img.alt;dialog.showModal()};
      }
    }
    window.ProjectBlocks?.cleanupAlbumZoom(document.querySelector('main'));
    window.ProjectBlocks?.enhanceAlbumRails(document.querySelector('main'));
    window.enhanceLinkMotion?.(document.querySelector('main'));
  }
})();
