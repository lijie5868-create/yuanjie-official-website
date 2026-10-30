from pathlib import Path
from fontTools import subset
import shutil
base=Path(__file__).parent
out=base/'dist/assets/fonts';out.mkdir(exist_ok=True)
text=''.join(p.read_text() for p in (base/'dist').glob('*.html'))+''.join(chr(i) for i in range(32,127))
for weight in ('400','600'):
 options=subset.Options();options.flavor='woff';options.layout_features=['*']
 font=subset.load_font(str(base/f'font-source/noto-serif-tc-{weight}.ttf'),options)
 job=subset.Subsetter(options=options);job.populate(text=text);job.subset(font)
 subset.save_font(font,str(out/f'noto-serif-tc-{weight}.woff'),options)
license_path=base/'font-source/OFL.txt'
if license_path.exists():shutil.copy(license_path,out/'OFL.txt')
print('Built two self-hosted Traditional Chinese editorial web fonts')
