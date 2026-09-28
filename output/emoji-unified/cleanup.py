"""Deterministic palette/grid cleanup; run with Pillow installed."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent
NAMES = 'diamondHand msuic cafeteria lab book good refresh slowcooker gym recess logic economy art geography loveheart hallpass crystalBall mountain theater talkingHead horse sunrise dice newspaper student warning door celebrate'.split()
# Shared anchor-inspired ramps: teal, mint, cream/gold, coral, warm neutrals.
HEX = ['123e49','195761','237984','369aa2','53b6ba','78ceca','a0e2d8','c6f0e5','e7f8ec','fff6d4','f7e4b0','efd08c','deb66f','bf8c58','936548','6b4c42','ffe1ce','ffc5b9','ffaaa6','ef8e94','d97182','b85873','86475e','e8dcca','dad0f4','b6ace3','9189c9','736caf','cfde9b','a8c48a','7da389','5a867b']
COLORS=[tuple(bytes.fromhex(h)) for h in HEX]
pal=Image.new('P',(1,1)); pal.putpalette(sum((list(c) for c in COLORS),[])+list(COLORS[-1])*(256-len(COLORS)))
report={}
for name in NAMES:
 path=ROOT/'raw'/f'{name}.png'
 if not path.exists(): continue
 im=Image.open(path).convert('RGBA')
 alpha=im.getchannel('A').point(lambda a:255 if a>=128 else 0)
 if alpha.getextrema()[0] == 255:
  raise ValueError(f'{name}: generated image has no transparency; repair before cleanup')
 box=alpha.getbbox()
 im.putalpha(alpha); im=im.crop(box)
 # Fit whole opaque sprite into 56x56; four logical pixels of safe padding.
 ratio=min(56/im.width,56/im.height)
 size=(max(1,round(im.width*ratio)),max(1,round(im.height*ratio)))
 im=im.resize(size,Image.Resampling.NEAREST)
 a=im.getchannel('A')
 rgb=im.convert('RGB').quantize(palette=pal,dither=Image.Dither.NONE).convert('RGBA');rgb.putalpha(a)
 out=Image.new('RGBA',(64,64));out.alpha_composite(rgb,((64-size[0])//2,(64-size[1])//2))
 # Rebuild the small newspaper heading with explicit bitmap glyphs.
 if name == 'newspaper':
  draw=ImageDraw.Draw(out);draw.rectangle((12,13,53,24),fill=(*COLORS[9],255))
  glyphs={'N':['10001','11001','11001','10101','10011','10011','10001'], 'E':['11111','10000','10000','11110','10000','10000','11111'], 'W':['10001','10001','10001','10101','10101','11011','10001'], 'S':['01111','10000','10000','01110','00001','00001','11110']}
  for i,ch in enumerate('NEWS'):
   g=Image.new('RGBA',(5,7));gd=ImageDraw.Draw(g)
   for y,row in enumerate(glyphs[ch]):
    for x,v in enumerate(row):
     if v=='1':gd.point((x,y),fill=(*COLORS[2],255))
   out.alpha_composite(g.resize((7,9),Image.Resampling.NEAREST),(16+i*8,14))
 out.save(ROOT/'native-64'/f'{name}.png')
 big=out.resize((256,256),Image.Resampling.NEAREST);big.save(ROOT/'png-256'/f'{name}.png')
 assert set(out.getchannel('A').get_flattened_data()) <= {0,255}
 assert len({p[:3] for p in out.get_flattened_data() if p[3]})<=32
 assert big.resize((64,64),Image.Resampling.NEAREST).tobytes()==out.tobytes()
 report[name]={'source':str(path.relative_to(ROOT)),'native':[64,64],'export':[256,256],'colors':len({p[:3] for p in out.get_flattened_data() if p[3]}),'alpha':'binary','bounds':out.getbbox()}
(ROOT/'palette.json').write_text(json.dumps({'colors':['#'+h for h in HEX]},indent=2)+'\n')
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
anchors='magic homemade crown artifact deli sleep ice mediumRare'.split()
w=8*144; h=190+4*170
sheet=Image.new('RGB',(w,h),'#eeeadd');d=ImageDraw.Draw(sheet)
for i,n in enumerate(anchors):
 im=Image.open(ROOT.parent.parent/'assets/images/emojis'/f'{n}.png').convert('RGBA');im.thumbnail((104,104),Image.Resampling.NEAREST)
 x=i*144;sheet.paste(im,(x+(144-im.width)//2,20),im);d.text((x+8,135),n+' (anchor)',fill='#195761')
for i,n in enumerate(NAMES):
 x=(i%8)*144;y=190+(i//8)*170
 d.text((x+8,y+143),n,fill='#195761')
 p=ROOT/'native-64'/f'{n}.png'
 if p.exists():
  im=Image.open(p).resize((128,128),Image.Resampling.NEAREST);sheet.paste(im,(x+8,y),im)
sheet.save(ROOT/'comparison.png')
print(f'Validated {len(report)}/{len(NAMES)} sprites: fixed palette, binary alpha, exact 4x pixels.')
