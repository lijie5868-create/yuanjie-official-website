"""2026-10-30 update 1: branding, editable typography, team and project journals."""
from pathlib import Path
import re, html, json, shutil

# Central, repeatable content overrides (also applied after an optional source re-import).
base=Path('/workspace/sites/yuanjie')
data=json.loads((base/'projects.json').read_text())
blank_slugs={'project-14','project-15','project-16','project-17','project-18','project-19','project-20'}

brand='''<a class="brand brand-lockup" href="index.html" aria-label="元捷建設股份有限公司 首頁"><img src="assets/yuanjie-logo-transparent.png" alt="元捷建設標誌" width="62" height="62"><span class="brand-lines"><strong>元捷建設股份有限公司</strong><small>黃昶捷建築師事務所</small></span></a>'''
footer_new='''<footer class="contact-footer"><div class="footer-contact-grid"><div class="footer-line"><img src="assets/line-assessment-qr.png" alt="元捷建設 LINE 聯繫 QR Code" width="160" height="160" loading="lazy"><p>LINE ID：<strong>27008858</strong></p><span>都更・危老重建免費評估</span></div><div class="footer-details"><h2>元捷建設股份有限公司</h2><p>公司地址：台北市大安區敦化南路二段57號8樓之1</p><p>電話：<a href="tel:0227008858">02-27008858</a><br>傳真：02-27009068</p><p>電子信箱：<a href="mailto:lijie5868@gmail.com">lijie5868@gmail.com</a><br>統一編號：82809059</p></div><div class="footer-nav"><a href="about.html">公司理念</a><a href="team.html">菁英團隊</a><a href="qa.html">問與答</a><a href="#top">回到頁首 ↑</a></div></div><div class="footer-bottom">以地主之心為心，以建築專業創造價值。</div></footer>'''
# Homepage: meaningful statistics and a new featured reconstruction project.
f=root/'index.html';s=f.read_text()
s=s.replace('src="assets/founder.png" alt="元捷危老團隊創辦人於臺北市政府都更記者會"','src="assets/huang-portrait-20261030.png" alt="元捷建設都更危老團隊創辦人黃昶捷建築師"')
s=s.replace('團隊專業交流紀錄','元捷建設 都更危老團隊創辦人 黃昶捷建築師')
stat='''<div class="company-statistics" aria-label="公司個案總銷統計"><p class="stat-intro">公司個案總銷金額合計</p><p class="stat-total"><span>23<small>案</small></span><span>1,002<small>億元</small></span></p><div class="stat-split"><p>都更 <strong>17</strong> 案<br><b>947</b> 億元</p><p>危老 <strong>6</strong> 案<br><b>55</b> 億元</p></div></div>'''
s=s.replace('<h2>以地主之心為心<br>讓家的價值延續</h2>','<h2>以地主之心為心<br>讓家的價值延續</h2>'+stat)
new_portal='''<a class="portal" href="project-10.html"><img src="assets/xinguang-20261030.jpg" alt="新光路危老案夜間建築外觀示意圖" loading="lazy"><div class="eyebrow" style="margin-top:25px">RECONSTRUCTION / 在建工程（危老）</div><h3>新光路危老案 <span>↗</span></h3><p>從基地規劃到建築細節，讓重建的期待逐步實現。<br>基地面積 104 坪 ｜ 規劃 26 戶</p></a>'''
s=re.sub(r'<a class="portal" href="heping.html">.*?</a>',new_portal,s,flags=re.S)
s=s.replace('久太聯合建築師事務所・周泰良建築師</p>','久太聯合建築師事務所・周泰良建築師<br>城宇國際顧問有限公司・謝金棠總經理</p>')
f.write_text(s)

# Team: high-resolution colour portraits; retain biographies and add consultant profile.
f=root/'team.html';s=f.read_text()
s=s.replace('認識與元捷同行的兩位建築師。','認識與元捷同行的建築師與都市更新顧問。')
s=s.replace('src="assets/architects-source.jpg" alt="黃昶捷建築師肖像"','src="assets/huang-portrait-20261030.png" alt="黃昶捷建築師肖像"')
s=s.replace('src="assets/architects-source.jpg" alt="周泰良建築師肖像"','src="assets/chou-portrait-20261030.jpg" alt="周泰良建築師肖像"')
s=s.replace('<a class="team-section-link" href="heping.html">','<a class="team-section-link" href="project-10.html">查看新光路危老案　↗</a><br><a class="team-section-link" href="heping.html">')
hsieh='''<article class="architect-profile" id="hsieh"><div class="portrait hsieh"><img src="assets/hsieh-portrait-20261030.png" alt="城宇國際顧問有限公司謝金棠總經理" loading="lazy"></div><div><div class="eyebrow">HSIEH / URBAN RENEWAL</div><h2>謝金棠<small>總經理</small></h2><p class="architect-office">城宇國際顧問有限公司</p><p class="architect-role">都市更新規劃與整合顧問</p><p class="copy">在雙北地區累積豐富且密集的都市更新實績，從劃定更新單元、擬訂事業概要到成功完工，具備跨階段的規劃與執行經驗。</p><h3>服務項目</h3><ul class="architect-list"><li>都市更新規劃作業</li><li>都市計畫變更</li><li>市地重劃作業</li></ul><a class="text-link" href="chengyu.html">認識城宇・瀏覽都市更新實績　↗</a><br><a class="team-section-link" href="project-2.html#project-meeting">仁愛路案・地主說明會紀錄　↗</a></div></article>'''
s=s.replace('</article></section><section class="team-section">','</article>'+hsieh+'</section><section class="team-section">',1)
partners_new=[('合作建商',['達麗建設事業股份有限公司','台灣金聯資產管理股份有限公司','阿曼開發股份有限公司','三豐建設股份有限公司','馥鴻建設股份有限公司','兆頡建設股份有限公司']),('建築設計',['<a href="#huang">黃昶捷建築師事務所</a>','<a href="#chou">久太聯合建築師事務所</a>']),('信託銀行',['第一商業銀行','玉山商業銀行','瑞興商業銀行']),('建經公司',['僑馥建築經理股份有限公司','安信建築經理股份有限公司','東亞建築經理股份有限公司']),('估價師',['禾仲不動產估價師事務所']),('全案管理',['元捷建設股份有限公司']),('結構／土木技師',['彭書偉結構技師事務所']),('都更公司',['<a href="#hsieh">城宇國際顧問有限公司</a>']),('營造廠商',['精工工程股份有限公司','樹盛營造股份有限公司','彩城營造股份有限公司'])]
network_new='<div class="network">'+''.join('<article><div class="eyebrow">'+str(i).zfill(2)+'</div><h3>'+title+'</h3><p>'+'<br>'.join(names)+'</p></article>' for i,(title,names) in enumerate(partners_new,1))+'</div>'
s=re.sub(r'<div class="network">.*?</div><p class="note">',network_new+'<p class="note">',s,flags=re.S)
s=s.replace('黃昶捷與程景茂獲臺北市政府表揚','黃昶捷建築師獲臺北市政府表揚')
# User explicitly rejected the restored flag/event photographs. Do not publish them.
s=re.sub(r'<div class="honors-grid">.*?</div></section>','</section>',s,flags=re.S)
f.write_text(s)

# Chengyu overview: all explanations and experience lists are editable HTML.
unit_records=[('中山區','北安段三小段214-1','40'),('中山區','北安段一小段60-1','10'),('中山區','中山段一小段804','18'),('中山區','中山段二小段452','10'),('中山區','吉林段四小段705-3','14'),('大同區','雙連段二小段83-1','73'),('萬華區','福星段四小段551','38'),('萬華區','福星段四小段491','33'),('萬華區','龍山段一小段922','9'),('萬華區','華江段二小段531','12'),('大安區','瑞安段二小段386','12'),('北投區','振興段四小段635','23'),('文山區','興豐段三小段1-35','20'),('信義區','吳興段二小段776-1','15')]
summary_records=[('中山區','北安段二小段376','27'),('中山區','北安段三小段214-1','40'),('中山區','北安段一小段604','19'),('中山區','中山段一小段218','17'),('中山區','圓山段一小段387','11'),('中山區','中山段二小段452','10'),('大同區','雙連段二小段83-1','73'),('大同區','延平段一小段314','36'),('大同區','大龍段一小段301-1','35'),('大同區','大龍段一小段543','19'),('大同區','迪化段一小段353','61'),('士林區','蘭雅段二小段20','13'),('信義區','犁和段一小段125','34')]
def record_table(records):
 return '<div class="experience-table"><table><thead><tr><th>行政區</th><th>基地地號</th><th>土地筆數</th></tr></thead><tbody>'+''.join(f'<tr><td>臺北市{district}</td><td>{lot}地號等</td><td>{count}筆</td></tr>' for district,lot,count in records)+'</tbody></table></div>'
body=heading('TEAM / CHENG YU','城宇國際顧問有限公司','謝金棠總經理｜都市更新・都市計畫・市地重劃')
body+='''<section class="wrap"><div class="eyebrow">EXPERIENCE / 雙北都市更新實績</div><h2>從更新單元，到新生活的實現</h2><p class="lead">在雙北地區擁有豐富且密集的都市更新實績，從劃定更新單元、擬訂事業概要到成功完工等多個階段皆有深厚涉獵。</p><div class="service-grid"><article><span>01</span><h3>都市更新規劃作業</h3></article><article><span>02</span><h3>都市計畫變更</h3></article><article><span>03</span><h3>市地重劃作業</h3></article></div></section>'''
body+='<section class="team-section"><div class="wrap"><h2>台北・新北都市更新實績</h2><p class="copy">規劃經驗涵蓋更新事業計畫、權利變換計畫與都市計畫變更，並延伸至施工、完工、登記與交屋階段。</p><button class="portfolio-zoom" data-lightbox="assets/chengyu-projects.jpg" aria-label="放大城宇雙北都市更新實績"><img src="assets/chengyu-projects.jpg" alt="城宇雙北都市更新實績彙整" loading="lazy"></button><p class="photo-note">城宇提供之實績資料，圖中進度為資料製作時之狀態。</p></div></section>'
body+='<section class="wrap"><h2>劃定更新單元</h2><p class="copy">都市更新前期規劃與更新範圍評估經驗。</p>'+record_table(unit_records)+'</section><section class="wrap"><h2>擬訂事業概要</h2><p class="copy">從基地條件與整合需求出發，推進都市更新規劃。</p>'+record_table(summary_records)+'</section>'
body+='<section class="wrap"><p class="note">以上為城宇國際顧問有限公司提供之實績，非全部為元捷建設開發案件。</p><a class="text-link" href="team.html#hsieh">← 返回菁英團隊</a></section>'
page('chengyu.html','城宇國際顧問有限公司',body)

# Renai meeting: four matching landscape thumbnails, full original images in lightbox.
f=root/'project-2.html';s=f.read_text()
photos=[('renai-process.jpg','都市更新流程說明','城宇國際顧問謝金棠總經理，向住戶說明都市更新流程與基地規劃。'),('renai-dali-1.jpg','合作規劃與住戶交流','達麗建設團隊與住戶交流，說明合作規劃並回應關心的議題。'),('renai-dali-2.jpg','建設團隊介紹','達麗建設介紹團隊背景與都市更新合作方向。'),('renai-dali-3.jpg','建案規劃說明','達麗建設就仁愛路案進行簡報，協助住戶了解規劃內容。')]
meeting='<section class="wrap" id="project-meeting"><div class="eyebrow">PROJECT JOURNAL / 地主說明會</div><h2>充分說明，讓每一份期待被理解</h2><p class="copy">透過顧問與建設團隊的現場說明，協助住戶了解更新流程、合作方向與基地規劃。</p><div class="meeting-gallery">'
for src,title,desc in photos:
 meeting+=f'<figure><button data-lightbox="assets/{src}" aria-label="放大{title}"><img src="assets/{src}" alt="{desc}" loading="lazy"></button><figcaption><h3>{title}</h3><p>{desc}</p></figcaption></figure>'
meeting+='</div></section>'
s=s.replace('<section class="wrap case-bottom">',meeting+'<section class="wrap case-bottom">');f.write_text(s)

# Shared navigation, footer, dates, and typography. Change text nodes rather than URLs/scripts.
current_nav='<nav aria-label="主要導覽"><a href="about.html">公司理念</a><a href="team.html">菁英團隊</a><a href="urban.html">進行個案<span>（都更）</span></a><a href="renewal.html">在建工程<span>（危老）</span></a><a href="qa.html">Ｑ＆Ａ</a></nav>'
def western_dates(t):
 t=re.sub(r'民國(\d{2,3})年',lambda m:str(int(m[1])+1911)+'年',t)
 t=re.sub(r'(?<!\d)(77|99|101|102|106|107|112|113|114|115)(?=年度|年)',lambda m:str(int(m[1])+1911),t)
 # In a paired ROC year expression, the first year does not carry 年.
 t=t.replace('101年、106年','2012年、2017年')
 return t
lightbox='''<dialog class="gallery-dialog" aria-label="照片放大"><button class="gallery-close" aria-label="關閉照片">×</button><img alt=""><p class="gallery-caption"></p></dialog><script>(()=>{const d=document.querySelector('.gallery-dialog');let opener;document.querySelectorAll('[data-lightbox]').forEach(b=>b.addEventListener('click',()=>{opener=b;const im=b.querySelector('img');d.querySelector('img').src=b.dataset.lightbox;d.querySelector('img').alt=im?.alt||'';d.querySelector('.gallery-caption').textContent=im?.alt||'';d.showModal()}));d.querySelector('button').onclick=()=>d.close();d.onclick=e=>{if(e.target===d)d.close()};d.addEventListener('close',()=>opener?.focus());})();</script>'''
for f in root.glob('*.html'):
 s=f.read_text()
 s=re.sub(r'<header>.*?</header>','<header>'+brand+current_nav+'</header>',s,flags=re.S)
 s=re.sub(r'<footer.*?</footer>',footer_new,s,flags=re.S)
 s=re.sub(r'YUAN\s+JIE\s+DEVELOPMENT','',s,flags=re.I)
 s=s.replace('進行中個案','進行個案')
 s=s.replace('查看全部16件都更案','查看全部都更個案').replace('都市更新 · 16案','都市更新個案')
 s=s.replace('實施者尚未確定；下列實施者為洽談資料，非已確定合作。','')
 s=re.sub(r'>([^<>]+)<',lambda m:'>'+western_dates(m[1])+'<',s)
 # Also update ARIA descriptions containing calendar dates.
 s=re.sub(r'(alt|aria-label)="([^"]*)"',lambda m:m[1]+'="'+western_dates(m[2])+'"',s)
 if 'data-lightbox=' in s:s=s.replace('</body>',lightbox+'</body>')
 s=s.replace('<link rel="stylesheet" href="style.css">','<link rel="preload" href="assets/fonts/noto-serif-tc-400.woff" as="font" type="font/woff" crossorigin><link rel="stylesheet" href="style.css">')
 f.write_text(s)
with (root/'style.css').open('a') as f:f.write((base/'update_20261030.css').read_text())
print('Applied 2026-10-30 revision: branding, team, meetings, dates and contact footer')
