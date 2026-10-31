#!/usr/bin/env python3
"""Extract the checked-in public site into an idempotent Supabase seed migration."""
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]; DIST=ROOT/'dist'
OUTPUT=ROOT/'supabase/migrations/202610310002_seed_existing_site.sql'
def match(pattern, source, default=''):
    found=re.search(pattern,source,re.I|re.S)
    return found.group(1).strip() if found else default
def sql(value): return '$cms$'+value.replace('$cms$','$ cms $')+'$cms$'
rows=[]
for order,path in enumerate(sorted(DIST.glob('*.html'))):
    if path.name=='404.html': continue
    source=path.read_text(encoding='utf-8')
    title=match(r'<title>(.*?)</title>',source,path.stem)
    description=match(r'<meta\s+name="description"\s+content="(.*?)"',source)
    main=match(r'(<main\b.*?</main>)',source)
    if not main: raise RuntimeError(f'No <main> found in {path}')
    slug='home' if path.name=='index.html' else path.stem
    rows.append('  ('+', '.join([sql(slug),sql(path.name),sql(title),sql(description),sql(main),str(order)])+')')
header='''-- Generated from the existing live website.\ninsert into public.cms_pages (slug,file_name,title,meta_description,main_html,sort_order)\nvalues\n'''
upsert='''\non conflict (slug) do update set file_name=excluded.file_name,title=excluded.title,meta_description=excluded.meta_description,main_html=excluded.main_html,sort_order=excluded.sort_order,updated_at=now();
insert into public.published_pages (slug,file_name,title,meta_description,main_html,sort_order)
select slug,file_name,title,meta_description,main_html,sort_order from public.cms_pages
on conflict (slug) do update set file_name=excluded.file_name,title=excluded.title,meta_description=excluded.meta_description,main_html=excluded.main_html,sort_order=excluded.sort_order,published_at=now();
'''
OUTPUT.write_text(header+',\n'.join(rows)+upsert,encoding='utf-8')
print(f'Wrote {len(rows)} pages to {OUTPUT}')

