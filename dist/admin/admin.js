import {createClient} from "https://esm.sh/@supabase/supabase-js@2.75.1";
import {createImageEditor} from "./image-editor.js?v=1";

const cfg=window.YUANJIE_CONFIG;
const allowedEmails=new Set(["lijie5868@gmail.com","ru8ru8u8@gmail.com","lazyunclek@gmail.com"]);
const primaryPages=new Set(["home","about","team","urban","renewal","qa"]);
const basePath=location.pathname.replace(/admin\/?$/,'');
const supabase=createClient(cfg.supabaseUrl,cfg.publishableKey);
const $=id=>document.getElementById(id);
let pages=[];
let navigation=[];
let current=null;
let dashboardLoading=false;
let pageDirty=false;
let navigationDirty=false;
let activityLoaded=false;
let activityRecords=[];
let websiteVersions=[];
const expandedPageGroups=new Set(['主要頁面']);
const imageEditor=createImageEditor({frame:$('visualEditor'),supabase,onChange:()=>{pageDirty=true},onMessage:message});
const pageLayout=document.querySelector('.pages-layout');
const pageResizer=$('pageResizer');
const sidebarWidthKey='yuanjie-admin-sidebar-width';
let preferredSidebarWidth=250;
let resizePointer=null;

try{
  const savedWidth=Number(localStorage.getItem(sidebarWidthKey));
  if(Number.isFinite(savedWidth)&&savedWidth>0)preferredSidebarWidth=savedWidth;
}catch{}

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

function showMessage(target,text,error=false){
  $(target).textContent=text;
  $(target).classList.toggle('error',error);
}

function message(text,error=false){showMessage('appMessage',text,error)}
function navigationMessage(text,error=false){showMessage('navigationMessage',text,error)}
function activityMessage(text,error=false){showMessage('activityMessage',text,error)}

function editorDocument(html){
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><base href="${location.origin}${basePath}"><link rel="stylesheet" href="${basePath}style.css"><style>body{margin:0;padding:18px;background:#fff}a{pointer-events:none}img[data-admin-selected]{outline:3px solid #a47c48;outline-offset:3px}</style></head><body>${html}</body></html>`;
}

function loadEditor(page){
  if(pageDirty&&!confirm('目前頁面有尚未儲存的修改。要放棄修改並切換頁面嗎？'))return;
  current=page;
  pageDirty=false;
  $('title').value=page.title;
  $('description').value=page.meta_description;
  $('visitPage').href=`${basePath}${page.file_name}`;
  const frame=$('visualEditor');
  frame.srcdoc=editorDocument(page.main_html);
  frame.onload=()=>{
    frame.contentDocument.designMode='on';
    imageEditor.bindFrame();
    frame.contentDocument.addEventListener('input',()=>{pageDirty=true});
  };
  document.querySelectorAll('#pageList button[data-slug]').forEach(button=>{
    button.classList.toggle('active',button.dataset.slug===page.slug);
  });
  $('savedAt').textContent=page.updated_at?`上次儲存：${new Date(page.updated_at).toLocaleString('zh-TW')}`:'';
  message('');
}

function mainHtml(){
  const main=$('visualEditor').contentDocument.querySelector('main');
  if(!main)throw new Error('頁面內容缺少 main 區塊，請重新載入後再試。');
  const copy=main.cloneNode(true);
  copy.querySelectorAll('[data-admin-selected]').forEach(image=>image.removeAttribute('data-admin-selected'));
  return copy.outerHTML;
}

function pageButton(page){
  const button=document.createElement('button');
  button.type='button';
  button.dataset.slug=page.slug;
  button.innerHTML='<strong></strong><small></small>';
  button.querySelector('strong').textContent=page.title;
  button.querySelector('small').textContent=page.file_name;
  button.onclick=()=>loadEditor(page);
  return button;
}

function renderPageList(filter=''){
  const list=$('pageList');
  const query=filter.trim().toLocaleLowerCase('zh-Hant');
  const matches=pages.filter(page=>`${page.title} ${page.file_name}`.toLocaleLowerCase('zh-Hant').includes(query));
  list.replaceChildren();
  for(const [heading,predicate] of [["主要頁面",page=>primaryPages.has(page.slug)],["個案頁面",page=>!primaryPages.has(page.slug)]]){
    const grouped=matches.filter(predicate);
    if(!grouped.length)continue;
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
    group.append(title,...grouped.map(pageButton));
    list.append(group);
  }
  if(!matches.length){
    const empty=document.createElement('p');
    empty.className='empty-state';
    empty.textContent='找不到符合的頁面。';
    list.append(empty);
  }
  if(current)document.querySelector(`#pageList button[data-slug="${CSS.escape(current.slug)}"]`)?.classList.add('active');
}

async function fetchPages(){
  const {data,error}=await supabase.from('cms_pages').select('*').order('sort_order');
  if(error)throw error;
  pages=data;
  renderPageList();
  if(pages.length)loadEditor(pages[0]);
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

function renderActivity(){
  const selectedMonth=$('adminActivityMonth').value;
  const records=selectedMonth
    ?activityRecords.filter(record=>monthKey(record.created_at)===selectedMonth)
    :activityRecords;
  const groups=new Map();
  records.forEach(record=>{
    const key=`${record.transaction_id}:${record.action}`;
    if(!groups.has(key))groups.set(key,{...record,targets:[],fields:new Set()});
    const group=groups.get(key);
    if(record.entity_label&&!group.targets.includes(record.entity_label))group.targets.push(record.entity_label);
    (record.changed_fields||[]).forEach(field=>group.fields.add(field));
  });
  const entries=[...groups.values()].map(group=>{
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
    const actor=document.createElement('p');
    actor.className='activity-actor';
    actor.textContent=`管理員：${group.actor_email}`;
    article.append(heading,target,fields,actor);
    return article;
  });
  if(!entries.length){
    const empty=document.createElement('p');
    empty.className='activity-empty';
    empty.textContent=selectedMonth?'這個月份沒有管理員操作紀錄。':'工程日誌啟用後，新的後台修改會顯示在這裡。';
    entries.push(empty);
  }
  $('activityList').replaceChildren(...entries);
}

function renderVersions(){
  const selectedMonth=$('websiteActivityMonth').value;
  const versions=selectedMonth
    ?websiteVersions.filter(version=>monthKey(version.committed_at)===selectedMonth)
    :websiteVersions;
  const entries=versions.map(version=>{
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
    copy.append(summaryZh,summaryEn);
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
  if(websiteVersions.length){
    const earliest=websiteVersions.at(-1);
    $('versionHistorySummary').textContent=`現存紀錄共 ${websiteVersions.length} 次，可回溯至 ${formatLogTime(earliest.committed_at)}。`;
  }
}

async function fetchActivity(){
  activityMessage('正在讀取工程日誌…');
  const [activityResult,versionResult]=await Promise.all([
    supabase.from('admin_activity_log')
      .select('id,transaction_id,action,entity_type,entity_key,entity_label,actor_email,changed_fields,created_at')
      .order('created_at',{ascending:false})
      .limit(300),
    fetch('version-log.json',{cache:'no-store'}).then(response=>{
      if(!response.ok)throw new Error('無法讀取網站版本紀錄。');
      return response.json();
    })
  ]);
  if(activityResult.error)throw activityResult.error;
  activityRecords=activityResult.data||[];
  websiteVersions=versionResult||[];
  populateMonthFilter('adminActivityMonth',activityRecords,'created_at');
  populateMonthFilter('websiteActivityMonth',websiteVersions,'committed_at');
  renderActivity();
  renderVersions();
  activityLoaded=true;
  activityMessage('');
}

async function saveDraft(){
  const payload={title:$('title').value.trim(),meta_description:$('description').value.trim(),main_html:mainHtml(),updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('cms_pages').update(payload).eq('id',current.id).select().single();
  if(error)throw error;
  Object.assign(current,data);
  pageDirty=false;
  activityLoaded=false;
  $('savedAt').textContent=`上次儲存：${new Date(current.updated_at).toLocaleString('zh-TW')}`;
  renderPageList($('pageSearch').value);
  message('草稿已儲存，正式網站尚未變更。');
}

async function publish(){
  await saveDraft();
  const payload={slug:current.slug,file_name:current.file_name,title:current.title,meta_description:current.meta_description,main_html:current.main_html,sort_order:current.sort_order,published_at:new Date().toISOString()};
  const {error}=await supabase.from('published_pages').upsert(payload,{onConflict:'slug'});
  if(error)throw error;
  activityLoaded=false;
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
$('adminActivityMonth').onchange=renderActivity;
$('websiteActivityMonth').onchange=renderVersions;
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
$('loginForm').onsubmit=async event=>{
  event.preventDefault();
  const email=$('email').value.trim().toLowerCase();
  if(!allowedEmails.has(email)){$('loginMessage').textContent='此信箱沒有後台權限。';return}
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:location.href,shouldCreateUser:true}});
  $('loginMessage').textContent=error?error.message:'登入連結已寄出，請到信箱收信。';
};
$('save').onclick=()=>saveDraft().catch(error=>message(error.message,true));
$('publish').onclick=()=>publish().catch(error=>message(error.message,true));
$('saveNavigation').onclick=()=>saveNavigationDraft().catch(error=>navigationMessage(error.message,true));
$('publishNavigation').onclick=()=>publishNavigation().catch(error=>navigationMessage(error.message,true));
$('activityRefresh').onclick=()=>fetchActivity().catch(error=>activityMessage(error.message,true));
$('signOut').onclick=()=>supabase.auth.signOut();
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

supabase.auth.onAuthStateChange((_event,session)=>{
  const valid=allowedEmails.has(session?.user?.email?.toLowerCase());
  $('login').hidden=valid;
  $('app').hidden=!valid;
  $('signOut').hidden=!valid;
  if(valid)requestAnimationFrame(renderSidebarWidth);
  if(valid&&!pages.length)setTimeout(loadDashboard,0);
});
