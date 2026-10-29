from pathlib import Path

p = root / 'project-9.html'
s = p.read_text()
records = [
    ('taian-memories-20241104.jpg', '舊屋拆除前留念', '113年11月4日', '2024-11-04', '泰安街七號、九號舊屋外觀與住戶合照'),
    ('taian-groundbreaking-20240622.jpg', '開工動土典禮', '113年6月22日', '2024-06-22', '泰安街七號、九號開工動土典禮合照'),
    ('taian-diaphragm-wall-20241029.jpg', '連續壁灌漿', '113年10月29日', '2024-10-29', '泰安街工程紀錄：工作人員進行鋼筋焊接'),
]
gallery = '<section class="wrap case-journal"><div class="eyebrow">PROJECT JOURNAL / 工程紀錄</div><h2>記錄家的記憶與重建歷程</h2><p class="photo-note">點擊照片可放大瀏覽</p><div class="taian-journal-grid">'
for asset, title, date, iso, alt in records:
    gallery += f'<figure><img src="assets/{asset}" alt="{alt}" loading="lazy"><figcaption><h3>{title}</h3><time datetime="{iso}">{date}</time></figcaption></figure>'
gallery += '</div></section>'
anchor = '<section class="wrap case-bottom">'
assert s.count(anchor) == 1
s = s.replace(anchor, gallery + anchor)
s = s.replace('.case-main img,.case-sketch img', '.case-main img,.case-sketch img,.case-journal img')
s = s.replace('aria-label="建築示意圖放大"', 'aria-label="建案圖片放大"')
s = s.replace("d.querySelector('img').src=img.src;d.showModal()", "d.querySelector('img').src=img.src;d.querySelector('img').alt=img.alt;d.showModal()")
p.write_text(s)
with (root / 'style.css').open('a') as css:
    css.write('''
.taian-journal-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px 28px;margin-top:32px}.taian-journal-grid figure{margin:0;min-width:0}.taian-journal-grid figure:first-child{grid-column:1/-1}.taian-journal-grid img{display:block;width:100%;height:auto}.taian-journal-grid figcaption{padding:18px 0;border-bottom:1px solid var(--line)}.taian-journal-grid h3{font:400 24px/1.6 serif;margin:0 0 8px}.taian-journal-grid time{font-size:15px;color:#677269}@media(max-width:650px){.taian-journal-grid{grid-template-columns:1fr;gap:32px}.taian-journal-grid h3{font-size:22px}}
''')
print('Added three Taian photo records with supplied dates and image zoom')
