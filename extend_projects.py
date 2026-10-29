projects=json.loads(Path('/workspace/sites/yuanjie/projects.json').read_text())
E=html.escape
caption='外觀示意草圖　非實際送審圖'
def note(p):
 if '尚未確定' in p['status']:return '實施者尚未確定；下列實施者為洽談資料，非已確定合作。'
 if p['status']:return '自主更新會成立後再行簽約。'
 return ''
def pic(p):
 return '<img loading="lazy" src="'+p['image']+'" alt="'+E(p['name'])+'外觀示意草圖">' if p['image'] else '<div class="case-placeholder"><span>YUAN JIE</span><p>建築規劃中</p></div>'
def hl(p):return '<section class="wrap"><div class="eyebrow">LIVING / PROJECT HIGHLIGHTS</div><h2>個案特色</h2><ul class="case-highlights">'+''.join('<li>'+E(x.replace('防災行都更','防災型都更'))+'</li>' for x in p['highlights'])+'</ul></section>' if p['highlights'] else ''
for p in projects:
 if p['slug'] in ['shidong','heping']:
  if p['slug']=='shidong':
   f=root/'shidong.html';f.write_text(f.read_text().replace('</main>',hl(p)+'</main>'))
  continue
 specs=p['specs'];amount=specs['總銷售額'];cat='進行中個案（都更）' if p['kind']=='urban' else '在建工程（危老）';listing=p['kind']+'.html'
 body=heading('PROJECT / '+('URBAN RENEWAL' if p['kind']=='urban' else 'RECONSTRUCTION'),p['name'],p['highlights'][0] if p['highlights'] else '全案管理，專業同行。')
 body+='<section class="wrap case-overview"><figure class="case-main">'+pic(p)+('<figcaption class="photo-note">'+caption+' · 點擊圖片可放大</figcaption>' if p['image'] else '')+'</figure><div><div class="eyebrow">PROJECT PROFILE / 個案資料</div><h2>'+E(p['name'])+'</h2><p>預估總銷售額</p><div class="case-amount">'+E(amount)+'</div>'+('<p class="case-status">'+note(p)+'</p>' if note(p) else '')+'<dl class="specs">'+''.join('<div><dt>'+E(k)+'</dt><dd>'+E(v)+'</dd></div>' for k,v in specs.items() if k!='總銷售額')+'</dl></div></section>'+hl(p)
 if p['sketch']:body+='<section class="wrap case-sketch"><div class="eyebrow">ARCHITECTURAL STUDY</div><h2>建築外觀與空間構想</h2><figure><img loading="lazy" src="'+p['sketch']+'" alt="'+E(p['name'])+'素描與鳥瞰示意圖"><figcaption class="photo-note">'+caption+' · 點擊圖片可放大</figcaption></figure></section>'
 body+='<section class="wrap case-bottom"><p class="note">建案規模、預估總銷、獎勵及規劃內容依個案資料整理，實際以核定圖說及相關文件為準。</p><a class="text-link" href="'+listing+'">← 返回'+cat+'</a></section>'
 js='''<dialog class="case-dialog" aria-label="建築示意圖放大"><button aria-label="關閉圖片">×</button><img alt="建築外觀示意草圖放大"></dialog><script>const d=document.querySelector('.case-dialog');document.querySelectorAll('.case-main img,.case-sketch img').forEach(img=>{const b=document.createElement('button');b.className='image-zoom';b.setAttribute('aria-label','放大'+img.alt);img.replaceWith(b);b.append(img);b.onclick=()=>{d.querySelector('img').src=img.src;d.showModal()}});d.querySelector('button').onclick=()=>d.close();d.onclick=e=>{if(e.target===d)d.close()};</script>'''
 page(p['slug']+'.html',p['name'],body,js)
for kind,title in [('urban','進行中個案（都更）'),('renewal','在建工程（危老）')]:
 ps=[p for p in projects if p['kind']==kind]
 cards=''
 for p in ps:
  specs=p['specs'];cards+='<a class="case-card" href="'+p['slug']+'.html">'+pic(p)+'<div class="case-card-copy"><div class="eyebrow">'+('都市更新' if kind=='urban' else '危老重建')+'</div><h2>'+E(p['name'])+' <span>↗</span></h2><p>基地 '+E(specs['基地面積'])+'　｜　'+E(specs['規劃戶數'])+'</p><p>預估總銷 '+E(specs['總銷售額'])+'</p>'+('<small>'+note(p)+'</small>' if note(p) else '')+'</div></a>'
 page(kind+'.html',title,heading('PROJECTS / '+('URBAN RENEWAL' if kind=='urban' else 'RECONSTRUCTION'),title,'用心對待每一塊土地，專業推進每一份期待。')+'<section class="wrap"><div class="case-switch"><a href="urban.html">都市更新 · 16案</a><a href="renewal.html">危老重建 · 6案</a></div><div class="case-grid">'+cards+'</div></section>')
for f in root.glob('*.html'):
 s=f.read_text();s=re.sub(r'<nav aria-label="主要導覽">.*?</nav>', '<nav aria-label="主要導覽"><a href="about.html">公司理念</a><a href="team.html">菁英團隊</a><a href="urban.html">進行中個案<span>（都更）</span></a><a href="renewal.html">在建工程<span>（危老）</span></a><a href="qa.html">Q&amp;A</a></nav>',s,flags=re.S)
 if f.name=='index.html':s=s.replace('</div></div></section>\n<section class="wrap team-home">','<div class="case-switch"><a href="urban.html">查看全部16件都更案　↗</a><a href="renewal.html">查看全部6件危老案　↗</a></div></div></div></section>\n<section class="wrap team-home">')
 if f.name in ['shidong.html','heping.html']:
  link='urban.html' if f.name=='shidong.html' else 'renewal.html'
  s=s.replace('</main>','<div class="wrap case-bottom"><a class="text-link" href="'+link+'">← 返回個案列表</a></div></main>')
 f.write_text(s)
with (root/'style.css').open('a') as f:f.write('''
.case-switch{display:flex;gap:28px;flex-wrap:wrap;margin:0 0 40px}.case-switch a{padding:14px 0;border-bottom:1px solid var(--gold);font-size:15px}.case-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:48px 28px}.case-card{border-bottom:1px solid var(--line);display:block}.case-card>img,.case-placeholder{width:100%;height:355px;object-fit:contain;background:#e6e9e5}.case-card-copy{padding:25px 0}.case-card h2{font:400 22px/1.6 serif;letter-spacing:1px;margin:10px 0}.case-card h2 span{color:var(--gold)}.case-card p{font-size:14px;color:#677269;line-height:1.9;margin:5px 0}.case-card small{display:block;line-height:1.9;color:#7d6b51;margin-top:12px}.case-card:hover h2{color:#968266}.case-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#e6e8df,#d4dcd6);color:#617264}.case-placeholder span{letter-spacing:7px;font:25px Georgia}.case-overview{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:start}.case-main img{width:100%;max-height:850px;object-fit:contain}.case-amount{font:48px/1.5 Georgia,serif;color:#8c7048;margin-bottom:25px}.case-status{line-height:1.9;color:#806d51}.case-overview .specs{width:100%}.case-highlights{padding-left:22px;line-height:2.3;max-width:900px;font-size:17px}.case-highlights li{padding:8px 0}.case-sketch img{width:100%;height:auto}.image-zoom{padding:0;border:0;background:transparent;width:100%;cursor:zoom-in}.case-dialog{max-width:95vw;max-height:94vh;padding:45px 12px 12px;background:#f4f2ed}.case-dialog img{max-height:80vh;max-width:90vw;object-fit:contain}.case-bottom{padding-top:20px}.case-dialog::backdrop{background:#18251fdd}@media(max-width:950px){.case-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.case-overview{gap:35px}}@media(max-width:600px){.case-grid{grid-template-columns:1fr}.case-overview{grid-template-columns:1fr}.case-card>img{height:400px}.case-main img{max-height:600px}.case-highlights{font-size:15px}.case-switch{gap:18px}.case-overview h2{font-size:26px}}
''')
print('Added 22 project records, two listings and 20 detail pages')
