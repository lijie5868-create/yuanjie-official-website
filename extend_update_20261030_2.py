from pathlib import Path
import re, shutil
base=Path('/workspace/sites/yuanjie'); root=base/'dist'; upload=Path('/workspace/scratch/4b485672085c/upload')
for src,dest in [('黃昶捷2.jpg','huang-seated-original.jpg'),('臺北市政府表揚記者會1.jpg','taipei-press-1.jpg'),('臺北市政府表揚記者會2.jpg','taipei-press-2.jpg')]:
 shutil.copyfile(upload/src,root/'assets'/dest)
p=root/'index.html';s=p.read_text()
s=s.replace('assets/huang-portrait-20261030.png','assets/huang-seated-original.jpg')
s=s.replace('<h2>以地主之心為心<br>讓家的價值延續</h2>','')
s=s.replace('<section class="wrap founder" id="founder">','<section class="wrap founder" id="founder"><h2 class="founder-heading">以地主之心為心，讓家的價值延續</h2>')
s=re.sub(r'<p class="copy">黃昶捷建築師事務所.*?</p>','',s,flags=re.S)
cooperation='''<section class="wrap cooperation"><article><div class="eyebrow">DEVELOPMENT PARTNERS</div><h2>建設同業｜攜手合作，共創價值</h2><p>本公司掌握多件<strong>整合率達 80% 以上</strong>的精選開發案件，誠摯邀請具備開發實力的建設公司，洽談開發、合建等多元合作模式，結合雙方優勢，加速推動開發進程。</p></article><article><div class="eyebrow">LANDOWNER PARTNERS</div><h2>地主夥伴｜專業整合，安心重建</h2><p>本公司深耕危老重建，專精於<strong>全體地主 100% 同意案件的全案管理</strong>，從前期規劃、融資協助到興建管理，提供一站式專業服務，陪伴地主穩健推進重建，提升居住品質與資產價值。</p></article></section>'''
s=s.replace('<section class="dark-band">',cooperation+'<section class="dark-band">');p.write_text(s)
p=root/'team.html';s=p.read_text()
press='''<p class="copy press-description">感謝臺北市政府給予元捷建設股份有限公司的支持與肯定。照片中，臺北市政府都市發展局黃景茂局長及各一級主管，與元捷建設股份有限公司共同出席記者會，面對媒體說明危老重建推動成果。透過各大媒體報導，表揚並向市民介紹績優危老推動師黃昶捷建築師。</p><div class="press-gallery"><figure><button data-lightbox="assets/taipei-press-1.jpg" aria-label="放大臺北市政府表揚合影"><img src="assets/taipei-press-1.jpg" alt="臺北市政府表揚記者會合影" loading="lazy"></button><figcaption>臺北市政府表揚記者會・現場合影</figcaption></figure><figure><button data-lightbox="assets/taipei-press-2.jpg" aria-label="放大臺北市政府記者會現場"><img src="assets/taipei-press-2.jpg" alt="臺北市政府都市發展局與元捷建設共同出席記者會" loading="lazy"></button><figcaption>臺北市政府表揚記者會・媒體交流</figcaption></figure></div>'''
s=re.sub(r'<p class="copy">2019年11月29日.*?</p>',press,s)
s=s.replace('</body>',lightbox+'</body>')
p.write_text(s)
# Reuse the same accessible contact dialog on every page.
contact2=contact.replace('建設、整合<br>都更危老重建免費評估','建商都更<br>地主重建<br>請洽')
for p in root.glob('*.html'):
 s=p.read_text().replace('↗','').replace('查看全部都更個案','看都更進行個案').replace('查看全部6件危老案','看危老在建工程')
 s=re.sub(r'(<h[12][^>]*>)(.*?)(</h[12]>)',lambda m:m[1]+re.sub(r'<br\s*/?>','　',m[2])+m[3],s,flags=re.S)
 s=s.replace('<img src="assets/yuanjie-logo-transparent.png" alt="元捷建設標誌" width="62" height="62">','<span class="brand-mark" role="img" aria-label="元捷建設標誌"></span>')
 if 'id="assessment-dialog"' in s:s=s.replace('建設、整合<br>都更危老重建免費評估','建商都更<br>地主重建<br>請洽')
 else:s=s.replace('</body>',contact2+'</body>')
 p.write_text(s)
# Replace legacy colours consistently, retaining image colours.
css=(root/'style.css').read_text()
for old,new in {'#f4f2ed':'#F4F5F6','#283831':'#1A1D20','#968266':'#C5A880','#e9e8df':'#2C3539','#59655c':'#525B61','#6a726b':'#525B61','#72786f':'#525B61','#7f0020':'#4A6984'}.items():css=css.replace(old,new)
(root/'style.css').write_text(css+'\n'+(base/'update_20261030_2.css').read_text())
print('Applied revision 2: full-width layout, slate/gold palette, original press photos and site-wide assessment dialog')
