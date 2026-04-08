from PIL import Image
import os
path = 'public/hero-figure.png'
if not os.path.exists(path):
    raise FileNotFoundError(path)

im = Image.open(path).convert('RGBA')
px = im.load()
w, h = im.size
counts = {
    'opaque_dark': 0,
    'opaque_mid': 0,
    'opaque_light': 0,
    'trans_dark': 0,
    'trans_mid': 0,
    'trans_light': 0,
}
for y in range(h):
    for x in range(w):
        r,g,b,a = px[x,y]
        lum = 0.2126*r + 0.7152*g + 0.0722*b
        if a == 255:
            if lum < 60:
                counts['opaque_dark'] += 1
            elif lum < 180:
                counts['opaque_mid'] += 1
            else:
                counts['opaque_light'] += 1
        elif a > 0:
            if lum < 60:
                counts['trans_dark'] += 1
            elif lum < 180:
                counts['trans_mid'] += 1
            else:
                counts['trans_light'] += 1
print(counts)
print('total pixels', w*h)
