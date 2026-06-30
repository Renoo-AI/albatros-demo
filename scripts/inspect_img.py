from PIL import Image

img_path = r"c:\Users\Youssef\Desktop\Albatros\public\media\image.png"
try:
    with Image.open(img_path) as img:
        print(f"Format: {img.format}")
        print(f"Size: {img.size}")
        print(f"Mode: {img.mode}")
except Exception as e:
    print(f"Error opening image: {e}")
