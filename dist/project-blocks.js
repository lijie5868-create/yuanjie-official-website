// Versioned semantic HTML is both the block document and the deployable fallback.
window.ProjectBlocks = (() => {
  const types = {cover:'個案封面', specs:'基本資料表', metrics:'重點數據', story:'段落圖文', features:'個案特色（舊版）', featureStory:'個案特色（敘事卡片）', gallery:'圖片集（單層）', albums:'圖片集（相簿）', journal:'工程與活動紀錄（舊版）', team:'參與團隊', customHtml:'自訂 HTML 區塊'};
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
      const inlineNote=location?.querySelector('.case-card-inline-note');
      if(inlineNote){inlineNote.removeAttribute('tabindex');inlineNote.removeAttribute('role');inlineNote.removeAttribute('aria-label');inlineNote.classList.remove('is-open')}
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
  function orderCaseProfile(main){
    const cover=main.querySelector(':scope > [data-block="cover"]'),specs=main.querySelector(':scope > [data-block="specs"]');
    if(!cover||!specs)return;
    if(main.firstElementChild!==cover)main.prepend(cover);
    if(cover.nextElementSibling!==specs)cover.after(specs);
  }
  function featureCategory(text){
    if(/鄰近|街區|人文|生活|學區|交通|林蔭|環境|公園|天母|仁愛路/.test(text))return 'NEIGHBORHOOD';
    if(/建築|規劃|設計|外觀|空間|景觀|樓層|大師|建築師/.test(text))return 'ARCHITECTURE';
    if(/權利|更新|同意|整合|分回|稅|獎勵|危老|都更/.test(text))return 'REGENERATION';
    return 'PROJECT HIGHLIGHT';
  }
  function normalizeFeatureSections(main){
    for(const section of main.querySelectorAll(':scope > [data-block="features"],:scope > [data-block="featureStory"]')){
      const oldGrid=section.querySelector('.feature-story-grid');
      const list=oldGrid||section.querySelector('.features,.heping-highlights,.case-highlights,.pb-items,ul');
      const entries=list?[...list.querySelectorAll(':scope > article,:scope > li,:scope > div')]:[];
      if(!entries.length)continue;
      let head=section.querySelector('.feature-story-head');
      if(!head){
        head=main.ownerDocument.createElement('div');head.className='feature-story-head';
        const sourceEyebrow=[...section.querySelectorAll('.eyebrow')].find(item=>!item.closest('.feature-story-grid,.features,.heping-highlights,.case-highlights,.pb-items,ul'));
        const kicker=main.ownerDocument.createElement('div');kicker.className='eyebrow feature-story-eyebrow';kicker.textContent=sourceEyebrow?.textContent.trim()||'03 / PROJECT HIGHLIGHTS';
        const heading=[...section.querySelectorAll('h2,h3')].find(item=>!item.closest('.feature-story-grid,.features,.heping-highlights,.case-highlights,.pb-items,ul'));
        const title=main.ownerDocument.createElement('h2');title.textContent=heading?.textContent.trim()||'個案特色';
        const candidate=[...section.querySelectorAll('p,.section-head p')].find(item=>!item.closest('.feature-story-grid,.features,.heping-highlights,.case-highlights,.pb-items,ul'));
        const tagline=candidate?.cloneNode(true)||null;
        head.append(kicker,title);if(tagline)head.append(tagline);
        const oldHeader=heading?.closest('.section-head');
        if(oldHeader&&!oldHeader.closest('.feature-story-grid,.features,.heping-highlights,.case-highlights,.pb-items,ul'))oldHeader.replaceWith(head);
        else if(heading)heading.remove();
        if(candidate?.isConnected)candidate.remove();
        for(const eyebrow of [...section.querySelectorAll(':scope .eyebrow')])if(!eyebrow.closest('.feature-story-head,.feature-story-grid,.features,.heping-highlights,.case-highlights,.pb-items,ul'))eyebrow.remove();
        if(!head.isConnected)section.prepend(head);
      }else if(!head.querySelector('.feature-story-eyebrow,.eyebrow')){
        const kicker=main.ownerDocument.createElement('div');kicker.className='eyebrow feature-story-eyebrow';kicker.textContent='03 / PROJECT HIGHLIGHTS';head.prepend(kicker);
      }
      let grid=oldGrid;
      if(!grid){grid=main.ownerDocument.createElement('div');grid.className='feature-story-grid';list.replaceWith(grid)}
      else grid.replaceChildren();
      for(const [index,item] of entries.entries()){
        let small=item.querySelector(':scope > small,:scope > .number,:scope > .eyebrow');
        let label=small?.textContent.trim()||'';
        label=label.replace(/^\d+\s*(?:[-—–－−·]\s*)?/,'').trim();
        const existingHeading=item.querySelector(':scope > h3,:scope > h4,:scope > strong');
        const paragraphs=[...item.querySelectorAll(':scope > p')];
        let title=existingHeading?.textContent.trim()||'';
        if(!title){
          const plain=item.cloneNode(true);
          plain.querySelectorAll('small,.number,.eyebrow,p,time,img,svg,figure').forEach(node=>node.remove());
          title=plain.textContent.replace(/\s+/g,' ').trim();
        }
        if(!title&&paragraphs.length){title=paragraphs[0].textContent.trim();paragraphs.shift()}
        const description=paragraphs.map(p=>p.textContent.trim()).filter(Boolean).join('\n');
        const descriptor=`${title} ${description}`;
        const card=main.ownerDocument.createElement('article');
        const category=label&&!/^\d+$/.test(label)?label:featureCategory(descriptor);
        const eyebrow=main.ownerDocument.createElement('small');
        const number=main.ownerDocument.createElement('span');number.className='feature-index';number.textContent=String(index+1).padStart(2,'0');
        eyebrow.append(number,main.ownerDocument.createTextNode(`  -  ${category}`));
        const h3=main.ownerDocument.createElement('h3');h3.textContent=title||'特色標題';
        card.append(eyebrow,h3);if(description){const p=main.ownerDocument.createElement('p');p.textContent=description;card.append(p)}
        grid.append(card);
      }
      if(!grid.isConnected){const wrapper=list?.parentElement;if(wrapper&&wrapper!==section)wrapper.append(grid);else section.append(grid)}
      section.dataset.block='featureStory';
      head.querySelector('h2')?.classList.add('feature-story-title');
    }
    const seen=new Set();
    for(const section of main.querySelectorAll(':scope > [data-block="featureStory"]')){
      const grid=section.querySelector('.feature-story-grid');
      for(const card of [...(grid?.querySelectorAll(':scope > article')||[])]){
        const title=card.querySelector('h3')?.textContent.replace(/\s+/g,'').trim()||'';
        const description=card.querySelector('p')?.textContent.replace(/\s+/g,'').trim()||'';
        const key=`${title}|${description}`;
        if(title&&seen.has(key))card.remove();else if(title)seen.add(key);
      }
      if(grid&&!grid.children.length&&section.querySelector('.feature-story-head h2')?.textContent.trim()==='個案特色')section.remove();
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
  function normalizeCover(main){
    const cover=main.querySelector('[data-block="cover"]');if(!cover)return;
    const hero=cover.querySelector(':scope > .hero');
    if(hero){
      const existing=cover.querySelector(':scope > .page-head'),intro=hero.querySelector(':scope > .intro'),figure=hero.querySelector(':scope > figure');
      if(existing){if(figure)hero.after(figure);hero.remove()}
      else if(intro){
        intro.classList.remove('intro');intro.classList.add('page-head');
        const breadcrumbs=cover.querySelector(':scope > .breadcrumbs');if(breadcrumbs)intro.prepend(breadcrumbs);
        hero.replaceWith(intro,...(figure?[figure]:[]));
      }
    }
    const copy=cover.querySelector(':scope > .page-head');if(!copy)return;
    copy.querySelector(':scope > h1')?.classList.add('page-title');
    const identity=copy.querySelector('.eyebrow');if(identity)identity.classList.add('project-signature');
    let narrative=copy.querySelector('.cover-narrative');
    if(!narrative){
      narrative=main.ownerDocument.createElement('div');narrative.className='cover-narrative';
      const existingHeading=copy.querySelector(':scope > h2'),existingLead=copy.querySelector(':scope > .lead');
      const existingBody=existingHeading?.nextElementSibling?.matches('p:not(.project-location)')?existingHeading.nextElementSibling:null;
      const motto=existingHeading||main.ownerDocument.createElement('h2');
      if(existingHeading||existingLead?.textContent.trim()){
        motto.classList.add('cover-motto');motto.dataset.placeholder='補充個案標語';
        if(!existingHeading)motto.textContent=existingLead.textContent;
        narrative.append(motto);
      }
      existingLead?.remove();
      if(existingBody)existingBody.remove();
      const location=copy.querySelector('.project-location');(location||copy.querySelector('h1'))?.after(narrative);
    }
    narrative.querySelectorAll('.cover-description,[data-placeholder="補充個案說明文字"]').forEach(node=>node.remove());
    let explore=copy.querySelector('.cover-explore,.explore');
    if(!explore){explore=main.ownerDocument.createElement('a');explore.href='#project';copy.append(explore)}
    explore.classList.add('cover-explore');explore.innerHTML='<span>探索本案</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13m-5-5 5 5 5-5"/></svg>';
    let end=copy.querySelector(':scope > .cover-hero-end');
    if(!end){end=main.ownerDocument.createElement('div');end.className='cover-hero-end';copy.append(end)}
    end.append(explore);
    let rule=end.querySelector('.cover-rule');
    if(!rule){rule=main.ownerDocument.createElement('span');rule.className='cover-rule';rule.setAttribute('aria-hidden','true')}
    end.append(rule);
    const specs=main.querySelector('[data-block="specs"]');if(specs&&!main.querySelector('#project'))specs.id='project';
  }
  function stripChineseFullStops(root){
    const doc=root.ownerDocument,walker=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes)if(!node.parentElement?.closest('script,style,template'))node.nodeValue=node.nodeValue.replace(/。/g,'');
    for(const el of root.querySelectorAll('[alt],[title],[aria-label]'))for(const attr of ['alt','title','aria-label'])if(el.hasAttribute(attr))el.setAttribute(attr,el.getAttribute(attr).replace(/。/g,''));
    if(doc.title)doc.title=doc.title.replace(/。/g,'');
    const description=doc.querySelector('meta[name="description"]');if(description)description.content=description.content.replace(/。/g,'');
  }
  function partnerIcon(role){
    if(/實施/.test(role))return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9 12 4l9 5v11H3V9Z"/><path d="M8 20v-6h8v6"/></svg>';
    if(/設計/.test(role))return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V5h11v15M15 9h5v11M2 20h20"/><path d="M7 8h2m3 0h.01M7 12h2m3 0h.01"/></svg>';
    if(/顧問/.test(role))return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H9l-5 3V5Z"/><path d="M8 9h8m-8 4h5"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V8l8-4 8 4v12M2 20h20M8 10h2m4 0h2m-8 4h2m4 0h2m-5 6v-3h2v3"/></svg>';
  }
  function sizePartnerGrid(grid){const count=Math.min(4,Math.max(1,grid.children.length));grid.style.setProperty('--partner-count',String(count));grid.dataset.partnerCount=String(count)}
  function normalizeHeroPartners(main){
    const cover=main.querySelector(':scope > [data-block="cover"]'),copy=cover?.querySelector(':scope > .page-head');
    if(!cover||!copy)return;
    const existing=copy.querySelector('.cover-partners');
    if(existing){
      [...existing.querySelectorAll(':scope > .cover-partner')].forEach((item,index)=>{
        if(index>=4||!item.querySelector('small')?.textContent.trim()||!item.querySelector('strong')?.textContent.trim())item.remove();
      });
      if(!existing.children.length)existing.remove();else sizePartnerGrid(existing);
      return;
    }
    if(cover.dataset.partnersManual==='true')return;
    const source=main.querySelector(':scope > [data-block="team"]');
    const rows=[];
    if(source){
      const items=source.querySelectorAll('.team>div,.pb-items>article');
      for(const item of items){
        const role=item.querySelector('small')?.textContent.trim()||'參與團隊';
        const name=item.querySelector('h3,strong')?.textContent.trim()||'';
        if(name)rows.push([role,name]);
      }
      source.remove();
    }
    if(!rows.length){
      const facts=main.querySelectorAll(':scope > [data-block="specs"] dl.specs>div');
      for(const row of facts){
        const role=row.querySelector('dt')?.textContent.trim()||'',name=row.querySelector('dd')?.textContent.trim()||'';
        if(/^(整合開發|全案管理|實施者|建築設計|都更顧問)$/.test(role)&&name)rows.push([role,name]);
      }
    }
    if(!rows.length)return;
    const grid=main.ownerDocument.createElement('div');grid.className='cover-partners';grid.dataset.coverPartners='';grid.setAttribute('aria-label','參與團隊');
    for(const [role,rawName] of rows.slice(0,4)){
      const item=main.ownerDocument.createElement('article');item.className='cover-partner';item.dataset.partnerItem='';
      item.innerHTML=`${partnerIcon(role)}<small></small><strong></strong>`;
      item.querySelector('small').textContent=role;
      item.querySelector('strong').textContent=rawName.replace(/股份有限公司|有限公司|事務所/g,'').replace(/\s+/g,' ').trim();
      grid.append(item);
    }
    sizePartnerGrid(grid);
    copy.querySelector('.cover-narrative')?.after(grid);
  }
  function setCoverPartners(cover,entries){
    const copy=cover?.querySelector(':scope > .page-head');if(!copy)return;
    copy.querySelector('.cover-partners')?.remove();
    cover.dataset.partnersManual='true';
    const filled=entries.slice(0,4).map(entry=>({role:String(entry.role||'').trim(),lineOne:String(entry.lineOne||entry.name||'').trim(),lineTwo:String(entry.lineTwo||'').trim()})).filter(entry=>entry.role&&(entry.lineOne||entry.lineTwo));
    if(!filled.length)return;
    const grid=cover.ownerDocument.createElement('div');grid.className='cover-partners';grid.dataset.coverPartners='';grid.setAttribute('aria-label','參與團隊');
    for(const {role,lineOne,lineTwo} of filled){
      const item=cover.ownerDocument.createElement('article');item.className='cover-partner';item.dataset.partnerItem='';
      item.innerHTML=`${partnerIcon(role)}<small></small><strong></strong>`;
      item.querySelector('small').textContent=role;
      const title=item.querySelector('strong');
      for(const [index,line] of [lineOne,lineTwo].entries())if(line){
        if(title.childNodes.length)title.append(cover.ownerDocument.createElement('br'));
        const span=cover.ownerDocument.createElement('span');span.dataset.partnerLine=String(index+1);span.textContent=line;title.append(span);
      }
      grid.append(item);
    }
    sizePartnerGrid(grid);
    (copy.querySelector('.cover-narrative')||copy.querySelector('.project-location')||copy.querySelector('h1'))?.after(grid);
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
      const sectionTitle=block.querySelector('h2,h3')?.textContent.trim()||'';
      if(!media.length||/建築外觀|空間構想|建築構想|單圖/.test(sectionTitle))continue;
      const grid=main.ownerDocument.createElement('div');grid.className='project-album-grid';
      const album=albumFromFigure(main.ownerDocument,media[0],0);
      const items=album.querySelector('.project-album-items');
      media.slice(1,40).forEach(item=>{const figure=main.ownerDocument.createElement('figure');const img=item.querySelector('img')?.cloneNode(true);if(!img)return;const caption=main.ownerDocument.createElement('figcaption');caption.textContent=item.querySelector('figcaption')?.textContent.trim()||item.querySelector('span')?.textContent.trim()||img.alt||'照片說明';figure.append(img,caption);items.append(figure)});
      grid.append(album);
      const container=block.querySelector('.pb-items,.meeting-gallery,.gallery,.heping-gallery,.taian-journal-grid');
      if(container)container.replaceWith(grid);else block.append(grid);
      block.dataset.block='albums';
    }
    const caseTitle=main.querySelector('[data-block="cover"] h1')?.textContent||'';
    for(const block of main.querySelectorAll('[data-block="albums"]')){
      // Briefing photos for these cases belong to one album.
      if(!/仁愛路|士東路/.test(caseTitle))continue;
      const grid=block.querySelector('.project-album-grid');if(!grid||grid.children.length<2)continue;
      const first=grid.querySelector('.project-album'),items=first?.querySelector('.project-album-items');if(!items)continue;
      for(const album of [...grid.children].slice(1)){
        const cover=album.querySelector('.project-album-cover figure');
        if(cover){const figure=main.ownerDocument.createElement('figure');const img=cover.querySelector('img')?.cloneNode(true);const caption=main.ownerDocument.createElement('figcaption');caption.textContent=cover.querySelector('figcaption strong')?.textContent.trim()||img?.alt||'照片說明';if(img)figure.append(img,caption);items.append(figure)}
        for(const figure of album.querySelectorAll('.project-album-items figure'))items.append(figure);
        album.remove();
      }
    }
  }
  function prepare(main){
    if(!main)return false;
    if(main.dataset.caseLayout==='unified-v1'){
      stripChineseFullStops(main.ownerDocument.body||main);formatProjectLocation(main,main.dataset.projectCity,main.dataset.projectDistrict);normalizeCover(main);normalizeHeroPartners(main);layoutProfiles(main);orderCaseProfile(main);ensureDraftSpecs(main);normalizeFeatureSections(main);upgradeAlbums(main);enhanceAmounts(main);enhanceAlbumRails(main);return true;
    }
    if(main.dataset.blockVersion){formatProjectLocation(main,main.dataset.projectCity,main.dataset.projectDistrict);normalizeCover(main);normalizeHeroPartners(main);layoutProfiles(main);orderCaseProfile(main);ensureDraftSpecs(main);normalizeFeatureSections(main);upgradeAlbums(main);stripChineseFullStops(main.ownerDocument.body||main);enhanceAmounts(main);main.dataset.caseLayout='unified-v1';enhanceAlbumRails(main);return true}
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
    normalizeCover(main);
    normalizeHeroPartners(main);
    layoutProfiles(main);
    orderCaseProfile(main);
    ensureDraftSpecs(main);
    normalizeFeatureSections(main);
    upgradeAlbums(main);
    stripChineseFullStops(main.ownerDocument.body||main);
    enhanceAmounts(main);
    main.dataset.caseLayout='unified-v1';
    enhanceAlbumRails(main);
    return true;
  }
  function ensureDraftSpecs(main){
    if(!main.dataset.projectCategory)return;
    const specs=main.querySelector('[data-block="specs"] dl.specs');
    if(!specs||specs.children.length>3)return;
    const placeholder=[...specs.children].find(row=>row.querySelector('dt')?.textContent.trim()==='建築規劃'&&row.querySelector('dd')?.textContent.trim()==='請補充個案資料');
    placeholder?.remove();
    const current=new Set([...specs.querySelectorAll('dt')].map(node=>node.textContent.trim()));
    for(const name of ['整合開發','實施者','建築設計','都更顧問','基地面積','使用分區','規劃戶數','建築樓層','建築結構','實施方式','預估總銷']){
      if(current.has(name))continue;
      const row=main.ownerDocument.createElement('div'),label=main.ownerDocument.createElement('dt'),value=main.ownerDocument.createElement('dd');
      label.textContent=name;row.append(label,value);specs.append(row);
    }
  }
  const templates={
    story:'<h2>段落標題</h2><p>段落內容</p>',
    features:'<h2>個案特色</h2><ul><li>特色說明</li></ul>',
    featureStory:'<div class="feature-story-head"><div class="eyebrow feature-story-eyebrow">03 / PROJECT HIGHLIGHTS</div><h2>個案特色</h2></div><div class="feature-story-grid"><article><small>NEIGHBORHOOD</small><h3>街區特色標題</h3><p>補充這項特色與生活環境的關係</p></article><article><small>ARCHITECTURE</small><h3>建築特色標題</h3><p>補充建築規劃或設計亮點</p></article><article><small>REGENERATION</small><h3>更新特色標題</h3><p>補充更新方式或本案規劃特色</p></article></div>',
    metrics:'<h2>重點數據</h2><div class="pb-items"><p data-metric-ref=""></p></div>',
    gallery:'<h2>圖片集</h2><div class="pb-items"><figure><img alt="個案照片"><figcaption>照片說明</figcaption></figure></div>',
    albums:'<div class="album-section-head"><h2>工程與活動紀錄</h2><p>點選相簿查看更多照片</p></div><div class="project-album-grid"><article class="project-album"><button type="button" class="project-album-cover"><figure><img alt="相簿封面"><figcaption><strong>相簿名稱</strong><small>點選查看相簿</small></figcaption></figure></button><div class="project-album-items" hidden></div></article></div>',
    journal:'<h2>工程與活動紀錄</h2><div class="pb-items"><article><time>日期</time><h3>事件名稱</h3><p>事件說明</p></article></div>',
    team:'<h2>參與團隊</h2><div class="pb-items"><article><small>角色</small><h3>單位名稱</h3><p>人員與說明</p></article></div>',
    customHtml:'<div class="custom-html-content"><section class="custom-html-example" style="padding:32px;border:1px solid #d8d5cd;border-radius:12px;background-color:#f7f5f1"><p style="color:#4a6984;letter-spacing:.12em">CUSTOM SECTION</p><h2>自訂區塊標題</h2><p>可貼上 ChatGPT 產生的 HTML，再於右側預覽。</p></section></div>'
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
    enhanceAlbumRails(main);
  }
  function updateCard(card,html){
    const main=new DOMParser().parseFromString(html,'text/html').querySelector('main[data-block-version]');
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
    syncCardStatus(card,main);
  }
  function syncCardStatus(card,main){
    const active=main?.dataset.projectCategory==='urban'&&main.dataset.selectingImplementer==='true';
    card.querySelector('.case-card-selection-status')?.remove();
    card.toggleAttribute('data-selecting-implementer',active);
    if(!active)return;
    const badge=card.ownerDocument.createElement('span');
    badge.className='case-card-selection-status';
    badge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16M6 20V9l6-4 6 4v11M9 13h6M12 10v6"/></svg><span>遴選實施者</span>';
    card.append(badge);
  }
  const enhancedAlbumRails=new WeakSet();
  const boundAlbumRoots=new WeakSet();
  function openAlbum(article,startIndex=0){
    const doc=article.ownerDocument;
    let dialog=doc.querySelector('.project-album-dialog');
    if(!dialog){
      dialog=doc.createElement('dialog');dialog.className='project-album-dialog';dialog.setAttribute('aria-label','相簿照片瀏覽器');
      dialog.innerHTML='<div class="project-album-toolbar" aria-label="照片縮放工具"><button type="button" data-album-zoom-out aria-label="縮小照片">−</button><output data-album-zoom-level>100%</output><button type="button" data-album-zoom-in aria-label="放大照片">＋</button><button type="button" class="project-album-close" aria-label="關閉相簿">×</button></div><div class="project-album-viewer"><button type="button" class="project-album-prev" aria-label="上一張照片">‹</button><img alt=""><button type="button" class="project-album-next" aria-label="下一張照片">›</button></div><div class="project-album-thumbs" aria-label="相簿照片縮圖"></div><div class="project-album-info"><p></p><span data-album-counter></span></div>';
      doc.body.append(dialog);dialog.querySelector('.project-album-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
      dialog.addEventListener('keydown',e=>{if(!dialog.open)return;if(e.key==='ArrowLeft'){e.preventDefault();dialog.querySelector('.project-album-prev').click()}if(e.key==='ArrowRight'){e.preventDefault();dialog.querySelector('.project-album-next').click()}});
    }
    const figures=[article.querySelector('.project-album-cover figure'),...article.querySelectorAll('.project-album-items figure')].filter(Boolean);
    if(!figures.length)return;
    let index=0,zoom=1,fitWidth=0,fitHeight=0;
    const viewer=dialog.querySelector('.project-album-viewer'),image=viewer.querySelector('img'),caption=dialog.querySelector('.project-album-info p'),counter=dialog.querySelector('[data-album-counter]'),thumbs=dialog.querySelector('.project-album-thumbs'),zoomOut=dialog.querySelector('[data-album-zoom-out]'),zoomIn=dialog.querySelector('[data-album-zoom-in]'),zoomLevel=dialog.querySelector('[data-album-zoom-level]');
    const applyZoom=()=>{if(!fitWidth||!fitHeight)return;image.style.setProperty('width',`${Math.round(fitWidth*zoom)}px`,'important');image.style.setProperty('height',`${Math.round(fitHeight*zoom)}px`,'important');zoomLevel.value=`${Math.round(zoom*100)}%`;zoomLevel.textContent=zoomLevel.value;zoomOut.disabled=zoom<=1;zoomIn.disabled=zoom>=3};
    const fit=()=>{if(!image.naturalWidth)return;const maxW=Math.max(1,viewer.clientWidth-56),maxH=Math.max(1,viewer.clientHeight-48),scale=Math.min(1,maxW/image.naturalWidth,maxH/image.naturalHeight);fitWidth=Math.round(image.naturalWidth*scale);fitHeight=Math.round(image.naturalHeight*scale);applyZoom()};
    const show=i=>{index=(i+figures.length)%figures.length;zoom=1;const img=figures[index].querySelector('img');image.onload=()=>requestAnimationFrame(fit);image.src=img.currentSrc||img.src;image.alt=img.alt;caption.textContent=figures[index].querySelector('figcaption strong')?.textContent.trim()||figures[index].querySelector('figcaption')?.textContent.trim()||img.alt;counter.textContent=`${index+1} / ${figures.length} 張`;[...thumbs.children].forEach((b,n)=>b.toggleAttribute('aria-current',n===index));const active=thumbs.children[index];if(active)thumbs.scrollTo({left:Math.max(0,active.offsetLeft-(thumbs.clientWidth-active.clientWidth)/2),behavior:'smooth'});if(image.complete)requestAnimationFrame(fit)};
    thumbs.replaceChildren(...figures.map((figure,i)=>{const b=doc.createElement('button');b.type='button';b.setAttribute('aria-label',`查看第 ${i+1} 張照片`);const img=figure.querySelector('img').cloneNode(true);b.append(img);b.onclick=()=>show(i);return b}));
    zoomOut.onclick=()=>{zoom=Math.max(1,zoom-.25);applyZoom()};zoomIn.onclick=()=>{zoom=Math.min(3,zoom+.25);applyZoom()};
    dialog.querySelector('.project-album-prev').onclick=()=>show(index-1);dialog.querySelector('.project-album-next').onclick=()=>show(index+1);dialog.showModal();show(startIndex);
    const resize=()=>requestAnimationFrame(fit);window.addEventListener('resize',resize);dialog.addEventListener('close',()=>window.removeEventListener('resize',resize),{once:true});
  }
  function enhanceAlbumRails(root=document){
    if(!boundAlbumRoots.has(root)){
      boundAlbumRoots.add(root);
      root.addEventListener('click',event=>{
        const cover=event.target.closest?.('.project-album-cover');
        if(!cover||!root.contains(cover)||root.closest?.('[contenteditable]'))return;
        event.preventDefault();openAlbum(cover.closest('.project-album'),0);
      });
    }
    for(const rail of root.querySelectorAll('[data-block="albums"] .project-album')){
      if(enhancedAlbumRails.has(rail))continue;
      enhancedAlbumRails.add(rail);rail.removeAttribute('tabindex');rail.removeAttribute('role');rail.setAttribute('aria-label','相簿');
      const cover=rail.querySelector('.project-album-cover');
      if(cover)cover.type='button';
    }
  }
  function cleanupAlbumZoom(root=document){
    for(const zoom of root.querySelectorAll('.project-album .image-zoom')){
      const img=zoom.querySelector('img');if(img)zoom.replaceWith(img);
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{const main=document.querySelector('main');if(main&&applies(location.pathname.split('/').pop()+location.search)){prepare(main);upgradeAlbums(main);enhanceAlbumRails(main);cleanupAlbumZoom();new MutationObserver(()=>{enhanceAlbumRails(main);cleanupAlbumZoom()}).observe(main,{childList:true,subtree:true})}});
  return {types,applies,prepare,newBlock,refresh,upgradeAlbums,enhanceAlbumRails,cleanupAlbumZoom,normalizeCover,setCoverPartners,partnerIcon,updateCard,syncCardStatus,formatCardFacts,formatProjectLocation,appendProjectCardFacts,canonicalProjectFile,sourceProjectFile,canonicalizeProjectLinks};
})();
document.addEventListener('click',event=>{
  const note=event.target.closest?.('.case-card-inline-note');
  if(!note||note.closest('[contenteditable="true"]'))return;
  event.preventDefault();event.stopPropagation();
});
