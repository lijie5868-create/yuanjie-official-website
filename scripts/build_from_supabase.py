#!/usr/bin/env python3
"""Refresh published content from Supabase while preserving existing templates."""
import html,json,os,re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[1]; DIST=ROOT/'dist'
URL=os.environ.get('SUPABASE_URL','').rstrip('/'); KEY=os.environ.get('SUPABASE_PUBLISHABLE_KEY','')
PROJECT_ALIASES={
    'shidong.html':'project-1.html',
    'heping.html':'project-11.html',
    'project-xinguang-urban.html':'project-21.html',
    'project-wuxing.html':'project-22.html',
    'project.html?case=custom-794ea02b-a94a-473f-bb94-7a6a87c2c881':'project-23.html',
}
def canonical_file(name): return PROJECT_ALIASES.get(name,name)
def canonicalize_links(source):
    for old,new in PROJECT_ALIASES.items():
        source=source.replace(f'href="{old}"',f'href="{new}"').replace(f'data-href="{old}"',f'data-href="{new}"')
    return source
def move_signing_note_to_specs(source):
    sentence='自主更新會成立後再行簽約'
    status_pattern=r'<p class="case-status">\s*'+sentence+r'[。]?\s*</p>'
    if not re.search(status_pattern,source): return source
    specs=re.search(r'<dl class="specs">.*?</dl>',source,re.S)
    if not specs: return source
    table=specs.group(0)
    if not re.search(r'<dt>備註</dt>',table):
        table=table.replace('</dl>',f'<div><dt>備註</dt><dd>{sentence}</dd></div></dl>')
    source=source[:specs.start()]+table+source[specs.end():]
    return re.sub(status_pattern,'',source,count=1)
def remove_old_feature_tagline(source):
    return re.sub(r'<p(?:\s+[^>]*)?>\s*生活底蘊\s*×\s*建築美學\s*×\s*更新願景\s*</p>','',source)
def fetch(table, order='sort_order.asc'):
    req=Request(f'{URL}/rest/v1/{table}?'+urlencode({'select':'*','order':order}),headers={'apikey':KEY,'Authorization':f'Bearer {KEY}'})
    with urlopen(req,timeout=30) as response: return json.load(response)
def replace(pattern,replacement,source): return re.sub(pattern,lambda _:replacement,source,count=1,flags=re.I|re.S)
def group_home_project_copy(source):
    pattern=r'(<a class="portal"[^>]*><img\b[^>]*>)(.*?)(</a>)'
    def group(match):
        if 'class="category-copy"' in match.group(2): return match.group(0)
        return match.group(1)+'<div class="category-copy">'+match.group(2)+'</div>'+match.group(3)
    return re.sub(pattern,group,source,flags=re.I|re.S)
def format_case_card_facts(source):
    pattern=r'<p>基地\s*([^<｜|]+?)\s*[｜|]\s*([^<]+?戶)</p>\s*<p>預估總銷\s*([^<]+)</p>'
    def stat(kind,label,value):
        return (f'<span class="case-card-stat case-card-stat--{kind}">'
                f'<span class="case-card-stat-icon" aria-hidden="true"></span>'
                f'<span class="case-card-stat-copy"><small>{label}</small>'
                f'<strong>{html.escape(value.strip())}</strong></span></span>')
    def format_match(match):
        area,homes,sales=match.groups()
        return ('<div class="case-card-stats">'+stat('area','基地',area)
                +stat('homes','戶數',homes)+stat('sales','預估總銷',sales)+'</div>')
    source=re.sub(pattern,format_match,source)
    def place_note(match):
        card=match.group(0)
        if 'case-card-inline-note' in card: return card
        note=re.search(r'<div class="case-card-stats">.*?</div>(<small>([^<]+)</small>)',card,re.S)
        location=re.search(r'</p>(?=<div class="case-card-stats">)',card)
        if not note or not location: return card
        card=card.replace(note.group(1),'',1)
        return card[:location.start()]+f'<small class="case-card-inline-note">{note.group(2)}</small>'+card[location.start():]
    return re.sub(r'<a class="case-card".*?</a>',place_note,source,flags=re.S)
def sync_case_card_notes(source,project_pages):
    notes={}
    for page in project_pages:
        name=canonical_file(page['file_name'])
        if not re.fullmatch(r'project-\d+\.html',name): continue
        main=move_signing_note_to_specs(page.get('main_html',''))
        specs=re.search(r'<dl class="specs">.*?</dl>',main,re.S)
        note=re.search(r'<dt>備註</dt>\s*<dd>(.*?)</dd>',specs.group(0),re.S) if specs else None
        notes[name]=html.unescape(re.sub(r'<[^>]*>','',note.group(1))).strip() if note else ''
    def sync(match):
        card=match.group(0)
        link=re.search(r'href="([^"]+)"',card)
        name=canonical_file(link.group(1)) if link else ''
        if name not in notes: return card
        card=re.sub(r'<small class="case-card-inline-note"[^>]*>.*?</small>','',card,flags=re.S)
        card=re.sub(r'<p class="case-card-note"[^>]*>.*?</p>','',card,flags=re.S)
        value=notes[name]
        if not value: return card
        marker=f'<small class="case-card-inline-note">{html.escape(value)}</small>'
        return re.sub(r'(<p class="project-location"[^>]*>.*?)(</p>)',lambda m:m.group(1)+marker+m.group(2),card,count=1,flags=re.S)
    return re.sub(r'<a class="case-card".*?</a>',sync,source,flags=re.S)
def project_category(page):
    main=page.get('main_html','')
    match=re.search(r'data-project-category=["\'](urban|renewal)["\']',main,re.I)
    if match: return match.group(1)
    if re.search(r'<a\b[^>]*href=["\']renewal\.html["\']',main,re.I): return 'renewal'
    if re.search(r'<a\b[^>]*href=["\']urban\.html["\']',main,re.I): return 'urban'
    if re.search(r'危老|RECONSTRUCTION',page.get('title','')+' '+main,re.I): return 'renewal'
    return 'urban' if re.match(r'project(?:-|\.html)',page.get('file_name','')) else None
def reorder_case_cards(source,category,project_pages):
    ranks={canonical_file(page['file_name']):index for index,page in enumerate(page for page in project_pages if project_category(page)==category)}
    matches=list(re.finditer(r'<a class="case-card".*?</a>',source,re.S))
    if not matches:return source
    cards=[card for card in (match.group(0) for match in matches) if (link:=re.search(r'href=["\']([^"\']+)',card)) and link.group(1) in ranks]
    cards.sort(key=lambda card:ranks[re.search(r'href=["\']([^"\']+)',card).group(1)])
    result=source[:matches[0].start()];end=matches[0].start()
    for match in matches:
        result+=source[end:match.start()];end=match.end()
        if cards:result+=cards.pop(0)
    return result+source[end:]
def mark_selecting_implementer(source,project_pages):
    active={canonical_file(page['file_name']) for page in project_pages
            if project_category(page)=='urban' and re.search(r'data-selecting-implementer=["\']true["\']',page.get('main_html',''),re.I)}
    def mark(match):
        card=match.group(0)
        link=re.search(r'href=["\']([^"\']+)',card)
        card=re.sub(r'<span class="case-card-selection-status".*?</span></span>','',card,flags=re.S)
        if not link or link.group(1) not in active:return card
        badge='<span class="case-card-selection-status"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h16M6 20V9l6-4 6 4v11M9 13h6M12 10v6"/></svg><span>遴選實施者</span></span>'
        return card.replace('</a>',badge+'</a>')
    return re.sub(r'<a class="case-card".*?</a>',mark,source,flags=re.S)
if not URL or not KEY:
    print('Supabase variables not configured; keeping checked-in published site unchanged.'); raise SystemExit(0)
pages=fetch('published_pages')
navigation=fetch('published_navigation','nav_order.asc')
for page in pages:
    name=canonical_file(page['file_name'])
    path=DIST/name
    old_template=DIST/page['file_name']
    template=path if path.is_file() else old_template if old_template.is_file() else DIST/'project.html' if re.fullmatch(r'project-\d+\.html',name) else DIST/'chengyu.html' if re.fullmatch(r'company-\d+\.html',name) else DIST/'index.html'
    source=template.read_text(encoding='utf-8')
    source=replace(r'<title>.*?</title>',f"<title>{page['title']}</title>",source)
    source=replace(r'<meta\s+name="description"\s+content=".*?"\s*/?>',f'<meta name="description" content="{page["meta_description"]}">',source)
    main_html=group_home_project_copy(page['main_html']) if page['file_name']=='index.html' else page['main_html']
    if name=='project-1.html':
        main_html=main_html.replace('<p class="copy">由元捷建設整合開發，串聯實施者、建築設計與都市更新顧問的專業，共同推動士東路街廓更新。</p>','')
        main_html=main_html.replace('<div class="rule"></div><h2>承載天母底蘊','<h2>承載天母底蘊')
    if re.fullmatch(r'project-\d+\.html',name):
        main_html=remove_old_feature_tagline(move_signing_note_to_specs(main_html))
    if page['file_name'] in ('urban.html','renewal.html'): main_html=format_case_card_facts(main_html)
    source=replace(r'<main\b.*?</main>',canonicalize_links(main_html),source)
    links=[]
    for item in navigation:
        if not item['is_visible']: continue
        current=' aria-current="page"' if item['href']==page['file_name'] else ''
        subtitle=f"<span>{html.escape(item['subtitle'])}</span>" if item['subtitle'] else ''
        links.append(f'<a href="{html.escape(item["href"],quote=True)}"{current}>{html.escape(item["label"])}{subtitle}</a>')
    source=replace(r'<nav\s+aria-label="主要導覽">.*?</nav>','<nav aria-label="主要導覽">'+''.join(links)+'</nav>',source)
    path.write_text(canonicalize_links(source),encoding='utf-8')
for listing,category in [('urban.html','urban'),('renewal.html','renewal')]:
    path=DIST/listing
    if path.is_file():
        content=reorder_case_cards(path.read_text(encoding='utf-8'),category,pages)
        if category=='urban':content=mark_selecting_implementer(content,pages)
        content=sync_case_card_notes(content,pages)
        path.write_text(content,encoding='utf-8')
published_project_files={canonical_file(page['file_name']) for page in pages if re.fullmatch(r'project-\d+\.html',canonical_file(page['file_name']))}
for path in DIST.glob('project-*.html'):
    if path.name in published_project_files: continue
    source=path.read_text(encoding='utf-8')
    source=replace(r'<title>.*?</title>','<title>個案尚未上線｜元捷建設</title>',source)
    source=replace(r'<main\b.*?</main>','<main><section class="container page-head"><p class="eyebrow">PROJECT</p><h1 class="page-title">個案尚未上線</h1><p class="lead">請從個案列表選擇目前展示的建案。</p><a href="urban.html">查看進行個案</a></section></main>',source)
    path.write_text(source,encoding='utf-8')
for old,new in PROJECT_ALIASES.items():
    if '?' in old: continue
    destination=html.escape(new,quote=True)
    (DIST/old).write_text(f'<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url={destination}"><link rel="canonical" href="https://lijie5867.com/{destination}"><title>頁面已移動｜元捷建設</title><script>location.replace({json.dumps(new)}+location.hash)</script></head><body><a href="{destination}">前往個案詳情頁</a></body></html>',encoding='utf-8')
print(f'Refreshed {len(pages)} pages and {len(navigation)} navigation items from Supabase.')

