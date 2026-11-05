// Versioned semantic HTML is both the block document and the deployable fallback.
window.ProjectBlocks = (() => {
  const types = {cover:'個案封面', specs:'基本資料表', metrics:'重點數據', story:'段落圖文', features:'個案特色', gallery:'圖片集', journal:'工程與活動紀錄', team:'參與團隊'};
  const files = new Set(['shidong','heping','project-xinguang-urban','project-wuxing',...Array.from({length:19},(_,i)=>'project-'+(i+2)).filter(name=>name!=='project-11')].map(name=>name+'.html'));
  const observedAmounts=new WeakSet();
  function applies(file){return files.has(file)||file.startsWith('project.html?case=')}
  function countAmount(amount){
    const view=amount.ownerDocument.defaultView;
    const original=amount.textContent.trim();
    const match=original.match(/^(\d[\d,]*(?:\.\d+)?)(.*)$/s);
    if(!match){amount.classList.add('amount-in-view');return}
    const target=Number(match[1].replaceAll(',',''));
    if(!Number.isFinite(target)||target<=0){amount.classList.add('amount-in-view');return}
    const decimals=(match[1].split('.')[1]||'').length;
    const suffix=match[2];
    const format=new Intl.NumberFormat('zh-TW',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
    const duration=1800;
    let start;
    amount.dataset.countValue=format.format(0)+suffix;
    amount.classList.add('is-counting','amount-in-view');
    const finish=()=>{amount.classList.remove('is-counting');delete amount.dataset.countValue};
    function frame(now){
      if(!amount.isConnected||!amount.classList.contains('is-counting'))return;
      start??=now;
      const progress=Math.min((now-start)/duration,1);
      const eased=1-Math.pow(1-progress,3);
      amount.dataset.countValue=format.format(target*eased)+suffix;
      if(progress<1)view.requestAnimationFrame(frame);
      else finish();
    }
    view.requestAnimationFrame(frame);
    view.setTimeout(finish,duration+250);
  }
  function revealAmounts(main){
    // The editor preview must keep the source number unchanged while saving drafts.
    if(!main.isConnected||main.ownerDocument.defaultView!==window)return;
    const amounts=main.querySelectorAll('[data-block="specs"] .case-amount');
    if(!amounts.length||main.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const Observer=main.ownerDocument.defaultView?.IntersectionObserver;
    if(!Observer)return;
    const observer=new Observer((entries)=>{
      for(const entry of entries)if(entry.isIntersecting){countAmount(entry.target);observer.unobserve(entry.target)}
    },{threshold:.45});
    amounts.forEach(amount=>{if(!observedAmounts.has(amount)){observedAmounts.add(amount);observer.observe(amount)}});
  }
  function prepare(main){
    if(!main)return false;
    if(main.dataset.blockVersion){if(main.dataset.blockVersion==='1')revealAmounts(main);return main.dataset.blockVersion==='1'}
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
    revealAmounts(main);
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
  return {types,applies,prepare,newBlock,refresh,updateCard};
})();
