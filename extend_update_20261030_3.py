from pathlib import Path
import json,re
from PIL import Image
base=Path('/workspace/sites/yuanjie');root=base/'dist'
locations={'shidong':'士林區','project-2':'大安區','project-3':'中山區','project-4':'松山區','project-5':'中正區','project-6':'中正區','project-xinguang-urban':'文山區','project-wuxing':'信義區','project-14':'松山區','project-15':'大安區','project-16':'大安區','project-17':'中正區','project-18':'中正區','project-19':'中山區','project-20':'萬華區','project-8':'大安區','project-9':'中正區','project-10':'文山區','project-12':'中正區'}
(base/'project-districts.json').write_text(json.dumps(locations,ensure_ascii=False,indent=2))
def location(slug):return '臺北市'+locations[slug] if slug in locations else '臺北市｜行政區待確認'
for p in projects:
 f=root/(p['slug']+'.html');s=f.read_text();loc=location(p['slug'])
 s=re.sub(r'(<h1\b[^>]*>.*?</h1>)',lambda m:m[1]+'<p class="project-location">'+loc+'</p>',s,count=1,flags=re.S)
 if '<dl class="specs">' in s:s=s.replace('<dl class="specs">','<dl class="specs"><div><dt>所在地區</dt><dd>'+loc+'</dd></div>',1)
 f.write_text(s)
for kind in ['urban','renewal']:
 f=root/(kind+'.html');s=f.read_text()
 # Remove the shared-looking category switch; navigation keeps the two independent pages.
 s=re.sub(r'<div class="case-switch">.*?</div>','',s,flags=re.S)
 def annotate(m):
  card=m[0];slug=re.search(r'href="([^"]+)\.html"',card)[1]
  return card.replace('</h2>','</h2><p class="project-location">'+location(slug)+'</p>',1)
 s=re.sub(r'<a class="case-card".*?</a>',annotate,s,flags=re.S);f.write_text(s)
f=root/'index.html';s=f.read_text()
portals=re.findall(r'<a class="portal".*?</a>',s,re.S)
assert len(portals)==2
sections=''
for i,(kind,title,slug) in enumerate([('urban','進行個案（都更）','shidong'),('renewal','在建工程（危老）','project-10')]):
 card=portals[i];card=card.replace('</h3>','</h3><p class="project-location">'+location(slug)+'</p>')
 label='看都更進行個案' if kind=='urban' else '看危老在建工程'
 sections+='<section class="home-project-category '+kind+'"><div class="wrap"><h2>'+title+'</h2><div class="category-feature">'+card+'<div class="category-intro"><p>'+('以專業整合，推進都市更新。' if kind=='urban' else '全案管理，陪伴地主安心重建。')+'</p><a class="category-button" href="'+kind+'.html">'+label+'</a></div></div></div></section>'
s=re.sub(r'<section class="team-section"><div class="wrap"><div class="section-head">.*?</section>',sections,s,count=1,flags=re.S);f.write_text(s)
# Respect the original asset dimensions in editorial photographs and project renders.
for f in root.glob('*.html'):
 s=f.read_text()
 def cap(m):
  tag=m[0];src=re.search('src="([^"]+)"',tag)
  if not src:return tag
  asset=root/src[1]
  if not asset.exists():return tag
  w,h=Image.open(asset).size
  return tag[:-1]+f' data-original-width="{w}" data-original-height="{h}">'
 s=re.sub(r'<img\b[^>]*>',cap,s)
 f.write_text(s)
with (root/'style.css').open('a') as f:f.write((base/'update_20261030_3.css').read_text())
print('Applied 70% content width, separate homepage categories, 19 verified districts and original-size image limits')
