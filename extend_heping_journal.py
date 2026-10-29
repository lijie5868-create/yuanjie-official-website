from pathlib import Path
import shutil
asset=root/'assets/heping-groundbreaking-20250720.jpg'
if not asset.exists():shutil.copy('/workspace/scratch/4b485672085c/upload/IMG_E1780.JPG',asset)
p=root/'heping.html';s=p.read_text()
s=s.replace('<h2>攜手動土，迎向家的新篇章</h2>','<h2>攜手動土，迎向家的新篇章</h2><p class="lead"><time datetime="2025-07-20">114年7月20日</time>｜開工動土</p>')
s=s.replace('<div class="heping-gallery">','<div class="heping-gallery"><button data-image="assets/heping-groundbreaking-20250720.jpg" aria-label="放大114年7月20日和平東路案開工動土照片"><img src="assets/heping-groundbreaking-20250720.jpg" alt="114年7月20日和平東路危老重建案開工動土，地主與團隊共同持鏟祈福" loading="lazy"></button>')
s=s.replace('和平東路危老案｜動土典禮紀錄','和平東路危老案｜114年7月20日開工動土紀錄')
s=s.replace('document.querySelector("[data-image]").onclick=e=>{d.querySelector("img").src="assets/ceremony.jpg";d.showModal()}', 'document.querySelectorAll("[data-image]").forEach(b=>b.onclick=()=>{d.querySelector("img").src=b.dataset.image;d.showModal()})')
p.write_text(s)
assert s.count('heping-groundbreaking-20250720.jpg')==2
assert 'datetime="2025-07-20"' in s
print('Verified Heping milestone, new photograph, and gallery image targets')
