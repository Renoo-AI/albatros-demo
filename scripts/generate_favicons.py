from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
output_dir = root / 'public'

output_favicon = output_dir / 'favicon.ico'
output_png_32 = output_dir / 'favicon-32x32.png'
output_png_16 = output_dir / 'favicon-16x16.png'
output_apple = output_dir / 'apple-touch-icon.png'
output_manifest = output_dir / 'site.webmanifest'

# Create a clean white-circle A. logo
canvas_size = 512
circle_size = 450
circle_color = (255, 255, 255, 255)
text_color = (18, 18, 18, 255)
background = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
draw = ImageDraw.Draw(background)

circle_bbox = [
    (canvas_size - circle_size) // 2,
    (canvas_size - circle_size) // 2,
    (canvas_size + circle_size) // 2,
    (canvas_size + circle_size) // 2,
]
draw.ellipse(circle_bbox, fill=circle_color)

txt = 'A.'

# Try a strong sans serif font, fallback to default
try:
    font = ImageFont.truetype('arialbd.ttf', 280)
except OSError:
    try:
        font = ImageFont.truetype('arial.ttf', 280)
    except OSError:
        font = ImageFont.load_default()

text_bbox = draw.textbbox((0, 0), txt, font=font)
text_width = text_bbox[2] - text_bbox[0]
text_height = text_bbox[3] - text_bbox[1]
text_x = (canvas_size - text_width) // 2
text_y = (canvas_size - text_height) // 2 - 10

# Draw the letter with slight shadow for contrast
shadow_offset = 4
shadow_color = (0, 0, 0, 100)
draw.text((text_x + shadow_offset, text_y + shadow_offset), txt, font=font, fill=shadow_color)
draw.text((text_x, text_y), txt, font=font, fill=text_color)

# Save icon outputs
icon_32 = background.resize((32, 32), Image.LANCZOS)
icon_16 = background.resize((16, 16), Image.LANCZOS)
icon_180 = background.resize((180, 180), Image.LANCZOS)

background.save(output_png_32, format='PNG')
background.save(output_png_16, format='PNG')
icon_180.save(output_apple, format='PNG')

# Generate favicon.ico with multiple sizes
background.save(output_favicon, format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

# Write a basic web manifest
manifest = {
    "name": "ALBATROS — Café & Salle Des Fêtes à Manouba",
    "short_name": "ALBATROS",
    "description": "Salle des fêtes Albatros à Manouba : café, salle de réception et événements privés.",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#121212",
    "theme_color": "#121212",
    "icons": [
        {
            "src": "/apple-touch-icon.png",
            "sizes": "180x180",
            "type": "image/png"
        },
        {
            "src": "/favicon-32x32.png",
            "sizes": "32x32",
            "type": "image/png"
        },
        {
            "src": "/favicon-16x16.png",
            "sizes": "16x16",
            "type": "image/png"
        }
    ]
}

output_manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
print('Created favicon assets and site.webmanifest')
