from PIL import Image
from pathlib import Path
out=Path('dist/assets'); out.mkdir(exist_ok=True)
def crop(frame,box,name):
    Image.open('reference/frame-'+frame+'.jpg').crop(box).save(out/(name+'.webp'),quality=94)
crop('001.5',(8,151,760,690),'archin')
crop('002',(344,162,1075,677),'nova')
crop('009.0',(0,0,1,1),'unused')
crop('010',(350,161,666,480),'neural-face')
crop('010',(795,362,997,600),'portrait-green')
crop('010',(141,62,235,184),'portrait-blue')
crop('010',(23,530,164,631),'portrait-red')
crop('018',(834,304,898,379),'portrait-cyan')
crop('012',(390,187,776,710),'sculpture')
crop('018',(404,374,881,711),'chrome-reference')
(out/'unused.webp').unlink()
