from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as E
import re,json,shutil
base=Path(__file__).parent; upload=Path('/workspace/scratch/4b485672085c/upload')
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
def read(p):
 r=E.fromstring(ZipFile(p).read('word/document.xml'))
 return [''.join(t.text or '' for t in x.findall('.//w:t',ns)).strip() for x in r.findall('.//w:p',ns)]
def parse(p):
 out=[];cur=None;status=''
 for s in read(p):
  if not s:continue
  if s.startswith('以下'):status=s;continue
  m=re.match('【(.*?)】(.*)',s)
  if m:
   cur={'name':m[1],'lines':[],'status':status};out.append(cur)
   if m[2]:cur['lines'].append(m[2])
  elif cur:cur['lines'].append(s)
 return out
u=parse(next(upload.glob('都更16案，*.docx'))); c=parse(next(upload.glob('危老6案，*.docx')))
desc={p['name']:p['lines'] for p in parse(next(upload.glob('都更16案內容*.docx')))}
nums=[1,2,3,4,5,6,7,None,None,14,15,16,17,18,19,20,8,9,10,11,12,13]
sketches={3:'870',4:'753',5:'861',7:'837',20:'225'}
assets=base/'dist/assets'; rows=[]
for p,n in zip(u+c,nums):
 p['kind']='urban' if p in u else 'renewal';p['highlights']=desc.get(p['name'],[])
 p['slug']='shidong' if n==1 else 'heping' if n==11 else 'project-'+(str(n) if n else ('xinguang-urban' if '新光' in p['name'] else 'wuxing'))
 p['image']='assets/building.jpg' if n==1 else ''
 p['source_image']='';p['sketch']=''
 if n and n!=1:
  matches=sorted(upload.glob(str(n)+'-*.jpg'))
  if matches:
   src=matches[-1];name='case-'+str(n)+'.jpg';shutil.copy(src,assets/name);p['image']='assets/'+name;p['source_image']=src.name
 if n in sketches:
  src=next(upload.glob(sketches[n]+'*素描*.jpg'));name='sketch-'+str(n)+'.jpg';shutil.copy(src,assets/name);p['sketch']='assets/'+name
 p['specs']={k.strip():v.strip() for line in p.pop('lines') if '：' in line for k,v in [line.split('：',1)]}
 if p['slug']=='project-9':p['name']='泰安街危老案(泰安街七號、九號)'
 rows.append(p)
(base/'projects.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print('Projects:',len(rows));print([(p['name'],p['source_image'] or p['image'] or '無對應圖片') for p in rows])
