from pathlib import Path
import shutil, json
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parent
ASSETS=ROOT.parent.parent/'assets/images/emojis'
NAMES=['streetSmart','rushing','trident','mediumRare','minimalist']
report={}
preview=Image.new('RGB',(5*280,310),'#eeeadd'); draw=ImageDraw.Draw(preview)
for i,name in enumerate(NAMES):
 target=ASSETS/f'{name}.png'; backup=ROOT/'originals'/target.name
 if not backup.exists(): shutil.copy2(target,backup)
 im=Image.open(backup).convert('RGBA')
 original_size=im.size
 alpha=im.getchannel('A').point(lambda a:255 if a>=128 else 0)
 im.putalpha(alpha); im=im.crop(alpha.getbbox())
 scale=min(56/im.width,56/im.height)
 size=(max(1,round(im.width*scale)),max(1,round(im.height*scale)))
 im=im.resize(size,Image.Resampling.NEAREST)
 native=Image.new('RGBA',(64,64))
 native.alpha_composite(im,((64-size[0])//2,(64-size[1])//2))
 native.save(ROOT/'native-64'/target.name)
 final=native.resize((256,256),Image.Resampling.NEAREST)
 final.save(target)
 assert final.size==(256,256)
 assert set(final.getchannel('A').get_flattened_data())=={0,255}
 assert final.tobytes()==final.resize((64,64),Image.Resampling.NEAREST).resize((256,256),Image.Resampling.NEAREST).tobytes()
 preview.paste(final,(i*280+12,10),final);draw.text((i*280+12,278),name,fill='#195761')
 report[name]={'original_size':original_size,'native_size':[64,64],'export_size':[256,256],'opaque_bounds':native.getbbox(),'backup':str(backup.relative_to(ROOT))}
(ROOT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
preview.save(ROOT/'preview.png')
print('Updated and verified all five assets. Originals backed up; colors sampled unchanged, no palette remapping.')
