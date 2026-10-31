#!/usr/bin/env python3
"""Refresh published content from Supabase while preserving existing templates."""
import html,json,os,re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[1]; DIST=ROOT/'dist'
URL=os.environ.get('SUPABASE_URL','').rstrip('/'); KEY=os.environ.get('SUPABASE_PUBLISHABLE_KEY','')
def fetch(table, order='sort_order.asc'):
    req=Request(f'{URL}/rest/v1/{table}?'+urlencode({'select':'*','order':order}),headers={'apikey':KEY,'Authorization':f'Bearer {KEY}'})
    with urlopen(req,timeout=30) as response: return json.load(response)
def replace(pattern,replacement,source): return re.sub(pattern,lambda _:replacement,source,count=1,flags=re.I|re.S)
if not URL or not KEY:
    print('Supabase variables not configured; keeping checked-in published site unchanged.'); raise SystemExit(0)
pages=fetch('published_pages')
navigation=fetch('published_navigation','nav_order.asc')
for page in pages:
    path=DIST/page['file_name']; template=path if path.exists() else DIST/'index.html'
    source=template.read_text(encoding='utf-8')
    source=replace(r'<title>.*?</title>',f"<title>{page['title']}</title>",source)
    source=replace(r'<meta\s+name="description"\s+content=".*?"\s*/?>',f'<meta name="description" content="{page["meta_description"]}">',source)
    source=replace(r'<main\b.*?</main>',page['main_html'],source)
    links=[]
    for item in navigation:
        if not item['is_visible']: continue
        current=' aria-current="page"' if item['href']==page['file_name'] else ''
        subtitle=f"<span>{html.escape(item['subtitle'])}</span>" if item['subtitle'] else ''
        links.append(f'<a href="{html.escape(item["href"],quote=True)}"{current}>{html.escape(item["label"])}{subtitle}</a>')
    source=replace(r'<nav\s+aria-label="主要導覽">.*?</nav>','<nav aria-label="主要導覽">'+''.join(links)+'</nav>',source)
    path.write_text(source,encoding='utf-8')
print(f'Refreshed {len(pages)} pages and {len(navigation)} navigation items from Supabase.')

