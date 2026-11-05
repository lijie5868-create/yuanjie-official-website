// Versioned semantic HTML is both the block document and the deployable fallback.
window.ProjectBlocks = (() => {
  const types = {cover:'個案封面', specs:'基本資料表', metrics:'重點數據', story:'段落圖文', features:'個案特色', gallery:'圖片集', journal:'工程與活動紀錄', team:'參與團隊'};
  const files = new Set(['shidong','heping','project-xinguang-urban','project-wuxing',...Array.from({length:19},(_,i)=>'project-'+(i+2)).filter(name=>name!=='project-11')].map(name=>name+'.html'));
  function applies(file){return files.has(file)||file.startsWith('project.html?case=')}
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
      if(!copy||copy.querySelector('.case-card-stats'))continue;
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
      if(profile.querySelector(':scope > .case-profile-summary'))continue;
      const details=profile.querySelector(':scope > dl.specs');
      if(!details)continue;
      const summary=main.ownerDocument.createElement('div');
      summary.className='case-profile-summary';
      for(const child of [...profile.children])if(child!==details)summary.append(child);
      profile.insertBefore(summary,details);
      const amount=summary.querySelector(':scope > .case-amount');
      const label=amount?.previousElementSibling;
      if(label?.tagName==='P')amount.after(label);
    }
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
  function prepare(main){
    if(!main)return false;
    if(main.dataset.blockVersion){if(main.dataset.blockVersion==='1'){layoutProfiles(main);enhanceAmounts(main)}return main.dataset.blockVersion==='1'}
    // Work on a clone. An unfamiliar layout keeps its complete original page.
    const work=main.cloneNode(true);
    const specs=work.querySelector('dl.specs');
    const heading=work.querySelector('h1');
    if(!specs||!heading)return false;
    const make=(type)=>{const el=main.ownerDocument.createElement('section');el.dataset.block=type;return el};
    const cover=make('cover'), profile=make('specs');
    for(const el of work.querySelectorAll(':scope > .breadcrumbs,:scope > .page-head,:scope > .hero'))cover.append(el);
    const overview=work.querySelector(':scope > .case-overview');
    if(overview){
      const media=overview.querySelector(':scope > figure,:scope > .case-placeholder');
      if(media)cover.append(media);
      profile.append(overview);
    }else{
      const details=specs.closest('.details');
      if(!details)return false;
      profile.append(details);
    }
    const blocks=[cover,profile];
    for(const el of [...work.children]){
      if(!el.textContent.trim()&&!el.querySelector('img,a'))continue;
      let type='story';
      if(el.matches('.case-bottom'))type='footer';
      else if(el.matches('.metrics'))type='metrics';
      else if(el.querySelector('.team'))type='team';
      else if(el.querySelector('time'))type='journal';
      else if(el.querySelector('img'))type='gallery';
      else if(el.querySelector('.features,.heping-highlights,.case-highlights'))type='features';
      const block=make(type);block.append(el);blocks.push(block);
    }
    main.replaceChildren(...blocks);
    main.dataset.blockVersion='1';
    layoutProfiles(main);
    enhanceAmounts(main);
    return true;
  }
  const templates={
    story:'<h2>段落標題</h2><p>段落內容</p>',
    features:'<h2>個案特色</h2><ul><li>特色說明</li></ul>',
    metrics:'<h2>重點數據</h2><div class="pb-items"><p data-metric-ref=""></p></div>',
    gallery:'<h2>圖片集</h2><div class="pb-items"><figure><img alt="個案照片"><figcaption>照片說明</figcaption></figure></div>',
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
  return {types,applies,prepare,newBlock,refresh,updateCard,formatCardFacts,appendProjectCardFacts};
})();
