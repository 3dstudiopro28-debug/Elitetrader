from PIL import Image
import os
path = 'public/hero-figure.png'
if not os.path.exists(path):
    raise FileNotFoundError(path)

im = Image.open(path).convert('RGBA')
px = im.load()
w, h = im.size
count_dark_trans = 0
count_dark_opaque = 0
count_translucent_dark = 0
for y in range(h):
    for x in range(w):
        r,g,b,a = px[x,y]
        if a == 0:
            continue
        lum = 0.2126*r + 0.7152*g + 0.0722*b
        if lum < 30:
            if a < 255:
                count_dark_trans += 1
            else:
                count_dark_opaque += 1
        if a < 255 and lum < 60:
            count_translucent_dark += 1
print('dark_transparent_pixels', count_dark_trans)
print('dark_opaque_pixels', count_dark_opaque)
print('translucent_dark_pixels', count_translucent_dark)
print('total_pixels', w*h)
