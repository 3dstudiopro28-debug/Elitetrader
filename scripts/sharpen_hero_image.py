from PIL import Image, ImageFilter
import os

path = 'public/hero-figure.png'
if not os.path.exists(path):
    raise FileNotFoundError(path)

im = Image.open(path).convert('RGBA')
alpha = im.split()[-1]
rgb = im.convert('RGB')
sharpened = rgb.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))
result = Image.merge('RGBA', (*sharpened.split(), alpha))
result.save(path)
print('saved', path)
