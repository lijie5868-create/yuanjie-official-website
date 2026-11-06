// Versioned semantic HTML is both the block document and the deployable fallback.
window.ProjectBlocks = (() => {
  const types = {cover:'個案封面', specs:'基本資料表', metrics:'重點數據', story:'段落圖文', features:'個案特色（條列卡片）', featureStory:'個案特色（敘事卡片）', gallery:'圖片集（單層）', albums:'圖片集（相簿）', journal:'工程與活動紀錄', team:'參與團隊'};
  const files = new Set(['shidong','heping','project-xinguang-urban','project-wuxing',...Array.from({length:19},(_,i)=>'project-'+(i+2)).filter(name=>name!=='project-11')].map(name=>name+'.html'));
  const aliases={
    'shidong.html':'project-1.html',
    'heping.html':'project-11.html',
    'project-xinguang-urban.html':'project-21.html',
    'project-wuxing.html':'project-22.html',
    'project.html?case=custom-794ea02b-a94a-473f-bb94-7a6a87c2c881':'project-23.html'
  };
  function canonicalProjectFile(file){return aliases[file]||file}
  function sourceProjectFile(file){return Object.keys(aliases).find(source=>aliases[source]===file)||file}
  function canonicalizeProjectLinks(root){
    for(const node of root.querySelectorAll('[href],[data-href]')){
      for(const attr of ['href','data-href']){
        const value=node.getAttribute(attr);
        if(value && aliases[value])node.setAttribute(attr,aliases[value]);
      }
    }
  }
  function applies(file){return files.has(file)||/^project-\d+\.html$/.test(file)||file.startsWith('project.html?case=')}
  function makeCardStats(doc,area,homes,sales){
    const stats=doc.createElement('div');stats.className='case-card-stats';
    for(const [kind,label,value] of [['area','基地',area],['homes','戶數',homes],['sales','預估總銷',sales]]){
      const item=doc.createElement('span');item.className=`case-card-stat case-card-stat--${kind}`;
      const icon=doc.createElement('span');icon.className='case-card-stat-icon';icon.setAttribute('aria-hidden','true');
      const words=doc.createElement('span');words.className='case-card-stat-copy';
      const caption=doc.createElement('small');caption.textContent=label;
      const number=doc.createElement('strong');number.textContent=value;
      words.append(caption,number);item.append(icon,words);stats.append(item);
    }
    return stats;
  }
  function appendProjectCardFacts(copy,main){
    const rows=[...main.querySelectorAll('dl.specs > div')];
    const value=label=>rows.find(row=>row.querySelector('dt')?.textContent.trim().startsWith(label))?.querySelector('dd')?.textContent.trim()||'';
    const area=value('基地面積'),homes=value('規劃戶數');
    const sales=value('預估總銷')||main.querySelector('.case-amount')?.textContent.trim()||'';
    if(area&&homes&&sales)copy.append(makeCardStats(copy.ownerDocument,area,homes,sales));
  }
  function formatCardFacts(root){
    for(const card of root.querySelectorAll('.case-card')){
      const copy=card.querySelector('.case-card-copy');
      if(!copy)continue;
      const location=copy.querySelector(':scope > .project-location');
      const note=copy.querySelector(':scope > .case-card-stats + small, :scope > .case-card-note');
      if(location&&note){
        const inline=copy.ownerDocument.createElement('small');
        inline.className='case-card-inline-note';
        inline.textContent=note.textContent.trim();
        location.append(inline);
        note.remove();
      }
      if(copy.querySelector('.case-card-stats'))continue;
      const paragraphs=[...copy.querySelectorAll(':scope > p:not(.project-location)')];
      const areaLine=paragraphs.find(node=>/^基地\s*.+[|｜]\s*.+戶/.test(node.textContent.trim()));
      const salesLine=paragraphs.find(node=>/^預估總銷\s*.+/.test(node.textContent.trim()));
      if(!areaLine||!salesLine)continue;
      const match=areaLine.textContent.trim().match(/^基地\s*(.+?)\s*[|｜]\s*(.+戶)$/);
      if(!match)continue;
      const sales=salesLine.textContent.trim().replace(/^預估總銷\s*/,'');
      const stats=makeCardStats(copy.ownerDocument,match[1],match[2],sales);
      areaLine.replaceWith(stats);salesLine.remove();
    }
  }
  function layoutProfiles(main){
    for(const profile of main.querySelectorAll('[data-block="specs"] .case-overview > div')){
      const details=profile.querySelector(':scope > dl.specs');
      if(!details)continue;
      let summary=profile.querySelector(':scope > .case-profile-summary');
      if(!summary){
        summary=main.ownerDocument.createElement('div');
        summary.className='case-profile-summary';
        for(const child of [...profile.children])if(child!==details)summary.append(child);
        profile.insertBefore(summary,details);
      }
      if(!summary.querySelector(':scope > .case-amount')){
        const salesRow=[...details.children].find(row=>row.querySelector('dt')?.textContent.trim().startsWith('預估總銷'));
        const sales=salesRow?.querySelector('dd')?.textContent.trim();
        if(sales){
          const amount=main.ownerDocument.createElement('div');amount.className='case-amount';amount.textContent=sales;
          const caption=main.ownerDocument.createElement('p');caption.textContent='預估總銷售額';
          summary.append(amount,caption);
          salesRow.remove();
        }
      }
      const amount=summary.querySelector(':scope > .case-amount');
      const label=amount?.previousElementSibling;
      if(label?.tagName==='P')amount.after(label);
    }
  }
  function formatProjectLocation(main,city='',district=''){
    const location=main.querySelector('[data-block="cover"] .project-location,.page-head .project-location,.hero .project-location');
    if(!location)return;
    const current=location.textContent.replace(/\s+/g,'').trim();
    if(!city||!district){
      const match=current.match(/^(.+?[市縣])(.+)$/);
      if(!match)return;
      city ||= match[1];district ||= match[2];
    }
    district=district.replace(/^[｜|/·・]+/,'').trim();
    if(!district)return;
    const makeTag=value=>{
      const tag=main.ownerDocument.createElement('span');
      tag.className='project-location-tag';tag.textContent=value;
      return tag;
    };
    location.replaceChildren(makeTag(city),makeTag(district));
    location.setAttribute('aria-label',`${city}${district}`);
  }
  function enhanceAmounts(main){
    // Public presentation only: keep the editor's source text untouched.
    if(!main.isConnected||main.ownerDocument.defaultView!==window)return;
    for(const amount of main.querySelectorAll('[data-block="specs"] .case-amount')){
      if(amount.querySelector('.amount-holo'))continue;
      const value=amount.textContent.trim();
      const parts=value.match(/^([\d,]+(?:\.\d+)?)(.*)$/s);
      if(!parts)continue;
      const holo=main.ownerDocument.createElement('span');
      holo.className='amount-holo';
      for(const layer of ['back','mid','front']){
        const span=main.ownerDocument.createElement('span');
        span.className='amount-holo__layer amount-holo__layer--'+layer;
        span.textContent=parts[1];
        if(layer!=='front')span.setAttribute('aria-hidden','true');
        holo.append(span);
      }
      const unit=main.ownerDocument.createElement('span');
      unit.className='amount-unit';
      unit.textContent=parts[2];
      amount.replaceChildren(holo,unit);
    }
  }
  function albumFromFigure(doc,source,index){
    const article=doc.createElement('article');article.className='project-album';
    const cover=doc.createElement('button');cover.type='button';cover.className='project-album-cover';
    const figure=doc.createElement('figure');
    const image=source.querySelector?.('img')?.cloneNode(true)||doc.createElement('img');
    if(!image.getAttribute('src'))image.src='assets/project-placeholder.svg';
    image.removeAttribute('style');
    const originalCaption=source.querySelector?.('figcaption')?.textContent.trim()||source.querySelector?.('span')?.textContent.trim()||image.alt||`相簿 ${index+1}`;
    const caption=doc.createElement('figcaption');
    const title=doc.createElement('strong');title.textContent=originalCaption;
    const hint=doc.createElement('small');hint.textContent='點選查看相簿';
    caption.append(title,hint);figure.append(image,caption);cover.append(figure);
    const items=doc.createElement('div');items.className='project-album-items';items.hidden=true;
    article.append(cover,items);return article;
  }
  function upgradeAlbums(main){
    const selectors=['[data-block="gallery"]','[data-block="journal"]'];
    for(const block of main.querySelectorAll(selectors.join(','))){
      if(block.dataset.block==='albums'||block.querySelector('.project-album-grid'))continue;
      const candidates=[...block.querySelectorAll('figure')].filter(figure=>figure.querySelector('img'));
      const loose=[...block.querySelectorAll('button > img')].filter(img=>!img.closest('figure')).map(img=>img.parentElement);
      const media=[...candidates,...loose];
      if(media.length<3)continue;
      const grid=main.ownerDocument.createElement('div');grid.className='project-album-grid';
      media.slice(0,12).forEach((item,index)=>grid.append(albumFromFigure(main.ownerDocument,item,index)));
      const container=block.querySelector('.pb-items,.meeting-gallery,.gallery,.heping-gallery,.taian-journal-grid');
      if(container)container.replaceWith(grid);else block.append(grid);
      block.dataset.block='albums';
    }
  }
  function prepare(main){
    if(!main)return false;
    if(main.dataset.blockVersion){if(main.dataset.blockVersion==='1'){formatProjectLocation(main,main.dataset.projectCity,main.dataset.projectDistrict);layoutProfiles(main);upgradeAlbums(main);enhanceAmounts(main)}return main.dataset.blockVersion==='1'}
    // Work on a clone. An unfamiliar layout keeps its complete original page.
    const work=main.cloneNode(true);
    const specs=work.querySelector('dl.specs');
    const heading=work.querySelector('h1');
    if(!specs||!heading)return false;
    const make=(type)=>{const el=main.ownerDocument.createElement('section');el.dataset.block=type;return el};
    const cover=make('cover'), profile=make('specs');
    for(const el of work.querySelectorAll(':scope > .breadcrumbs,:scope > .page-head,:scope > .hero'))cover.append(el);
    const overview=work.querySelector(':scope > .case-overview');
    let profileAfter=null;
    if(overview){
      const media=overview.querySelector(':scope > figure,:scope > .case-placeholder');
      if(media)cover.append(media);
      profile.append(overview);
    }else{
      const details=specs.closest('.details');
      if(!details)return false;
      profileAfter=[...work.children].find(child=>child.contains(details));
      profile.append(details);
    }
    const blocks=overview?[cover,profile]:[cover];
    for(const el of [...work.children]){
      if(!el.textContent.trim()&&!el.querySelector('img,a')){
        if(el===profileAfter)blocks.push(profile);
        continue;
      }
      let type='story';
      if(el.matches('.case-bottom'))type='footer';
      else if(el.matches('.metrics'))type='metrics';
      else if(el.querySelector('.team'))type='team';
      else if(el.querySelector('time'))type='journal';
      else if(el.querySelector('img'))type='gallery';
      else if(el.querySelector('.features,.heping-highlights,.case-highlights'))type='features';
      const block=make(type);block.append(el);blocks.push(block);
      if(el===profileAfter)blocks.push(profile);
    }
    main.replaceChildren(...blocks);
    main.dataset.blockVersion='1';
    formatProjectLocation(main,main.dataset.projectCity,main.dataset.projectDistrict);
    layoutProfiles(main);
    upgradeAlbums(main);
    enhanceAmounts(main);
    return true;
  }
  const templates={
    story:'<h2>段落標題</h2><p>段落內容</p>',
    features:'<h2>個案特色</h2><ul><li>特色說明</li></ul>',
    featureStory:'<div class="feature-story-head"><h2>在熟悉的街區，想像新的日常</h2><p>生活底蘊 × 建築美學 × 更新願景</p></div><div class="feature-story-grid"><article><small>NEIGHBORHOOD</small><h3>特色主標題</h3><p>完整說明這項特色帶來的生活價值。</p></article><article><small>ARCHITECTURE</small><h3>特色主標題</h3><p>完整說明建築規劃與設計想法。</p></article></div>',
    metrics:'<h2>重點數據</h2><div class="pb-items"><p data-metric-ref=""></p></div>',
    gallery:'<h2>圖片集</h2><div class="pb-items"><figure><img alt="個案照片"><figcaption>照片說明</figcaption></figure></div>',
    albums:'<div class="album-section-head"><h2>工程與活動紀錄</h2><p>點選相簿查看更多照片</p></div><div class="project-album-grid"><article class="project-album"><button type="button" class="project-album-cover"><figure><img alt="相簿封面"><figcaption><strong>相簿名稱</strong><small>點選查看相簿</small></figcaption></figure></button><div class="project-album-items" hidden></div></article></div>',
    journal:'<h2>工程與活動紀錄</h2><div class="pb-items"><article><time>日期</time><h3>事件名稱</h3><p>事件說明</p></article></div>',
    team:'<h2>參與團隊</h2><div class="pb-items"><article><small>角色</small><h3>單位名稱</h3><p>人員與說明</p></article></div>'
  };
  function newBlock(doc,type){
    const el=doc.createElement('section');el.dataset.block=type;el.innerHTML=templates[type];
    el.querySelector('img')?.setAttribute('src','assets/project-placeholder.svg');
    return el;
  }
  function refresh(main){
    const fields=[...main.querySelectorAll('[data-block="specs"] dt')];
    for(const metric of main.querySelectorAll('[data-metric-ref]')){
      const field=fields.find(dt=>dt.parentElement.dataset.fieldId===metric.dataset.metricRef);
      metric.textContent=field?field.textContent+'　'+field.nextElementSibling.textContent:'請選取資料欄位';
    }
  }
  function updateCard(card,html){
    const main=new DOMParser().parseFromString(html,'text/html').querySelector('main[data-block-version="1"]');
    if(!main)return;
    const cover=main.querySelector('[data-block="cover"]');
    const title=cover?.querySelector('h1')?.textContent;
    const img=cover?.querySelector('img'),thumb=card.querySelector('img');
    if(title && card.querySelector('h2'))card.querySelector('h2').textContent=title;
    if(img&&thumb){thumb.src=img.getAttribute('src');thumb.alt=img.alt}
    const address=cover?.querySelector('.project-location')?.textContent.trim().match(/^(.+?[市縣])(.+)$/);
    if(address){
      card.dataset.city=address[1];card.dataset.district=address[2];
      const loc=card.querySelector('.project-location');if(loc)loc.textContent=address[0];
    }
    const lead=cover?.querySelector('.lead')?.textContent;
    if(lead){const summary=card.ownerDocument.createElement('p');summary.textContent=lead;card.querySelector('.case-card-copy')?.append(summary)}
  }
  function openAlbum(article){
    let dialog=document.querySelector('.project-album-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.className='project-album-dialog';dialog.innerHTML='<button type="button" class="project-album-close" aria-label="關閉相簿">×</button><div class="project-album-viewer"><img alt=""><button type="button" class="project-album-prev" aria-label="上一張">‹</button><button type="button" class="project-album-next" aria-label="下一張">›</button><p></p></div><div class="project-album-thumbs"></div>';document.body.append(dialog);dialog.querySelector('.project-album-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()})}
    const figures=[article.querySelector('.project-album-cover figure'),...article.querySelectorAll('.project-album-items figure')].filter(Boolean);
    let index=0;const image=dialog.querySelector('.project-album-viewer img'),caption=dialog.querySelector('.project-album-viewer p'),thumbs=dialog.querySelector('.project-album-thumbs');
    const show=i=>{index=(i+figures.length)%figures.length;const img=figures[index].querySelector('img');image.src=img.src;image.alt=img.alt;caption.textContent=figures[index].querySelector('figcaption strong')?.textContent.trim()||figures[index].querySelector('figcaption')?.textContent.trim()||img.alt;[...thumbs.children].forEach((b,n)=>b.toggleAttribute('aria-current',n===index))};
    thumbs.replaceChildren(...figures.map((figure,i)=>{const b=document.createElement('button');b.type='button';const img=figure.querySelector('img').cloneNode(true);b.append(img);b.onclick=()=>show(i);return b}));
    dialog.querySelector('.project-album-prev').onclick=()=>show(index-1);dialog.querySelector('.project-album-next').onclick=()=>show(index+1);show(0);dialog.showModal();
  }
  function cleanupAlbumZoom(root=document){
    for(const zoom of root.querySelectorAll('.project-album-cover .image-zoom')){
      const img=zoom.querySelector('img');if(img)zoom.replaceWith(img);
    }
  }
  document.addEventListener('click',event=>{const cover=event.target.closest?.('.project-album-cover');if(cover&&!cover.closest('[contenteditable]')){event.preventDefault();event.stopImmediatePropagation();openAlbum(cover.closest('.project-album'))}},true);
  document.addEventListener('DOMContentLoaded',()=>{const main=document.querySelector('main');if(main&&applies(location.pathname.split('/').pop()+location.search)){prepare(main);upgradeAlbums(main);cleanupAlbumZoom();new MutationObserver(()=>cleanupAlbumZoom()).observe(main,{childList:true,subtree:true})}});
  return {types,applies,prepare,newBlock,refresh,upgradeAlbums,updateCard,formatCardFacts,formatProjectLocation,appendProjectCardFacts,canonicalProjectFile,sourceProjectFile,canonicalizeProjectLinks};
})();
