/* Show the latest published content immediately; checked-in HTML remains the fallback and crawler copy. */
(async()=>{
  const config=window.YUANJIE_CONFIG;
  const fileName=location.pathname.split('/').pop()||'index.html';
  const headers={apikey:config.publishableKey};
  const base=`${config.supabaseUrl}/rest/v1`;
  const read=async(path)=>{
    const response=await fetch(`${base}/${path}`,{headers,cache:'no-store',signal:AbortSignal.timeout(6000)});
    if(!response.ok)throw new Error(`Published content unavailable: ${response.status}`);
    return response.json();
  };
  try{
    const [pages,navigation]=await Promise.all([
      read(`published_pages?select=title,meta_description,main_html&file_name=eq.${encodeURIComponent(fileName)}&limit=1`),
      read('published_navigation?select=label,subtitle,href,is_visible&order=nav_order.asc')
    ]);
    const page=pages[0];
    if(page){
      document.title=page.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content',page.meta_description);
      const incoming=document.createRange().createContextualFragment(page.main_html).querySelector('main');
      const existing=document.querySelector('main');
      if(incoming&&existing){
        if(fileName==='index.html'){
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
          return `${text}|${assets}`;
        };
        if(meaningfulText(incoming)!==meaningfulText(existing)){
          window.enhanceLinkMotion?.(incoming);
          existing.replaceWith(incoming);
        }
      }
    }
    const nav=document.querySelector('header nav[aria-label="主要導覽"]');
    if(nav){
      nav.replaceChildren(...navigation.filter(item=>item.is_visible).map(item=>{
        const link=document.createElement('a');
        link.href=item.href;
        link.textContent=item.label;
        if(item.subtitle){const subtitle=document.createElement('span');subtitle.textContent=item.subtitle;link.append(subtitle)}
        if(item.href===fileName)link.setAttribute('aria-current','page');
        return link;
      }));
    }
  }catch(error){
    console.warn('Using the last deployed copy of this page.',error);
  }finally{
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
    for(const source of document.querySelectorAll('script[data-site-init]')){
      const script=document.createElement('script');
      script.textContent=source.textContent;
      source.replaceWith(script);
    }
    window.enhanceLinkMotion?.(document.querySelector('main'));
  }
})();
