import {bindBlocks} from './block-editor.js?v=12';
import {createFloatingEditor} from './floating-editor.js?v=19';
import {bindCompanyBlocks,isCompanyPage} from './company-blocks.js?v=1';
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {createImageEditor} from "./image-editor.js?v=7";

const cfg=window.YUANJIE_CONFIG;
const allowedEmails=new Set(["lijie5868@gmail.com","ru8ru8u8@gmail.com","lazyunclek@gmail.com"]);
const primaryPages=new Set(["home","about","team","urban","renewal","qa"]);
const basePath=location.pathname.replace(/admin\/?$/,'');
const supabase=createClient(cfg.supabaseUrl,cfg.publishableKey);
const recoveryUrl=new URL(location.href);
let settingPassword=recoveryUrl.searchParams.get('set-password')==='1'||new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
let currentSession=null;
let roleRequest=0;
let roleListLoaded=false;
const $=id=>document.getElementById(id);
let pages=[];
let publishedPages=new Map();
let navigation=[];
let current=null;
let publishedSnapshot=null;
let editorLoadToken=0;
let dashboardLoading=false;
let pageDirty=false;
let navigationDirty=false;
let activityLoaded=false;
let activityRecords=[];
let websiteVersions=[];
const logPageSize=20;
let adminActivityPage=1;
let websiteActivityPage=1;
const expandedPageGroups=new Set(['主要頁面']);
const imageEditor=createImageEditor({frame:$('visualEditor'),supabase,onChange:target=>{pageDirty=true;recordCaseCardPhoto(target)},onMessage:message});
const floatingEditor=createFloatingEditor({frame:$('visualEditor'),supabase,onChange:()=>{pageDirty=true},onMessage:message});
const pageLayout=document.querySelector('.pages-layout');
const pageResizer=$('pageResizer');
const sidebarToggle=$('sidebarToggle');
const sidebarWidthKey='yuanjie-admin-sidebar-width';
const sidebarCollapsedKey='yuanjie-admin-sidebar-collapsed';
let preferredSidebarWidth=250;
let resizePointer=null;
let sidebarCollapsed=false;

function applyCaseCardPhotoOverrides(main){
  for(const record of main.querySelectorAll('[data-card-photo-overrides] [data-href]')){
    const card=[...main.querySelectorAll('a.case-card')].find(item=>item.getAttribute('href')===record.dataset.href);
    if(!card||!record.dataset.src)continue;
    let img=card.querySelector('img');
    if(!img){
      const placeholder=card.querySelector('.case-placeholder');
      if(!placeholder)continue;
      img=main.ownerDocument.createElement('img');
      placeholder.replaceWith(img);
    }
    img.setAttribute('src',record.dataset.src);
    img.alt=record.dataset.alt||'';
    if(record.dataset.width)img.width=Number(record.dataset.width);
    if(record.dataset.height)img.height=Number(record.dataset.height);
  }
}

function recordCaseCardPhoto(img){
  if(!['urban.html','renewal.html'].includes(current?.file_name))return;
  const card=img?.closest('a.case-card');
  const main=card?.closest('main');
  const href=card?.getAttribute('href');
  if(!main||!href)return;
  let records=main.querySelector('[data-card-photo-overrides]');
  if(!records){
    records=main.ownerDocument.createElement('div');
    records.dataset.cardPhotoOverrides='';
    records.hidden=true;
    main.append(records);
  }
  let record=[...records.children].find(item=>item.dataset.href===href);
  if(!record){record=main.ownerDocument.createElement('span');record.dataset.href=href;records.append(record)}
  record.dataset.src=img.getAttribute('src');
  record.dataset.alt=img.alt;
  record.dataset.width=img.getAttribute('width')||'';
  record.dataset.height=img.getAttribute('height')||'';
}

try{
  const savedWidth=Number(localStorage.getItem(sidebarWidthKey));
  if(Number.isFinite(savedWidth)&&savedWidth>0)preferredSidebarWidth=savedWidth;
  sidebarCollapsed=localStorage.getItem(sidebarCollapsedKey)==='1';
}catch{}

function renderSidebarVisibility(){
  pageLayout.classList.toggle('sidebar-collapsed',sidebarCollapsed);
  $('pageSidebar').hidden=sidebarCollapsed;
  pageResizer.tabIndex=sidebarCollapsed?-1:0;
  sidebarToggle.setAttribute('aria-expanded',String(!sidebarCollapsed));
  const label=sidebarCollapsed?'展開頁面清單':'收起頁面清單';
  sidebarToggle.setAttribute('aria-label',label);
  sidebarToggle.title=label;
}
sidebarToggle.addEventListener('click',()=>{
  sidebarCollapsed=!sidebarCollapsed;
  renderSidebarVisibility();
  try{localStorage.setItem(sidebarCollapsedKey,sidebarCollapsed?'1':'0')}catch{}
});

function sidebarWidthLimits(){
  const available=pageLayout.getBoundingClientRect().width;
  return {min:220,max:Math.max(220,Math.min(600,Math.floor(available-16-16-420)))};
}

function renderSidebarWidth(){
  const {min,max}=sidebarWidthLimits();
  const width=Math.min(max,Math.max(min,Math.round(preferredSidebarWidth)));
  pageLayout.style.setProperty('--page-sidebar-width',`${width}px`);
  pageResizer.setAttribute('aria-valuemin',String(min));
  pageResizer.setAttribute('aria-valuemax',String(max));
  pageResizer.setAttribute('aria-valuenow',String(width));
  pageResizer.setAttribute('aria-valuetext',`左側清單寬度 ${width} 像素`);
  return width;
}

function saveSidebarWidth(){
  preferredSidebarWidth=renderSidebarWidth();
  try{localStorage.setItem(sidebarWidthKey,String(preferredSidebarWidth))}catch{}
}

pageResizer.addEventListener('pointerdown',event=>{
  if(event.button!==0||matchMedia('(max-width: 850px)').matches)return;
  resizePointer={id:event.pointerId,startX:event.clientX,startWidth:renderSidebarWidth()};
  pageResizer.setPointerCapture(event.pointerId);
  document.body.classList.add('resizing-pages');
  event.preventDefault();
});
pageResizer.addEventListener('pointermove',event=>{
  if(!resizePointer||event.pointerId!==resizePointer.id)return;
  preferredSidebarWidth=resizePointer.startWidth+event.clientX-resizePointer.startX;
  renderSidebarWidth();
});
function finishSidebarResize(event){
  if(!resizePointer||event.pointerId!==resizePointer.id)return;
  resizePointer=null;
  document.body.classList.remove('resizing-pages');
  if(pageResizer.hasPointerCapture(event.pointerId))pageResizer.releasePointerCapture(event.pointerId);
  saveSidebarWidth();
}
pageResizer.addEventListener('pointerup',finishSidebarResize);
pageResizer.addEventListener('pointercancel',finishSidebarResize);
pageResizer.addEventListener('lostpointercapture',finishSidebarResize);
pageResizer.addEventListener('keydown',event=>{
  const {min,max}=sidebarWidthLimits();
  const step=event.shiftKey?48:16;
  const width=renderSidebarWidth();
  if(event.key==='ArrowLeft')preferredSidebarWidth=width-step;
  else if(event.key==='ArrowRight')preferredSidebarWidth=width+step;
  else if(event.key==='Home')preferredSidebarWidth=min;
  else if(event.key==='End')preferredSidebarWidth=max;
  else return;
  event.preventDefault();
  saveSidebarWidth();
});
window.addEventListener('resize',renderSidebarWidth);
renderSidebarWidth();
renderSidebarVisibility();

function showMessage(target,text,error=false){
  $(target).textContent=text;
  $(target).classList.toggle('error',error);
}

function message(text,error=false){showMessage('appMessage',text,error)}
function navigationMessage(text,error=false){showMessage('navigationMessage',text,error)}
function activityMessage(text,error=false){showMessage('activityMessage',text,error)}

function samePageContent(left,right){
  return Boolean(left&&right&&left.title===right.title&&left.meta_description===right.meta_description&&left.main_html===right.main_html);
}

function newerThan(left,right){
  return Boolean(left&&(!right||new Date(left).getTime()>new Date(right).getTime()));
}

function snapshotPage(page){
  return page?{slug:page.slug,title:page.title,meta_description:page.meta_description,main_html:page.main_html,published_at:page.published_at}:null;
}

const isManagedProject=page=>Boolean(page?.file_name?.startsWith('project.html?case=')||/<main\b[^>]*data-project-category=/.test(page?.main_html||''));

function newProjectHtml({name,category,city,district,summary,layout=[]}){
  const main=document.createElement('main');
  main.dataset.projectCategory=category;
  main.dataset.projectCity=city;
  main.dataset.projectDistrict=district;
  main.innerHTML='<section class="page-head"><div class="crumb"><a href="index.html">首頁</a> ／ <a class="project-return" href="urban.html"></a> ／ <span class="project-name"></span></div><div class="eyebrow"></div><h1 class="page-title"></h1><p class="project-location"></p><p class="lead"></p></section><section class="wrap case-overview"><figure class="case-main"><img alt="建築規劃中" width="1200" height="900"><figcaption class="photo-note">建築規劃中</figcaption></figure><div><div class="eyebrow">PROJECT PROFILE / 個案資料</div><h2></h2><dl class="specs"><div><dt>所在地區</dt><dd></dd></div><div><dt>個案類型</dt><dd class="project-type"></dd></div><div><dt>建築規劃</dt><dd>請補充個案資料</dd></div></dl></div></section><section class="wrap case-bottom"><p class="note">個案資料依最新規劃內容更新，實際以核定圖說及相關文件為準。</p><a class="text-link project-return" href="urban.html"></a></section>';
  main.querySelector('.case-main img').setAttribute('src','assets/project-placeholder.svg');
  const type=category==='urban'?'進行個案（都更）':'在建工程（危老）';
  const destination=category==='urban'?'urban.html':'renewal.html';
  main.querySelectorAll('.project-return').forEach(link=>{link.href=destination;link.textContent=link.closest('.case-bottom')?`← 返回${type}`:type});
  main.querySelector('.project-name').textContent=name;
  main.querySelector('.page-head .eyebrow').textContent=category==='urban'?'PROJECT / URBAN RENEWAL':'PROJECT / RECONSTRUCTION';
  main.querySelector('.page-title').textContent=name;
  main.querySelector('.project-location').textContent=`${city}${district}`;
  main.querySelector('.lead').textContent=summary;
  main.querySelector('.case-overview h2').textContent=name;
  main.querySelector('.specs dd').textContent=`${city}${district}`;
  main.querySelector('.project-type').textContent=type;
  ProjectBlocks.prepare(main);
  for(const type of layout){
    main.insertBefore(ProjectBlocks.newBlock(document,type),main.querySelector('[data-block="footer"]'));
  }
  return main.outerHTML;
}

function newCompanyHtml(name,summary){
  const main=document.createElement('main');main.dataset.companyBlocks='1';
  main.innerHTML='<section class="page-head" data-company-block="intro"><div class="crumb"><a href="index.html">首頁</a> ／ <span></span></div><div class="eyebrow">COMPANY / PARTNER</div><h1 class="page-title"></h1><p class="lead"></p></section><section class="company-content-block" data-company-block="text"><div class="wrap"><div class="eyebrow">COMPANY / 公司介紹</div><h2>關於我們</h2><p class="copy"></p></div></section>';
  main.querySelector('.crumb span').textContent=name;
  main.querySelector('h1').textContent=name;
  main.querySelectorAll('.lead,.copy').forEach(node=>node.textContent=summary);
  return main.outerHTML;
}

function managedProjectCard(project,category){
  if(!isManagedProject(project))return null;
  const main=new DOMParser().parseFromString(project.main_html,'text/html').querySelector('main');
  if(main?.dataset.projectCategory!==category)return null;
  const title=main.querySelector('.page-title')?.textContent?.trim()||project.title;
  const card=document.createElement('a');
  card.className='case-card';
  card.dataset.managedCard='';
  card.contentEditable='false';
  card.title='此卡片請到對應的個案頁面編輯';
  card.dataset.city=main.dataset.projectCity||'';
  card.dataset.district=main.dataset.projectDistrict||'';
  card.href=ProjectBlocks.canonicalProjectFile(project.file_name);
  const image=document.createElement('img');
  image.src=main.querySelector('.case-main img')?.getAttribute('src')||'assets/project-placeholder.svg';
  image.alt=`${title}圖片`;
  const copy=document.createElement('div');
  copy.className='case-card-copy';
  const eyebrow=document.createElement('div');
  eyebrow.className='eyebrow';
  eyebrow.textContent=category==='urban'?'都市更新':'危老重建';
  const heading=document.createElement('h2');heading.textContent=title;
  const location=document.createElement('p');location.className='project-location';location.textContent=`${card.dataset.city}${card.dataset.district}`;
  const summary=document.createElement('p');summary.className='case-card-note';summary.textContent=main.querySelector('.page-head .lead')?.textContent?.trim()||'';
  copy.append(eyebrow,heading,location,summary);
  ProjectBlocks.appendProjectCardFacts(copy,main);
  card.append(image,copy);
  return card;
}

async function editorDocument(page,html){
  let bodyId='';
  let bodyClass='';
  let stylesheet=`${basePath}style.css`;
  let previewScripts='';
  let previewHeader='';
  try{
    const templateFile=isManagedProject(page)?'project.html':/^company-\d+\.html$/.test(page.file_name)?'chengyu.html':ProjectBlocks.canonicalProjectFile(page.file_name).split('?')[0];
    const response=await fetch(`${basePath}${templateFile}?admin-preview=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw new Error(`無法載入頁面樣板：${response.status}`);
    const template=new DOMParser().parseFromString(await response.text(),'text/html');
    bodyId=template.body.id;
    bodyClass=template.body.className;
    stylesheet=template.querySelector('link[rel="stylesheet"]')?.getAttribute('href')||stylesheet;
    previewHeader=template.body.querySelector(':scope > header')?.outerHTML||'';
    if(page.file_name==='index.html'){
      const previewMain=new DOMParser().parseFromString(html,'text/html').querySelector('main');
      for(const portal of previewMain?.querySelectorAll('.home-project-category .portal')||[]){
        if(portal.querySelector(':scope > .category-copy'))continue;
        const image=portal.querySelector(':scope > img');
        if(!image)continue;
        const copy=document.createElement('div');copy.className='category-copy';
        while(image.nextSibling)copy.append(image.nextSibling);
        portal.append(copy);
      }
      if(previewMain)html=previewMain.outerHTML;
    }
    if(page.file_name==='urban.html'||page.file_name==='renewal.html'){
      const previewMain=new DOMParser().parseFromString(html,'text/html').querySelector('main');
      if(previewMain)ProjectBlocks.canonicalizeProjectLinks(previewMain);
      const grid=previewMain?.querySelector('.case-grid');
      const category=page.file_name==='urban.html'?'urban':'renewal';
      if(grid){
        const projects=publishedProjectsForCategory(category);
        for(const project of projects){
          const existing=[...grid.querySelectorAll('.case-card')].find(a=>a.getAttribute('href')===ProjectBlocks.canonicalProjectFile(project.file_name));
          if(existing){
            if(project.main_html.includes('data-block-version')){
              existing.dataset.originalCard=existing.outerHTML;
              ProjectBlocks.updateCard(existing,project.main_html);
            }
            continue;
          }
          const card=managedProjectCard(project,category);
          if(card)grid.append(card);
        }
        const order=new Map(projects.map((project,index)=>[ProjectBlocks.canonicalProjectFile(project.file_name),index]));
        [...grid.querySelectorAll(':scope > a.case-card')].sort((a,b)=>(order.get(a.getAttribute('href'))??Number.MAX_SAFE_INTEGER)-(order.get(b.getAttribute('href'))??Number.MAX_SAFE_INTEGER)).forEach(card=>grid.append(card));
        applyCaseCardPhotoOverrides(previewMain);
        ProjectBlocks.formatCardFacts(previewMain);
        html=previewMain.outerHTML;
      }
    }
    previewScripts=[...template.querySelectorAll('script[src]')]
      .map(script=>script.getAttribute('src'))
      .filter(src=>src&&(src.split(/[?#]/)[0].endsWith('/about-layout.js')||src.split(/[?#]/)[0]==='about-layout.js'))
      .map(src=>`<script src="${src}" defer></script>`).join('');
    if(page.file_name==='urban.html'||page.file_name==='renewal.html'){
      const layoutScript=[...template.querySelectorAll('script[data-site-init]')]
        .find(script=>script.textContent.includes("document.querySelector('.case-grid')"));
      if(layoutScript)previewScripts+=`<script>${layoutScript.textContent}</script>`;
    }
    previewScripts+='<script src="link-motion.js?v=3" defer></script>';
  }catch(error){
    console.warn('Using the basic editor preview.',error);
  }
  const attributes=`${bodyId?` id="${bodyId}"`:''}${bodyClass?` class="${bodyClass}"`:''}`;
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${location.origin}${basePath}"><link rel="stylesheet" href="${stylesheet}"><link rel="stylesheet" href="project-blocks.css?v=19"><link rel="stylesheet" href="company-blocks.css?v=1"><link rel="stylesheet" href="media-embed.css?v=1"><style>body{margin:0}main{min-height:100vh}main[contenteditable="true"]:focus{outline:none}a{pointer-events:none}img[data-admin-selected]{outline:3px solid #a47c48;outline-offset:3px}.case-card{position:relative}.case-card .project-location .case-card-inline-note{position:static!important;display:block!important;width:auto!important;height:auto!important;min-height:0!important;padding:4px!important;border:0!important;border-radius:0!important;background:none!important;color:#687a84!important;font-size:12px!important;cursor:text!important}.case-card .project-location .case-card-inline-note::before{display:none!important}.case-card img{pointer-events:auto;cursor:pointer}.case-card [data-admin-card-upload],[data-block="cover"] figure.case-main [data-admin-card-upload]{position:absolute;z-index:3;right:12px;top:12px;padding:9px 14px;border:0;border-radius:999px;background:#fff;color:#25333a;box-shadow:0 4px 14px #0003;font:inherit;font-size:13px;font-weight:600;line-height:1.3;cursor:pointer;pointer-events:auto}[data-block="cover"] figure.case-main{position:relative}@media(max-width:600px){[data-block="cover"] figure.case-main [data-admin-card-upload]{right:8px;top:8px}}</style></head><body${attributes}>${previewHeader}${html}${previewScripts}</body></html>`;
}

function publishedProjectsForCategory(category){
  return [...publishedPages.values()].filter(project=>{
    const main=new DOMParser().parseFromString(project.main_html||'','text/html').querySelector('main');
    return main?.dataset.projectCategory||main?.querySelector('a[href="renewal.html"],a.project-return[href="renewal.html"],a[href="urban.html"],a.project-return[href="urban.html"]')||/^project(?:-|\.html)/.test(project.file_name||'');
  }).filter(project=>pageProjectCategory(project)===category).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));
}

async function loadEditor(page){
  if(pageDirty&&!confirm('目前頁面有尚未儲存的修改。要放棄修改並切換頁面嗎？'))return;
  activeCaseListPreview=null;
  $('pageEditor').classList.remove('case-list-preview-active');
  $('caseListPreviewView').hidden=true;
  const loadToken=++editorLoadToken;
  current=page;
  pageDirty=false;
  const published=publishedPages.get(page.slug)||null;
  const staleDraft=Boolean(published&&!samePageContent(page,published)&&newerThan(published.published_at,page.updated_at));
  const source=staleDraft?published:page;
  publishedSnapshot=snapshotPage(published);
  $('title').value=source.title;
  $('description').value=source.meta_description;
  $('projectFields').hidden=!isManagedProject(page);
  $('qaTools').hidden=page.file_name!=='qa.html';
  if(isManagedProject(page)){
    const projectMain=new DOMParser().parseFromString(source.main_html,'text/html').querySelector('main');
    $('projectCategory').value=projectMain?.dataset.projectCategory||'urban';
    $('projectCity').value=projectMain?.dataset.projectCity||'';
    $('projectDistrict').value=projectMain?.dataset.projectDistrict||'';
  }
  $('visitPage').href=`${basePath}${ProjectBlocks.canonicalProjectFile(page.file_name)}`;
  const frame=$('visualEditor');
  $('previewSize').textContent=frame.style.maxWidth?'桌面預覽':'手機預覽';
  $('publish').disabled=true;
  $('contentSafetyStatus').classList.toggle('warning',staleDraft);
  $('contentSafetyStatus').textContent=staleDraft
    ?'正式網站版本比後台草稿新，已自動載入正式版本，避免舊草稿覆蓋。'
    :'預覽已套用正式頁面的版型；發布前會再次檢查版本，避免覆蓋其他人的更新。';
  $('blockPanel').hidden=true;
  const previewDocument=await editorDocument(page,source.main_html);
  if(loadToken!==editorLoadToken)return;
  frame.onload=()=>{
    const main=frame.contentDocument.querySelector('main');
    if(main && ProjectBlocks.applies(page.file_name) && ProjectBlocks.prepare(main)){
      bindBlocks(main,$('blockPanel'),()=>{pageDirty=true});
    }else if(main && isCompanyPage(page)){
      bindCompanyBlocks(main,$('blockPanel'),()=>{pageDirty=true});
    }else if(main)main.contentEditable='true';
    imageEditor.bindFrame();
    floatingEditor.bindFrame();
    frame.contentDocument.addEventListener('click',event=>{
      if(main?.dataset.blockVersion && event.target.closest('button,a'))event.preventDefault();
    });
    frame.contentDocument.addEventListener('input',()=>{pageDirty=true});
    $('publish').disabled=false;
  };
  frame.srcdoc=previewDocument;
  document.querySelectorAll('#pageList button[data-slug]').forEach(button=>{
    button.classList.toggle('active',button.dataset.slug===page.slug);
  });
  $('savedAt').textContent=page.updated_at?`上次儲存：${new Date(page.updated_at).toLocaleString('zh-TW')}`:'';
  message(staleDraft?'已保護此頁：目前編輯的是正式網站最新版，舊草稿不會直接覆蓋它。':'');
}

function mainHtml(){
  const main=$('visualEditor').contentDocument.querySelector('main');
  if(!main)throw new Error('頁面內容缺少 main 區塊，請重新載入後再試。');
  if((current?.file_name==='urban.html'||current?.file_name==='renewal.html')&&!main.querySelector('.project-filter'))
    throw new Error('新版建案篩選版型未載入，已停止儲存與發布；請重新整理後台。');
  if(current?.file_name==='index.html'&&main.querySelector('.home-project-category .portal')&&!main.querySelector('.home-project-category .category-copy'))
    throw new Error('新版首頁建案版型未載入，已停止儲存與發布；請重新整理後台。');
  if(ProjectBlocks.applies(current.file_name) && main.dataset.blockVersion!=='1')
    throw new Error('個案結構需要人工檢查，已保留原稿。');
  if(isCompanyPage(current) && main.dataset.companyBlocks!=='1')
    throw new Error('公司頁面區塊尚未載入，已保留原稿。');
  const copy=main.cloneNode(true);
  copy.removeAttribute('contenteditable');
  copy.querySelectorAll('[data-editor-ui]').forEach(node=>node.remove());
  copy.querySelectorAll('[data-admin-card-upload]').forEach(node=>node.remove());
  if(copy.dataset.blockVersion||copy.dataset.companyBlocks){
    for(const node of copy.querySelectorAll('[contenteditable],[data-selected-block],[data-drop]')){
      for(const attr of ['contenteditable','data-selected-block','data-drop'])node.removeAttribute(attr);
    }
  }
  copy.querySelectorAll('[data-original-card]').forEach(card=>card.outerHTML=card.dataset.originalCard);
  copy.querySelectorAll('[data-managed-card]').forEach(card=>card.remove());
  applyCaseCardPhotoOverrides(copy);
  ProjectBlocks.canonicalizeProjectLinks(copy);
  if(['urban.html','renewal.html'].includes(current?.file_name))ProjectBlocks.formatCardFacts(copy);
  if(isManagedProject(current)){
    const category=$('projectCategory').value;
    const city=$('projectCity').value.trim();
    const district=$('projectDistrict').value.trim();
    if(!city||!district)throw new Error('請填寫個案的縣市與行政區。');
    copy.dataset.projectCategory=category;
    copy.dataset.projectCity=city;
    copy.dataset.projectDistrict=district;
    const type=category==='urban'?'進行個案（都更）':'在建工程（危老）';
    const destination=category==='urban'?'urban.html':'renewal.html';
    ProjectBlocks.formatProjectLocation(copy,city,district);
    const locationRow=[...copy.querySelectorAll('.specs div')].find(row=>row.querySelector('dt')?.textContent==='所在地區');
    if(locationRow)locationRow.querySelector('dd').textContent=`${city}${district}`;
    const typeRow=[...copy.querySelectorAll('.specs div')].find(row=>row.querySelector('dt')?.textContent==='個案類型');
    if(typeRow)typeRow.querySelector('dd').textContent=type;
    copy.querySelectorAll('.project-return').forEach(link=>{link.href=destination;link.textContent=link.closest('.case-bottom')?`← 返回${type}`:type});
  }
  copy.querySelectorAll('a.link-motion').forEach(link=>{
    link.textContent=link.querySelector('.link-motion-text')?.textContent||link.textContent;
    link.classList.remove('link-motion','link-motion-back');
    if(link.classList.contains('team-section-link'))link.classList.remove('text-link');
    link.removeAttribute('aria-label');
  });
  copy.querySelectorAll('[data-admin-selected]').forEach(image=>image.removeAttribute('data-admin-selected'));
  copy.querySelectorAll('.case-card[hidden]').forEach(card=>card.removeAttribute('hidden'));
  copy.querySelectorAll('.project-filter button').forEach(button=>{
    const active=button.dataset.filterType==='all';
    button.classList.toggle('is-active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  const filterStatus=copy.querySelector('.project-filter-status');
  if(filterStatus)filterStatus.textContent=`顯示全部 ${copy.querySelectorAll('.case-card').length} 件建案`;
  return copy.outerHTML;
}

function pageButton(page,caseOrder=[]){
  const button=document.createElement('button');
  button.type='button';
  button.dataset.slug=page.slug;
  button.innerHTML='<span class="case-page-order"></span><strong></strong><small></small>';
  button.querySelector('strong').textContent=page.title;
  button.querySelector('small').textContent=ProjectBlocks.canonicalProjectFile(page.file_name);
  if(!primaryPages.has(page.slug)&&!isCompanyPage(page)){
    button.classList.add('case-page-item');
    button.dataset.caseCategory=pageProjectCategory(page);
    button.draggable=true;
    const position=caseOrder.findIndex(item=>item.slug===page.slug)+1;
    const order=button.querySelector('.case-page-order');
    order.textContent=`#${position}`;order.setAttribute('aria-label',`排序第 ${position} 位`);order.title=`${button.dataset.caseCategory==='urban'?'都更':'危老'}個案排序第 ${position} 位`;
  }
  button.onclick=()=>loadEditor(page).catch(error=>message(error.message,true));
  return button;
}

let draggedCasePage=null;
let suppressCasePageClick=false;
const projectList=$('pageList');
projectList.addEventListener('click',event=>{
  if(!suppressCasePageClick)return;
  event.preventDefault();event.stopImmediatePropagation();suppressCasePageClick=false;
},true);
projectList.addEventListener('dragstart',event=>{
  const item=event.target.closest('.case-page-item');
  if(!item)return;
  draggedCasePage=item;item.classList.add('is-dragging');
  event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',item.dataset.slug);
});
projectList.addEventListener('dragover',event=>{
  const target=event.target.closest('.case-page-item');
  if(!draggedCasePage||!target||target===draggedCasePage||target.dataset.caseCategory!==draggedCasePage.dataset.caseCategory)return;
  event.preventDefault();event.dataTransfer.dropEffect='move';
  projectList.querySelectorAll('.case-page-item.is-drop-target').forEach(item=>item.classList.remove('is-drop-target'));
  target.classList.add('is-drop-target');
});
projectList.addEventListener('drop',event=>{
  const target=event.target.closest('.case-page-item');
  if(!draggedCasePage||!target||target===draggedCasePage||target.dataset.caseCategory!==draggedCasePage.dataset.caseCategory)return;
  event.preventDefault();
  const category=draggedCasePage.dataset.caseCategory;
  const ordered=[...projectList.querySelectorAll(`.case-page-item[data-case-category="${category}"]`)].map(item=>pages.find(page=>page.slug===item.dataset.slug)).filter(Boolean);
  const from=ordered.findIndex(page=>page.slug===draggedCasePage.dataset.slug),to=ordered.findIndex(page=>page.slug===target.dataset.slug);
  if(from<0||to<0)return;
  ordered.splice(to,0,ordered.splice(from,1)[0]);
  suppressCasePageClick=true;setTimeout(()=>{suppressCasePageClick=false},350);
  persistCaseOrder(category,ordered).catch(error=>message(error.message,true));
});
projectList.addEventListener('dragend',()=>{
  projectList.querySelectorAll('.case-page-item.is-dragging,.case-page-item.is-drop-target').forEach(item=>item.classList.remove('is-dragging','is-drop-target'));
  draggedCasePage=null;
});

async function persistCaseOrder(category,ordered){
  if(!ordered.length)return;
  const prior=ordered.map(page=>({page,sort_order:page.sort_order}));
  const start=category==='renewal'?2000:1000;
  const updates=ordered.map((page,index)=>({page,sort_order:start+(index+1)*10}));
  try{
    const drafts=await Promise.all(updates.map(({page,sort_order})=>supabase.from('cms_pages').update({sort_order}).eq('id',page.id)));
    const draftError=drafts.find(result=>result.error)?.error;if(draftError)throw draftError;
    const publishedUpdates=await Promise.all(updates.filter(({page})=>publishedPages.has(page.slug)).map(({page,sort_order})=>supabase.from('published_pages').update({sort_order}).eq('slug',page.slug)));
    const publishedError=publishedUpdates.find(result=>result.error)?.error;if(publishedError)throw publishedError;
    updates.forEach(({page,sort_order})=>{page.sort_order=sort_order;const published=publishedPages.get(page.slug);if(published)published.sort_order=sort_order});
    pages.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    renderPageList($('pageSearch').value);
    await refreshCaseListPreview(category);
    message('個案順序已儲存，前台列表將依新順序顯示。');
  }catch(error){
    await Promise.all(prior.map(({page,sort_order})=>supabase.from('cms_pages').update({sort_order}).eq('id',page.id)));
    await Promise.all(prior.filter(({page})=>publishedPages.has(page.slug)).map(({page,sort_order})=>supabase.from('published_pages').update({sort_order}).eq('slug',page.slug)));
    throw new Error(`排序未儲存：${error.message||error}`);
  }
}

function pageProjectCategory(page){
  const main=new DOMParser().parseFromString(page.main_html||'','text/html').querySelector('main');
  if(main?.dataset.projectCategory)return main.dataset.projectCategory;
  if(main?.querySelector('a[href="renewal.html"],a.project-return[href="renewal.html"]'))return 'renewal';
  if(main?.querySelector('a[href="urban.html"],a.project-return[href="urban.html"]'))return 'urban';
  const text=`${page.title||''} ${main?.querySelector('.eyebrow')?.textContent||''}`;
  return /危老|RECONSTRUCTION/i.test(text)?'renewal':'urban';
}

function orderedCasePages(category,items=pages){
  return items.filter(item=>!primaryPages.has(item.slug)&&!isCompanyPage(item)&&pageProjectCategory(item)===category).slice().sort((a,b)=>{
    const publishedA=publishedPages.get(a.slug),publishedB=publishedPages.get(b.slug);
    if(publishedA&&publishedB)return (publishedA.sort_order??a.sort_order??0)-(publishedB.sort_order??b.sort_order??0);
    if(publishedA)return -1;
    if(publishedB)return 1;
    return (a.sort_order??0)-(b.sort_order??0);
  });
}

function appendProjectSubgroup(group,label,items,category){
  if(!items.length)return;
  const categoryOrder=orderedCasePages(category);
  const visibleSlugs=new Set(items.map(item=>item.slug));
  const ordered=categoryOrder.filter(item=>visibleSlugs.has(item.slug));
  const section=document.createElement('section');section.className='page-project-subgroup';
  const heading=document.createElement('h3');
  const title=document.createElement('span');title.className='page-project-subgroup-title';title.textContent=label;
  const tools=document.createElement('span');tools.className='page-project-subgroup-tools';
  const count=document.createElement('span');count.className='page-project-subgroup-count';count.textContent=ordered.length;count.setAttribute('aria-label',`${ordered.length} 件`);
  const preview=document.createElement('button');preview.type='button';preview.className='case-list-preview';preview.textContent='後台預覽';preview.title=`在後台預覽${label}前台列表`;
  preview.addEventListener('click',()=>openCaseListPreview(category));
  tools.append(count,preview);heading.append(title,tools);
  section.append(heading,...ordered.map(page=>pageButton(page,categoryOrder)));group.append(section);
}

let activeCaseListPreview=null;
async function openCaseListPreview(category){
  const fileName=category==='urban'?'urban.html':'renewal.html';
  const page=publishedPages.get(category)||pages.find(item=>item.file_name===fileName);
  if(!page){message(`找不到${category==='urban'?'都更':'危老'}列表頁。`,true);return}
  activeCaseListPreview=category;
  $('caseListPreviewTitle').textContent=`${category==='urban'?'進行個案（都更）':'在建工程（危老）'}｜前台預覽`;
  $('caseListPreviewView').hidden=false;
  $('pageEditor').classList.add('case-list-preview-active');
  $('caseListPreviewFrame').style.maxWidth='';
  $('previewSize').textContent='手機預覽';
  try{$('caseListPreviewFrame').srcdoc=await editorDocument(page,page.main_html)}
  catch(error){message(`無法載入前台列表預覽：${error.message||error}`,true)}
}
async function refreshCaseListPreview(category){
  if(activeCaseListPreview!==category)return;
  const page=publishedPages.get(category)||pages.find(item=>item.file_name===(category==='urban'?'urban.html':'renewal.html'));
  if(page)$('caseListPreviewFrame').srcdoc=await editorDocument(page,page.main_html);
}
function closeCaseListPreview(){
  activeCaseListPreview=null;
  $('caseListPreviewView').hidden=true;
  $('pageEditor').classList.remove('case-list-preview-active');
  $('previewSize').textContent=$('visualEditor').style.maxWidth?'桌面預覽':'手機預覽';
}
$('closeCaseListPreview').addEventListener('click',closeCaseListPreview);
$('previewSize').addEventListener('click',()=>{
  const frame=activeCaseListPreview?$('caseListPreviewFrame'):$('visualEditor');
  frame.style.maxWidth=frame.style.maxWidth?'':'390px';
  $('previewSize').textContent=frame.style.maxWidth?'桌面預覽':'手機預覽';
});

function renderPageList(filter=''){
  const list=$('pageList');
  const sidebar=$('pageSidebar');
  const sidebarScrollTop=sidebar.scrollTop;
  const listScrollTop=list.scrollTop;
  const documentScrollTop=window.scrollY;
  const focusedSlug=document.activeElement?.closest?.('#pageList button[data-slug]')?.dataset.slug||'';
  const newProjectButton=$('newProject'),newCompanyButton=$('newCompanyPage');
  const query=filter.trim().toLocaleLowerCase('zh-Hant');
  const matches=pages.filter(page=>`${page.title} ${page.file_name} ${ProjectBlocks.canonicalProjectFile(page.file_name)}`.toLocaleLowerCase('zh-Hant').includes(query));
  list.replaceChildren();
  const isCompanyDetail=isCompanyPage;
  for(const [heading,predicate] of [["主要頁面",page=>primaryPages.has(page.slug)],["公司詳情頁",isCompanyDetail],["個案頁面",page=>!primaryPages.has(page.slug)&&!isCompanyDetail(page)]]){
    const grouped=matches.filter(predicate);
    if(!grouped.length&&heading==='主要頁面')continue;
    const group=document.createElement('details');
    group.className='page-group';
    group.open=Boolean(query)||expandedPageGroups.has(heading);
    const title=document.createElement('summary');
    title.textContent=heading;
    group.addEventListener('toggle',()=>{
      if(query)return;
      if(group.open)expandedPageGroups.add(heading);
      else expandedPageGroups.delete(heading);
    });
    group.append(title);
    if(heading==='個案頁面'){
      title.textContent=`個案頁面（${grouped.length}）`;
      group.append(newProjectButton);
      appendProjectSubgroup(group,'都更個案',grouped.filter(page=>pageProjectCategory(page)==='urban'),'urban');
      appendProjectSubgroup(group,'危老個案',grouped.filter(page=>pageProjectCategory(page)==='renewal'),'renewal');
    }else if(heading==='公司詳情頁'){
      title.textContent=`公司詳情頁（${grouped.length}）`;
      group.append(newCompanyButton,...grouped.map(pageButton));
    }else group.append(...grouped.map(pageButton));
    list.append(group);
  }
  if(!matches.length){
    const empty=document.createElement('p');
    empty.className='empty-state';
    empty.textContent='找不到符合的頁面。';
    list.append(empty);
  }
  if(current)document.querySelector(`#pageList button[data-slug="${CSS.escape(current.slug)}"]`)?.classList.add('active');
  requestAnimationFrame(()=>{
    if(!sidebar.isConnected)return;
    sidebar.scrollTop=sidebarScrollTop;
    list.scrollTop=listScrollTop;
    window.scrollTo(0,documentScrollTop);
    if(focusedSlug)list.querySelector(`button[data-slug="${CSS.escape(focusedSlug)}"]`)?.focus({preventScroll:true});
  });
}

async function fetchPages(){
  const [draftResult,publishedResult]=await Promise.all([
    supabase.from('cms_pages').select('*').order('sort_order'),
    supabase.from('published_pages').select('slug,file_name,title,meta_description,main_html,published_at,sort_order')
  ]);
  if(draftResult.error)throw draftResult.error;
  if(publishedResult.error)throw publishedResult.error;
  pages=draftResult.data;
  publishedPages=new Map((publishedResult.data||[]).map(page=>[page.slug,page]));
  renderPageList();
  if(pages.length)await loadEditor(pages[0]);
}

function navigationRow(item){
  const row=document.createElement('article');
  row.className='navigation-row';
  row.dataset.key=item.nav_key;
  row.innerHTML=`
    <div class="order-controls"><button type="button" class="drag-handle" title="拖曳調整位置" aria-label="拖曳調整位置">⠿</button><button type="button" class="order-button move-up" aria-label="向前移動">↑</button><button type="button" class="order-button move-down" aria-label="向後移動">↓</button></div>
    <label><span>選單名稱</span><input data-field="label"></label>
    <label><span>第二行副標</span><input data-field="subtitle"></label>
    <div class="destination"><span>連結頁面</span><strong></strong><small></small></div>
    <label class="visibility"><input data-field="is_visible" type="checkbox"><span>顯示</span></label>`;
  row.querySelector('[data-field="label"]').value=item.label;
  row.querySelector('[data-field="subtitle"]').value=item.subtitle||'';
  row.querySelector('[data-field="is_visible"]').checked=item.is_visible;
  const matchingPage=pages.find(page=>page.file_name===item.href);
  row.querySelector('.destination strong').textContent=matchingPage?.title||item.nav_key;
  row.querySelector('.destination small').textContent=item.href;
  return row;
}

function renderNavigation(){
  $('navigationList').replaceChildren(...navigation.sort((a,b)=>a.nav_order-b.nav_order).map(navigationRow));
  updateNavigationOrderControls();
}

function navigationRows(){return [...document.querySelectorAll('.navigation-row')]}

function updateNavigationOrderControls(){
  const rows=navigationRows();
  rows.forEach((row,index)=>{
    row.querySelector('.move-up').disabled=index===0;
    row.querySelector('.move-down').disabled=index===rows.length-1;
  });
}

function moveNavigationRow(row,direction){
  const sibling=direction<0?row.previousElementSibling:row.nextElementSibling;
  if(!sibling)return;
  if(direction<0)sibling.before(row);
  else sibling.after(row);
  navigationDirty=true;
  updateNavigationOrderControls();
  row.querySelector('.drag-handle').focus();
}

async function fetchNavigation(){
  const {data,error}=await supabase.from('cms_navigation').select('*').order('nav_order');
  if(error)throw error;
  navigation=data;
  renderNavigation();
}

function navigationPayload(){
  return navigationRows().map((row,index)=>{
    const original=navigation.find(item=>item.nav_key===row.dataset.key);
    const label=row.querySelector('[data-field="label"]').value.trim();
    if(!label)throw new Error('選單名稱不能留空。');
    return {
      nav_key:original.nav_key,
      label,
      subtitle:row.querySelector('[data-field="subtitle"]').value.trim(),
      href:original.href,
      nav_order:(index+1)*10,
      is_visible:row.querySelector('[data-field="is_visible"]').checked,
      updated_at:new Date().toISOString()
    };
  });
}

async function saveNavigationDraft(){
  const rows=navigationPayload();
  const {data,error}=await supabase.from('cms_navigation').upsert(rows,{onConflict:'nav_key'}).select();
  if(error)throw error;
  navigation=data;
  renderNavigation();
  navigationDirty=false;
  activityLoaded=false;
  navigationMessage('選單草稿已儲存，正式網站尚未變更。');
}

async function publishNavigation(){
  await saveNavigationDraft();
  const publishedAt=new Date().toISOString();
  const rows=navigation.map(({nav_key,label,subtitle,href,nav_order,is_visible})=>({nav_key,label,subtitle,href,nav_order,is_visible,published_at:publishedAt}));
  const {error}=await supabase.from('published_navigation').upsert(rows,{onConflict:'nav_key'});
  if(error)throw error;
  activityLoaded=false;
  navigationMessage('選單已發布。重新整理正式網站即可看到更新。');
}

const activityActionLabels={
  page_draft_saved:'儲存頁面草稿',
  page_published:'發布頁面',
  navigation_draft_saved:'儲存導覽草稿',
  navigation_published:'發布導覽選單'
};
const activityFieldLabels={
  title:'頁面標題',
  meta_description:'搜尋摘要',
  main_html:'頁面內容',
  label:'選單名稱',
  subtitle:'第二行副標',
  nav_order:'排列位置',
  is_visible:'顯示狀態',
  href:'連結頁面',
  file_name:'頁面檔名',
  sort_order:'頁面排序'
};

function formatLogTime(value){
  return new Intl.DateTimeFormat('zh-TW',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
}

function monthKey(value){
  const date=new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}

function monthLabel(value){
  const [year,month]=value.split('-');
  return `${year} 年 ${Number(month)} 月`;
}

function populateMonthFilter(selectId,records,dateField){
  const select=$(selectId);
  const previous=select.value;
  const months=[...new Set(records.map(record=>monthKey(record[dateField])))].sort().reverse();
  const options=[new Option('全部月份',''),...months.map(month=>new Option(monthLabel(month),month))];
  select.replaceChildren(...options);
  if(months.includes(previous))select.value=previous;
}

function groupedActivityRecords(records){
  const groups=new Map();
  records.forEach(record=>{
    const key=`${record.transaction_id}:${record.action}`;
    if(!groups.has(key))groups.set(key,{...record,targets:[],fields:new Set(),recordIds:[]});
    const group=groups.get(key);
    group.recordIds.push(record.id);
    if(record.entity_label&&!group.targets.includes(record.entity_label))group.targets.push(record.entity_label);
    (record.changed_fields||[]).forEach(field=>group.fields.add(field));
  });
  return [...groups.values()];
}

function compactLogText(value,limit=80){
  const text=String(value??'').replace(/\s+/g,' ').trim();
  return text.length>limit?`${text.slice(0,limit)}…`:text||'（空白）';
}

function changedText(before,after){
  let start=0;
  while(start<before.length&&start<after.length&&before[start]===after[start])start++;
  let endBefore=before.length,endAfter=after.length;
  while(endBefore>start&&endAfter>start&&before[endBefore-1]===after[endAfter-1]){endBefore--;endAfter--}
  return `「${compactLogText(before.slice(start,endBefore))}」→「${compactLogText(after.slice(start,endAfter))}」`;
}

function describeActivityRecord(record){
  const before=record.before_data||{},after=record.after_data||{};
  const details=[];
  for(const field of record.changed_fields||[]){
    if(field==='main_html'){
      const oldDoc=new DOMParser().parseFromString(before.main_html||'','text/html');
      const newDoc=new DOMParser().parseFromString(after.main_html||'','text/html');
      const oldText=oldDoc.body.textContent.replace(/\s+/g,' ').trim();
      const newText=newDoc.body.textContent.replace(/\s+/g,' ').trim();
      if(oldText!==newText)details.push(`頁面文字：${changedText(oldText,newText)}`);
      const oldImages=[...oldDoc.images].map(image=>image.getAttribute('src'));
      const newImages=[...newDoc.images].map(image=>image.getAttribute('src'));
      if(JSON.stringify(oldImages)!==JSON.stringify(newImages))details.push(`圖片：${oldImages.length} 張 → ${newImages.length} 張（含更換）`);
      if(oldText===newText&&JSON.stringify(oldImages)===JSON.stringify(newImages))details.push('頁面版面或格式已調整，文字與圖片未變');
    }else if(['title','meta_description','label','subtitle','href','file_name','nav_order','is_visible'].includes(field)){
      details.push(`${activityFieldLabels[field]||field}：${changedText(String(before[field]??''),String(after[field]??''))}`);
    }
  }
  return details;
}

async function loadActivityDetails(groups){
  const ids=groups.flatMap(group=>group.recordIds);
  if(!ids.length)return;
  const {data,error}=await supabase.from('admin_activity_log').select('id,changed_fields,before_data,after_data').in('id',ids);
  if(error)return;
  const byId=new Map((data||[]).map(record=>[record.id,record]));
  for(const group of groups){
    const target=document.querySelector(`[data-activity-detail="${group.id}"]`);
    if(!target)return;
    const details=group.recordIds.flatMap(id=>describeActivityRecord(byId.get(id)||{changed_fields:[]}));
    target.replaceChildren(...(details.length?details:['這次操作未變更可見文字或圖片。']).map(detail=>{
      const line=document.createElement('span');line.textContent=detail;return line;
    }));
  }
}

function renderPagination(containerId,currentPage,totalItems,onSelect){
  const container=$(containerId);
  const totalPages=Math.max(1,Math.ceil(totalItems/logPageSize));
  container.replaceChildren();
  container.hidden=totalItems<=logPageSize;
  if(container.hidden)return;
  const button=(label,page,options={})=>{
    const item=document.createElement('button');
    item.type='button';
    item.textContent=label;
    item.disabled=Boolean(options.disabled);
    if(options.current){
      item.className='current';
      item.setAttribute('aria-current','page');
    }
    item.setAttribute('aria-label',options.label||`第 ${page} 頁`);
    item.onclick=()=>onSelect(page);
    return item;
  };
  container.append(button('上一頁',Math.max(1,currentPage-1),{disabled:currentPage===1,label:'上一頁'}));
  const visible=new Set([1,totalPages,currentPage-2,currentPage-1,currentPage,currentPage+1,currentPage+2]);
  const pages=[...visible].filter(page=>page>=1&&page<=totalPages).sort((a,b)=>a-b);
  pages.forEach((page,index)=>{
    if(index&&page-pages[index-1]>1){
      const gap=document.createElement('span');
      gap.textContent='…';
      gap.setAttribute('aria-hidden','true');
      container.append(gap);
    }
    container.append(button(String(page),page,{current:page===currentPage}));
  });
  container.append(button('下一頁',Math.min(totalPages,currentPage+1),{disabled:currentPage===totalPages,label:'下一頁'}));
}

function logRangeLabel(page,total){
  if(!total)return '共 0 筆';
  const first=(page-1)*logPageSize+1;
  const last=Math.min(page*logPageSize,total);
  return `第 ${first}–${last} 筆，共 ${total} 筆`;
}

function renderActivity(){
  const selectedMonth=$('adminActivityMonth').value;
  const records=selectedMonth
    ?activityRecords.filter(record=>monthKey(record.created_at)===selectedMonth)
    :activityRecords;
  const groups=groupedActivityRecords(records);
  const totalPages=Math.max(1,Math.ceil(groups.length/logPageSize));
  adminActivityPage=Math.min(adminActivityPage,totalPages);
  const visible=groups.slice((adminActivityPage-1)*logPageSize,adminActivityPage*logPageSize);
  const entries=visible.map(group=>{
    const article=document.createElement('article');
    article.className='activity-entry';
    const heading=document.createElement('div');
    heading.className='activity-entry-heading';
    const title=document.createElement('h3');
    title.textContent=activityActionLabels[group.action]||group.action;
    const time=document.createElement('time');
    time.dateTime=group.created_at;
    time.textContent=formatLogTime(group.created_at);
    heading.append(title,time);
    const target=document.createElement('p');
    target.textContent=group.targets.length?group.targets.join('、'):'網站設定';
    const fields=document.createElement('p');
    const fieldNames=[...group.fields].map(field=>activityFieldLabels[field]||field);
    fields.textContent=fieldNames.length?`變更：${fieldNames.join('、')}`:'完成重新發布';
    const detail=document.createElement('p');
    detail.className='activity-detail';
    detail.dataset.activityDetail=group.id;
    detail.textContent='正在整理具體變更…';
    const actor=document.createElement('p');
    actor.className='activity-actor';
    actor.textContent=`管理員：${group.actor_email}`;
    article.append(heading,target,fields,detail,actor);
    return article;
  });
  if(!entries.length){
    const empty=document.createElement('p');
    empty.className='activity-empty';
    empty.textContent=selectedMonth?'這個月份沒有管理員操作紀錄。':'工程日誌啟用後，新的後台修改會顯示在這裡。';
    entries.push(empty);
  }
  $('activityList').replaceChildren(...entries);
  loadActivityDetails(visible).catch(()=>{});
  $('adminActivityCount').textContent=logRangeLabel(adminActivityPage,groups.length);
  renderPagination('adminActivityPagination',adminActivityPage,groups.length,page=>{
    adminActivityPage=page;
    renderActivity();
  });
}

function renderVersions(){
  const selectedMonth=$('websiteActivityMonth').value;
  const versions=selectedMonth
    ?websiteVersions.filter(version=>monthKey(version.committed_at)===selectedMonth)
    :websiteVersions;
  const totalPages=Math.max(1,Math.ceil(versions.length/logPageSize));
  websiteActivityPage=Math.min(websiteActivityPage,totalPages);
  const visible=versions.slice((websiteActivityPage-1)*logPageSize,websiteActivityPage*logPageSize);
  const entries=visible.map(version=>{
    const article=document.createElement('article');
    article.className='version-entry';
    const time=document.createElement('time');
    time.dateTime=version.committed_at;
    time.textContent=formatLogTime(version.committed_at);
    const copy=document.createElement('div');
    copy.className='version-entry-copy';
    const summaryZh=document.createElement('strong');
    summaryZh.textContent=version.summary_zh||version.summary;
    const summaryEn=document.createElement('p');
    summaryEn.lang='en';
    summaryEn.textContent=version.summary;
    copy.append(summaryZh);
    if(version.summary!==summaryZh.textContent)copy.append(summaryEn);
    if(version.details?.length){
      const details=document.createElement('ul');
      details.className='version-details';
      version.details.forEach(line=>{const item=document.createElement('li');item.textContent=line;details.append(item)});
      copy.append(details);
    }
    const commit=document.createElement('code');
    commit.textContent=version.short_commit;
    article.append(time,copy,commit);
    return article;
  });
  if(!entries.length){
    const empty=document.createElement('p');
    empty.className='activity-empty';
    empty.textContent='這個月份沒有網站更新紀錄。';
    entries.push(empty);
  }
  $('versionList').replaceChildren(...entries);
  $('websiteActivityCount').textContent=logRangeLabel(websiteActivityPage,versions.length);
  renderPagination('websiteActivityPagination',websiteActivityPage,versions.length,page=>{
    websiteActivityPage=page;
    renderVersions();
  });
  if(websiteVersions.length){
    const earliest=websiteVersions.at(-1);
    $('versionHistorySummary').textContent=`全部網站更新共 ${websiteVersions.length} 筆，可回溯至 ${formatLogTime(earliest.committed_at)}。`;
  }
}

function renderAdministrators(currentEmail=''){
  const normalizedCurrent=currentEmail.toLowerCase();
  $('adminPasswordForm').hidden=false;
  if(!roleListLoaded)loadRoleList();
  const entries=[...allowedEmails].sort().map(email=>{
    const article=document.createElement('article');
    const current=email===normalizedCurrent;
    article.className=`administrator-entry${current?' administrator-current':''}`;
    const heading=document.createElement('div');
    heading.className='administrator-entry-heading';
    const address=document.createElement('strong');
    address.textContent=email;
    const status=document.createElement('span');
    status.className='administrator-status';
    status.textContent=current?'目前登入':'已授權';
    const description=document.createElement('p');
    description.textContent='可登入後台、編輯網站內容、管理導覽選單並查看工程日誌。';
    heading.append(address,status);
    article.append(heading,description);
    return article;
  });
  $('administratorList').replaceChildren(...entries);
  $('administratorCount').textContent=`共 ${entries.length} 位`;
}

async function loadRoleList(){
  const output=$('adminPasswordMessage');
  output.textContent='正在讀取帳號名單…';
  let data,error;
  try{({data,error}=await supabase.functions.invoke('admin-set-password',{body:{action:'list_roles'}}))}
  catch{output.textContent='帳號名單載入失敗，請重新整理後台。';return}
  if(error||!Array.isArray(data?.roles)){
    const detail=await error?.context?.json?.().catch(()=>null);
    output.textContent=detail?.message||'帳號名單載入失敗，請重新整理後台。';
    return;
  }
  const select=$('targetAdmin');
  select.replaceChildren(new Option('請選擇',''),...data.roles.map(item=>new Option(`${item.email}（${item.role==='admin'?'管理員':'員工'}）`,item.email)));
  roleListLoaded=true;
  output.textContent='';
}

$('createEmployeeForm').onsubmit=async event=>{
  event.preventDefault();
  const email=$('employeeEmail').value.trim().toLowerCase();
  const password=$('employeePassword').value;
  const output=$('createEmployeeMessage');
  if(password.length<12){output.textContent='臨時密碼至少需要 12 個字元。';return}
  const button=$('createEmployeeForm').querySelector('button[type="submit"]');
  button.disabled=true;
  output.textContent='建立中…';
  try{
    const {data,error}=await supabase.functions.invoke('admin-set-password',{body:{action:'create_employee',email,password}});
    const detail=error?await error.context?.json?.().catch(()=>null):null;
    output.textContent=error?detail?.message||'建立失敗。':data.message;
    if(!error){$('employeeEmail').value='';$('employeePassword').value='';roleListLoaded=false;loadRoleList()}
  }catch{output.textContent='建立失敗。'}
  finally{button.disabled=false}
};

$('adminPasswordForm').onsubmit=async event=>{
  event.preventDefault();
  const email=$('targetAdmin').value;
  const password=$('temporaryPassword').value;
  const output=$('adminPasswordMessage');
  if(!email||password.length<12){output.textContent='請選擇帳號並輸入至少 12 個字元的臨時密碼。';return}
  output.textContent='設定中…';
  const button=$('adminPasswordForm').querySelector('button[type="submit"]');
  button.disabled=true;
  try{
    const {data,error}=await supabase.functions.invoke('admin-set-password',{body:{action:'set_password',email,password}});
    const detail=error?await error.context?.json?.().catch(()=>null):null;
    output.textContent=error?detail?.message||'設定失敗，請稍後重試。':data.message;
    if(!error)$('temporaryPassword').value='';
  }catch{output.textContent='設定失敗，請稍後重試。'}
  finally{button.disabled=false}
};

async function fetchActivity(){
  activityMessage('正在讀取工程日誌…');
  const activityColumns='id,transaction_id,action,entity_type,entity_key,entity_label,actor_email,changed_fields,created_at';
  const [firstActivityResult,versionResult]=await Promise.all([
    supabase.from('admin_activity_log')
      .select(activityColumns,{count:'exact'})
      .order('created_at',{ascending:false})
      .order('id',{ascending:false})
      .range(0,999),
    fetch('version-log.json',{cache:'no-store'}).then(response=>{
      if(!response.ok)throw new Error('無法讀取網站版本紀錄。');
      return response.json();
    })
  ]);
  if(firstActivityResult.error)throw firstActivityResult.error;
  activityRecords=firstActivityResult.data||[];
  const totalActivityRows=firstActivityResult.count||activityRecords.length;
  for(let from=activityRecords.length;from<totalActivityRows;from+=1000){
    const {data,error}=await supabase.from('admin_activity_log')
      .select(activityColumns)
      .order('created_at',{ascending:false})
      .order('id',{ascending:false})
      .range(from,Math.min(from+999,totalActivityRows-1));
    if(error)throw error;
    activityRecords.push(...(data||[]));
  }
  websiteVersions=versionResult||[];
  adminActivityPage=1;
  websiteActivityPage=1;
  populateMonthFilter('adminActivityMonth',activityRecords,'created_at');
  populateMonthFilter('websiteActivityMonth',websiteVersions,'committed_at');
  renderActivity();
  renderVersions();
  activityLoaded=true;
  activityMessage('');
}

async function saveDraft(){
  if(!$('title').value.trim())throw new Error('請填寫頁面標題。');
  const payload={title:$('title').value.trim(),meta_description:$('description').value.trim(),main_html:mainHtml(),updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('cms_pages').update(payload).eq('id',current.id).eq('updated_at',current.updated_at).select().maybeSingle();
  if(error)throw error;
  if(!data)throw new Error('這份草稿已由其他管理員更新。為避免互相覆蓋，請重新整理後再編輯。');
  Object.assign(current,data);
  pageDirty=false;
  activityLoaded=false;
  $('savedAt').textContent=`上次儲存：${new Date(current.updated_at).toLocaleString('zh-TW')}`;
  renderPageList($('pageSearch').value);
  message('草稿已儲存，正式網站尚未變更。');
}

async function publish(){
  const {data:serverPublished,error:readError}=await supabase.from('published_pages')
    .select('slug,title,meta_description,main_html,published_at').eq('slug',current.slug).maybeSingle();
  if(readError)throw readError;
  const publishedChanged=publishedSnapshot
    ?!serverPublished||serverPublished.published_at!==publishedSnapshot.published_at||!samePageContent(serverPublished,publishedSnapshot)
    :Boolean(serverPublished);
  if(publishedChanged)throw new Error('正式網站在你開啟此頁後已有更新。為避免覆蓋新版，請重新整理後再確認。');
  await saveDraft();
  const payload={slug:current.slug,file_name:current.file_name,title:current.title,meta_description:current.meta_description,main_html:current.main_html,sort_order:current.sort_order,published_at:new Date().toISOString()};
  let result;
  if(serverPublished){
    result=await supabase.from('published_pages').update(payload).eq('slug',current.slug).eq('published_at',serverPublished.published_at).select().maybeSingle();
  }else{
    result=await supabase.from('published_pages').insert(payload).select().maybeSingle();
  }
  const {data,error}=result;
  if(error)throw error;
  if(!data)throw new Error('正式網站剛剛已有其他更新，本次發布已停止；請重新整理後再確認。');
  publishedSnapshot=snapshotPage(data);
  publishedPages.set(current.slug,data);
  activityLoaded=false;
  $('contentSafetyStatus').classList.remove('warning');
  $('contentSafetyStatus').textContent='發布完成，後台草稿與正式網站已同步；本次發布前後版本已保留在管理員操作紀錄。';
  message('發布完成。重新整理正式網站即可看到更新。');
}

function switchView(view){
  document.querySelectorAll('.admin-tabs button').forEach(button=>{
    const active=button.dataset.view===view;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
  $('pagesView').hidden=view!=='pages';
  $('navigationView').hidden=view!=='navigation';
  $('activityView').hidden=view!=='activity';
  $('administratorsView').hidden=view!=='administrators';
  if(view==='pages')requestAnimationFrame(renderSidebarWidth);
  if(view==='activity'&&!activityLoaded)fetchActivity().catch(error=>activityMessage(error.message,true));
}

document.querySelectorAll('.admin-tabs button').forEach(button=>button.onclick=()=>switchView(button.dataset.view));
function switchActivityView(view){
  document.querySelectorAll('.activity-tabs button').forEach(button=>{
    const active=button.dataset.activityView===view;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
  $('adminActivityPanel').hidden=view!=='admin';
  $('websiteActivityPanel').hidden=view!=='website';
}
document.querySelectorAll('.activity-tabs button').forEach(button=>button.onclick=()=>switchActivityView(button.dataset.activityView));
$('adminActivityMonth').onchange=()=>{adminActivityPage=1;renderActivity()};
$('websiteActivityMonth').onchange=()=>{websiteActivityPage=1;renderVersions()};
$('pageSearch').oninput=event=>renderPageList(event.target.value);
for(const id of ['title','description'])$(id).addEventListener('input',()=>{pageDirty=true});
$('navigationList').addEventListener('input',()=>{navigationDirty=true});
$('navigationList').addEventListener('change',()=>{navigationDirty=true});
$('navigationList').addEventListener('click',event=>{
  const row=event.target.closest('.navigation-row');
  if(!row)return;
  if(event.target.closest('.move-up'))moveNavigationRow(row,-1);
  if(event.target.closest('.move-down'))moveNavigationRow(row,1);
});
let draggedNavigationRow=null;
$('navigationList').addEventListener('pointerdown',event=>{
  const handle=event.target.closest('.drag-handle');
  if(!handle||event.pointerType==='touch')return;
  handle.closest('.navigation-row').draggable=true;
});
$('navigationList').addEventListener('pointerup',event=>{
  const row=event.target.closest('.navigation-row');
  if(row&&!draggedNavigationRow)row.draggable=false;
});
$('navigationList').addEventListener('dragstart',event=>{
  const row=event.target.closest('.navigation-row');
  if(!row||!row.draggable)return;
  draggedNavigationRow=row;
  row.classList.add('dragging');
  event.dataTransfer.effectAllowed='move';
  event.dataTransfer.setData('text/plain',row.dataset.key);
});
$('navigationList').addEventListener('dragover',event=>{
  if(!draggedNavigationRow)return;
  event.preventDefault();
  const target=event.target.closest('.navigation-row');
  document.querySelectorAll('.navigation-row.drag-target').forEach(row=>row.classList.remove('drag-target'));
  if(!target||target===draggedNavigationRow)return;
  target.classList.add('drag-target');
  const before=event.clientY<target.getBoundingClientRect().top+target.offsetHeight/2;
  target[before?'before':'after'](draggedNavigationRow);
});
$('navigationList').addEventListener('drop',event=>{
  if(!draggedNavigationRow)return;
  event.preventDefault();
  navigationDirty=true;
  updateNavigationOrderControls();
});
$('navigationList').addEventListener('dragend',()=>{
  if(draggedNavigationRow)draggedNavigationRow.draggable=false;
  draggedNavigationRow=null;
  document.querySelectorAll('.navigation-row.dragging,.navigation-row.drag-target').forEach(row=>row.classList.remove('dragging','drag-target'));
});
window.addEventListener('beforeunload',event=>{if(pageDirty||navigationDirty){event.preventDefault();event.returnValue=''}});
$('passwordLoginForm').onsubmit=async event=>{
  event.preventDefault();
  const email=$('email').value.trim().toLowerCase();
  $('loginMessage').textContent='登入中…';
  const {error}=await supabase.auth.signInWithPassword({email,password:$('password').value});
  $('loginMessage').textContent=error?'Email 或密碼不正確。':'';
};
$('magicLinkLogin').onclick=async()=>{
  const email=$('email').value.trim().toLowerCase();
  $('loginMessage').textContent='寄送中…';
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.href,shouldCreateUser:false}});
  $('loginMessage').textContent=error?error.message:'登入連結已寄出，請到信箱收信。';
};
$('resetPassword').onclick=async()=>{
  const email=$('email').value.trim().toLowerCase();
  $('loginMessage').textContent='寄送中…';
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname+'?set-password=1'});
  $('loginMessage').textContent=error?error.message:'密碼設定連結已寄出，請到信箱收信。';
};
$('passwordRecoveryForm').onsubmit=async event=>{
  event.preventDefault();
  const password=$('newPassword').value;
  if(password.length<8){$('passwordRecoveryMessage').textContent='密碼至少需要 8 個字元。';return}
  if(password!==$('confirmPassword').value){$('passwordRecoveryMessage').textContent='兩次輸入的密碼不一致。';return}
  $('passwordRecoveryMessage').textContent='儲存中…';
  const {error}=await supabase.auth.updateUser({password});
  if(error){$('passwordRecoveryMessage').textContent=error.message;return}
  settingPassword=false;
  $('newPassword').value='';
  $('confirmPassword').value='';
  const cleanUrl=new URL(location.href);
  cleanUrl.searchParams.delete('set-password');
  cleanUrl.hash='';
  history.replaceState(null,'',cleanUrl);
  showAuthenticatedState(currentSession);
};
$('save').onclick=()=>saveDraft().catch(error=>message(error.message,true));
$('publish').onclick=()=>publish().catch(error=>message(error.message,true));
document.querySelectorAll('#title,#description,#projectCategory,#projectCity,#projectDistrict').forEach(input=>input.addEventListener('input',()=>{pageDirty=true}));
const projectLayout=[];
let layoutDrag=null;
function placeComponent(index,source){
  if(!source)return;
  if(source.type)projectLayout.splice(index,0,source.type);
  else{
    const [type]=projectLayout.splice(source.index,1);
    projectLayout.splice(index-(source.index<index?1:0),0,type);
  }
  renderProjectOrder();
}
function renderProjectOrder(){
  const list=$('newProjectOrder');list.replaceChildren();
  const row=text=>{const li=document.createElement('li'),label=document.createElement('span');label.textContent=text;li.append(label);list.append(li);return li};
  row('01　個案封面');row('02　基本資料表');
  projectLayout.forEach((type,index)=>{
    const li=row(String(index+3).padStart(2,'0')+'　'+ProjectBlocks.types[type]);
    li.draggable=true;li.dataset.index=index;
    li.ondragstart=e=>{layoutDrag={index};e.dataTransfer.setData('text/plain',type)};
    for(const [label,action,disabled] of [
      ['上移',()=>placeComponent(index-1,{index}),index===0],
      ['下移',()=>placeComponent(index+2,{index}),index===projectLayout.length-1],
      ['移除',()=>{projectLayout.splice(index,1);renderProjectOrder()},false]
    ]){
      const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=disabled;button.onclick=action;li.append(button);
    }
  });
  row('將元件放在這裡').dataset.index=projectLayout.length;
}
for(const [type,name] of Object.entries(ProjectBlocks.types).slice(2)){
  const tile=document.createElement('button');tile.type='button';tile.textContent=name;tile.draggable=true;
  tile.onclick=()=>placeComponent(projectLayout.length,{type});
  tile.ondragstart=e=>{layoutDrag={type};e.dataTransfer.setData('text/plain',type)};
  $('newProjectPalette').append(tile);
}
const order=$('newProjectOrder');
order.ondragover=e=>{
  if(!layoutDrag)return;
  e.preventDefault();order.querySelector('[data-over]')?.removeAttribute('data-over');
  e.target.closest('li[data-index]')?.setAttribute('data-over','');
};
order.ondrop=e=>{
  if(!layoutDrag)return;
  e.preventDefault();placeComponent(Number(e.target.closest('li')?.dataset.index??projectLayout.length),layoutDrag);layoutDrag=null;
};
$('newProjectLayout').ondragend=()=>{layoutDrag=null;order.querySelector('[data-over]')?.removeAttribute('data-over')};
$('newProject').onclick=()=>{renderProjectOrder();$('newProjectMessage').textContent='';$('newProjectMessage').classList.remove('error');$('newProjectDialog').showModal();$('newProjectName').focus()};
$('cancelNewProject').onclick=()=>$('newProjectDialog').close();
$('newProjectForm').onsubmit=async event=>{
  event.preventDefault();
  const name=$('newProjectName').value.trim();
  const category=$('newProjectCategory').value;
  const city=$('newProjectCity').value.trim();
  const district=$('newProjectDistrict').value.trim();
  const summary=$('newProjectSummary').value.trim();
  if(!name||!city||!district||!summary){$('newProjectMessage').textContent='請填寫全部欄位。';return}
  if(pageDirty&&!confirm('目前頁面有尚未儲存的修改。要放棄修改並建立新個案嗎？'))return;
  const submit=$('createNewProject');
  submit.disabled=true;
  $('newProjectMessage').textContent='建立草稿中…';
  try{
    const slug=`custom-${crypto.randomUUID()}`;
    const usedNumbers=pages.map(page=>Number(ProjectBlocks.canonicalProjectFile(page.file_name).match(/^project-(\d+)\.html$/)?.[1]||0));
    let nextNumber=Math.max(23,...usedNumbers)+1;
    const payload={slug,file_name:`project-${nextNumber}.html`,title:`${name}｜元捷建設`,meta_description:summary,main_html:newProjectHtml({name,category,city,district,summary,layout:projectLayout}),sort_order:Math.max(0,...pages.map(page=>page.sort_order||0))+10,updated_at:new Date().toISOString()};
    let data,error;
    for(let attempt=0;attempt<5;attempt++){
      payload.file_name=`project-${nextNumber++}.html`;
      ({data,error}=await supabase.from('cms_pages').insert(payload).select().single());
      if(!error||error.code!=='23505')break;
    }
    if(error)throw error;
    pages.push(data);
    pages.sort((a,b)=>a.sort_order-b.sort_order);
    $('pageSearch').value='';
    expandedPageGroups.add('個案頁面');
    renderPageList();
    $('newProjectDialog').close();
    $('newProjectForm').reset();projectLayout.length=0;
    activityLoaded=false;
    pageDirty=false;
    await loadEditor(data);
    message('個案草稿已建立。請上傳圖片、補齊資料並儲存；確認後再發布。');
  }catch(error){$('newProjectMessage').textContent=error.message;$('newProjectMessage').classList.add('error')}
  finally{submit.disabled=false}
};
$('newCompanyPage').onclick=()=>{$('newCompanyMessage').textContent='';$('newCompanyDialog').showModal();$('newCompanyName').focus()};
$('cancelNewCompany').onclick=()=>$('newCompanyDialog').close();
$('newCompanyForm').onsubmit=async event=>{
  event.preventDefault();
  if(pageDirty&&!confirm('目前頁面有尚未儲存的修改。要放棄修改並建立新公司頁面嗎？'))return;
  const name=$('newCompanyName').value.trim(),summary=$('newCompanySummary').value.trim();
  if(!name||!summary)return;
  const submit=$('createNewCompany');submit.disabled=true;$('newCompanyMessage').textContent='建立草稿中…';
  try{
    const used=pages.map(page=>Number(page.file_name.match(/^company-(\d+)\.html$/)?.[1]||0));
    let nextNumber=Math.max(0,...used)+1;
    const payload={slug:`company-${crypto.randomUUID()}`,file_name:'',title:`${name}｜元捷建設`,meta_description:summary,main_html:newCompanyHtml(name,summary),sort_order:Math.max(0,...pages.map(page=>page.sort_order||0))+10,updated_at:new Date().toISOString()};
    let data,error;
    for(let attempt=0;attempt<5;attempt++){
      payload.file_name=`company-${nextNumber++}.html`;
      ({data,error}=await supabase.from('cms_pages').insert(payload).select().single());
      if(!error||error.code!=='23505')break;
    }
    if(error)throw error;
    pages.push(data);pages.sort((a,b)=>a.sort_order-b.sort_order);
    $('pageSearch').value='';expandedPageGroups.add('公司詳情頁');renderPageList();
    $('newCompanyDialog').close();$('newCompanyForm').reset();activityLoaded=false;pageDirty=false;
    await loadEditor(data);
    message('公司頁面草稿已建立。請編輯區塊、補上圖片並儲存；確認後再發布。');
  }catch(error){$('newCompanyMessage').textContent=error.message;$('newCompanyMessage').classList.add('error')}
  finally{submit.disabled=false}
};
$('addQuestion').onclick=()=>{
  if(current?.file_name!=='qa.html')return;
  $('newQuestionForm').reset();
  $('newQuestionDialog').showModal();
  $('newQuestionText').focus();
};
$('cancelNewQuestion').onclick=()=>$('newQuestionDialog').close();
$('newQuestionForm').onsubmit=event=>{
  event.preventDefault();
  if(current?.file_name!=='qa.html')return;
  const question=$('newQuestionText').value.trim();
  const answer=$('newAnswerText').value.trim();
  const category=$('newQuestionCategory').value;
  if(!question||!answer)return;
  const doc=$('visualEditor').contentDocument;
  const list=doc?.querySelector('main #questions');
  if(!list){message('問答區塊未載入，請重新開啟問與答頁面。',true);return}
  const rows=[...list.querySelectorAll(':scope > details')];
  const nextId=Math.max(0,...rows.map(row=>Number(row.id.match(/^q(\d+)$/)?.[1]||0)))+1;
  const row=doc.createElement('details');
  row.id=`q${nextId}`;
  row.dataset.category=category;
  const summary=doc.createElement('summary');
  const number=doc.createElement('span');
  number.className='eyebrow';
  number.style.marginRight='18px';
  number.textContent=String(rows.length+1).padStart(2,'0');
  summary.append(number,doc.createTextNode(question));
  const body=doc.createElement('div');
  body.className='answer';
  for(const paragraph of answer.split(/\n\s*\n/)){
    const p=doc.createElement('p');
    p.append(...paragraph.split('\n').flatMap((line,index)=>index?[doc.createElement('br'),doc.createTextNode(line)]:[doc.createTextNode(line)]));
    body.append(p);
  }
  row.append(summary,body);
  list.append(row);
  row.open=true;
  const count=doc.querySelector('main .qa-count');
  if(count)count.textContent=`共 ${rows.length+1} 個問題`;
  pageDirty=true;
  $('newQuestionDialog').close();
  row.scrollIntoView({block:'center',behavior:'smooth'});
  message('問答已加入預覽。請儲存草稿，確認後再發布網站。');
};
$('saveNavigation').onclick=()=>saveNavigationDraft().catch(error=>navigationMessage(error.message,true));
$('publishNavigation').onclick=()=>publishNavigation().catch(error=>navigationMessage(error.message,true));
$('activityRefresh').onclick=()=>fetchActivity().catch(error=>activityMessage(error.message,true));
$('signOut').onclick=()=>supabase.auth.signOut();
$('changePassword').onclick=()=>{
  settingPassword=true;
  showAuthenticatedState(currentSession);
};
document.querySelectorAll('[data-command]').forEach(button=>button.onclick=()=>{
  const command=button.dataset.command;
  const value=command==='createLink'?prompt('請輸入連結網址'):null;
  $('visualEditor').contentDocument.execCommand(command,false,value);
});
async function loadDashboard(){
  if(dashboardLoading||pages.length)return;
  dashboardLoading=true;
  try{
    await fetchPages();
    await fetchNavigation();
  }catch(error){
    message(error.message,true);
  }finally{
    dashboardLoading=false;
  }
}

async function showAuthenticatedState(session){
  currentSession=session;
  const request=++roleRequest;
  let role=null;
  if(session?.user){
    const result=await supabase.from('site_user_roles').select('role,email').eq('user_id',session.user.id).maybeSingle();
    if(request!==roleRequest)return;
    if(!result.error&&result.data?.email===session.user.email?.toLowerCase())role=result.data.role;
  }
  const valid=role==='admin'||role==='employee';
  const recovery=valid&&settingPassword;
  $('login').hidden=valid;
  $('passwordRecovery').hidden=!recovery;
  $('app').hidden=role!=='admin'||recovery;
  $('employeeApp').hidden=role!=='employee'||recovery;
  $('changePassword').hidden=!valid||recovery;
  $('signOut').hidden=!valid;
  if(role==='admin'&&!recovery){
    requestAnimationFrame(renderSidebarWidth);
    renderAdministrators(session.user.email||'');
    if(!pages.length)setTimeout(loadDashboard,0);
  }
  if(role==='employee'&&!recovery)loadEmployeePages();
}

async function loadEmployeePages(){
  const {data,error}=await supabase.from('cms_pages').select('slug,title,main_html').order('sort_order');
  if(error){$('employeeMessage').textContent='暫時無法讀取頁面。';return}
  const entries=(data||[]).map(page=>{
    const details=document.createElement('details');
    const summary=document.createElement('summary');
    summary.textContent=page.title;
    const article=document.createElement('article');
    article.textContent=new DOMParser().parseFromString(page.main_html,'text/html').body.textContent||'';
    details.append(summary,article);
    return details;
  });
  $('employeePages').replaceChildren(...entries);
}

supabase.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY')settingPassword=true;
  if(event==='SIGNED_OUT')settingPassword=false;
  showAuthenticatedState(session);
});
