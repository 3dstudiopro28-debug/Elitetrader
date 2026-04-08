from PIL import Image
import os

path = 'public/hero-figure.png'
if not os.path.exists(path):
    raise FileNotFoundError(path)

im = Image.open(path)
print('format', im.format)
print('mode', im.mode)
print('size', im.size)
if im.mode != 'RGBA':
    im = im.convert('RGBA')

alpha = im.getchannel('A')
transparent = sum(1 for a in alpha.getdata() if a == 0)
semi = sum(1 for a in alpha.getdata() if 0 < a < 255)
opaque = sum(1 for a in alpha.getdata() if a == 255)
print('transparent_pixels', transparent)
print('semi_transparent_pixels', semi)
print('opaque_pixels', opaque)
print('total_pixels', im.size[0] * im.size[1])
