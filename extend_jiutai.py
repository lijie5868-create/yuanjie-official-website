from pathlib import Path
import shutil
assets={'logo':'1793252382232.jpg','urban':'1793252459481.jpg','factory':'1793252467276.jpg','awards':'1793252486222.jpg','bade-exterior':'1793252442042.jpg','bade-detail':'1793252450359.jpg'}
for slug,src in assets.items():
 target=root/'assets'/('jiutai-'+slug+'.jpg')
 if not target.exists():shutil.copy(Path('/workspace/scratch/4b485672085c/upload')/src,target)
intro='''<section class="wrap jta-intro"><div><div class="eyebrow">JTA / ARCHITECTS-ASSOCIATES</div><h2>久太聯合建築師事務所</h2><p class="lead">從建築規劃到生活細節，讓設計回應基地與使用者的需求。</p><p class="copy">由周泰良主持建築師的建照、施工管理及建築設計經驗出發，久太的作品涵蓋集合住宅、都市更新、旅館與廠辦。透過不同尺度與使用需求的規劃，呈現團隊對建築外觀、入口空間與整體環境的思考。</p><p class="copy">在元捷的合作案件中，久太參與多件都市更新與危老重建案的建築設計，從基地條件與住宅需求出發，規劃建築量體、空間配置及使用機能。</p><a class="text-link" href="team.html#chou">認識周泰良主持建築師　↗</a></div><figure class="jta-logo"><img src="assets/jiutai-logo.jpg" alt="JTA 久太聯合建築師事務所標誌"></figure></section>'''
works=[('awards','集合住宅・得獎作品','RESIDENTIAL / AWARDS','沅祥・泰晤士、亞昕首藏、耕薪・永吉路住宅。作品資料分別列有102年度金質獎、99年度金質獎及99年度金石獎。'),('urban','都市更新與旅館作品','URBAN RENEWAL / HOSPITALITY','台大汀州路旅館案、耕薪雙城街都市更新、瑞安街都市更新、士林三玉段都市更新。'),('bade-exterior','八德路集合住宅・建築外觀','RESIDENTIAL / BADE ROAD','以建築立面、量體比例與多角度透視，呈現集合住宅的設計構想。'),('bade-detail','八德路集合住宅・入口細節','RESIDENTIAL / SPACE & DETAIL','從入口、門廳到街道尺度，觀察建築與日常生活銜接的空間細節。'),('factory','新生五金・內湖廠辦','WORKPLACE / NEIHU','位於內湖瑞湖街的廠辦作品，展示建築外觀實景與基地周邊環境。')]
body=heading('TEAM / JTA ARCHITECTS','久太聯合建築師事務所','主持建築師 周泰良｜住宅・都市更新・旅館・廠辦')+intro
body+='<div class="jta-tabs wrap">'+''.join('<a href="#'+k+'">'+t.split('・')[0]+'</a>' for k,t,_,__ in works if k!='bade-detail')+'</div>'
for i,(key,title,kicker,desc) in enumerate(works):
 body+='<section class="'+('team-section' if i%2==0 else '')+'"><div class="wrap jta-work" id="'+key+'"><div class="eyebrow">'+kicker+'</div><h2>'+title+'</h2><p class="copy">'+desc+'</p><button class="jta-zoom" aria-label="放大'+title+'"><img loading="lazy" src="assets/jiutai-'+key+'.jpg" alt="'+title+'作品資料"></button><p class="photo-note">久太聯合建築師事務所作品資料｜點擊圖片可放大閱覽</p></div></section>'
body+='<section class="wrap"><p class="note">本頁展示久太聯合建築師事務所作品；非全部為元捷建設開發案件。作品名稱及得獎資訊依提供資料呈現，圖中建築透視圖為設計示意。</p><a class="text-link" href="team.html">← 返回菁英團隊</a></section>'
js='''<dialog class="case-dialog" aria-label="久太作品放大"><button aria-label="關閉作品圖片">×</button><img alt="久太建築作品資料放大"></dialog><script>const d=document.querySelector('dialog');document.querySelectorAll('.jta-zoom').forEach(b=>b.onclick=()=>{d.querySelector('img').src=b.querySelector('img').src;d.showModal()});d.querySelector('button').onclick=()=>d.close();d.onclick=e=>{if(e.target===d)d.close()};</script>'''
page('jiutai.html','久太聯合建築師事務所',body,js)
p=root/'jiutai.html';s=p.read_text();s=s.replace('href="shidong.html">進行中個案','href="urban.html">進行中個案').replace('href="heping.html">在建工程','href="renewal.html">在建工程');s=s.replace('<a href="urban.html">進行中個案','<a href="team.html">菁英團隊</a><a href="urban.html">進行中個案');p.write_text(s)
p=root/'team.html';s=p.read_text();s=s.replace('<a class="team-section-link" href="heping.html">','<a class="text-link" href="jiutai.html">認識久太・瀏覽建築作品　↗</a><br><a class="team-section-link" href="heping.html">');p.write_text(s)
with (root/'style.css').open('a') as f:f.write('''
.jta-intro{display:grid;grid-template-columns:1.5fr 1fr;gap:70px;align-items:center}.jta-intro h2,.jta-work h2{font:400 clamp(24px,3vw,36px)/1.6 serif;letter-spacing:2px}.jta-logo img{width:100%;height:auto}.jta-tabs{display:flex;flex-wrap:wrap;gap:25px;padding-top:0;padding-bottom:35px}.jta-tabs a{border-bottom:1px solid var(--gold);padding:12px 0;font-size:14px}.jta-work{scroll-margin-top:110px}.jta-work .copy{max-width:800px;margin-bottom:35px}.jta-zoom{display:block;border:0;padding:0;width:100%;cursor:zoom-in;background:white}.jta-zoom img{display:block;width:100%;height:auto}.jta-logo{background:white;padding:15px}@media(max-width:700px){.jta-intro{grid-template-columns:1fr;gap:25px}.jta-logo{max-width:320px}.jta-tabs{gap:18px}}
''')
print('Added JTA introduction and five portfolio boards')
