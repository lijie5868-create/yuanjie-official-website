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
    <label><span>選單名稱</span><input data-field="label"></label>
    <label><span>第二行副標</span><input data-field="subtitle"></label>
    <div class="destination"><span>連結頁面</span><strong></strong><small></small></div>
    <label><span>順序</span><input data-field="nav_order" type="number" step="10"></label>
    <label class="visibility"><input data-field="is_visible" type="checkbox"><span>顯示</span></label>`;
  row.querySelector('[data-field="label"]').value=item.label;
  row.querySelector('[data-field="subtitle"]').value=item.subtitle||'';
  row.querySelector('[data-field="nav_order"]').value=item.nav_order;
  row.querySelector('[data-field="is_visible"]').checked=item.is_visible;
  const matchingPage=pages.find(page=>page.file_name===item.href);
  row.querySelector('.destination strong').textContent=matchingPage?.title||item.nav_key;
  row.querySelector('.destination small').textContent=item.href;
  return row;
}

function renderNavigation(){
  $('navigationList').replaceChildren(...navigation.sort((a,b)=>a.nav_order-b.nav_order).map(navigationRow));
}

async function fetchNavigation(){
  const {data,error}=await supabase.from('cms_navigation').select('*').order('nav_order');
  if(error)throw error;
  navigation=data;
  renderNavigation();
}

function navigationPayload(){
  return [...document.querySelectorAll('.navigation-row')].map(row=>{
    const original=navigation.find(item=>item.nav_key===row.dataset.key);
    const label=row.querySelector('[data-field="label"]').value.trim();
    if(!label)throw new Error('選單名稱不能留空。');
    return {
      nav_key:original.nav_key,
      label,
      subtitle:row.querySelector('[data-field="subtitle"]').value.trim(),
      href:original.href,
      nav_order:Number(row.querySelector('[data-field="nav_order"]').value)||0,
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
  navigationMessage('選單草稿已儲存，正式網站尚未變更。');
}

async function publishNavigation(){
  await saveNavigationDraft();
  const publishedAt=new Date().toISOString();
  const rows=navigation.map(({nav_key,label,subtitle,href,nav_order,is_visible})=>({nav_key,label,subtitle,href,nav_order,is_visible,published_at:publishedAt}));
  const {error}=await supabase.from('published_navigation').upsert(rows,{onConflict:'nav_key'});
  if(error)throw error;
  navigationMessage('選單已發布。重新整理正式網站即可看到更新。');
}

async function saveDraft(){
  const payload={title:$('title').value.trim(),meta_description:$('description').value.trim(),main_html:mainHtml(),updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('cms_pages').update(payload).eq('id',current.id).select().single();
  if(error)throw error;
  Object.assign(current,data);
  pageDirty=false;
  $('savedAt').textContent=`上次儲存：${new Date(current.updated_at).toLocaleString('zh-TW')}`;
  renderPageList($('pageSearch').value);
  message('草稿已儲存，正式網站尚未變更。');
}

async function publish(){
  await saveDraft();
  const payload={slug:current.slug,file_name:current.file_name,title:current.title,meta_description:current.meta_description,main_html:current.main_html,sort_order:current.sort_order,published_at:new Date().toISOString()};
  const {error}=await supabase.from('published_pages').upsert(payload,{onConflict:'slug'});
  if(error)throw error;
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
  if(view==='pages')requestAnimationFrame(renderSidebarWidth);
}

document.querySelectorAll('.admin-tabs button').forEach(button=>button.onclick=()=>switchView(button.dataset.view));
$('pageSearch').oninput=event=>renderPageList(event.target.value);
for(const id of ['title','description'])$(id).addEventListener('input',()=>{pageDirty=true});
$('navigationList').addEventListener('input',()=>{navigationDirty=true});
$('navigationList').addEventListener('change',()=>{navigationDirty=true});
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
