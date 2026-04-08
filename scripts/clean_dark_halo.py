from PIL import Image
import os

path = 'public/hero-figure.png'
out = 'public/hero-figure-clean2.png'
if not os.path.exists(path):
    raise FileNotFoundError(path)

im = Image.open(path).convert('RGBA')
px = im.load()
w, h = im.size
removed = 0
for y in range(h):
    for x in range(w):
        r,g,b,a = px[x,y]
        if a == 0:
            continue
        lum = 0.2126*r + 0.7152*g + 0.0722*b
        if a < 255 and lum < 80:
            px[x,y] = (r, g, b, 0)
            removed += 1
        elif a < 150 and lum < 100:
            px[x,y] = (r, g, b, 0)
            removed += 1
print('removed', removed, 'pixels')
im.save(out)
print('saved', out)
