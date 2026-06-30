import os
from PIL import Image, ImageDraw, ImageFont

def generate_favicons():
    # Setup paths
    public_dir = r"c:\Users\Youssef\Desktop\Albatros\public"
    
    # 1. Create a 512x512 canvas for high quality rendering
    size = 512
    canvas = Image.new("RGBA", (size, size), (18, 18, 18, 255)) # Dark background #121212
    draw = ImageDraw.Draw(canvas)
    
    # 2. Draw luxurious gold circular outline
    gold_color = (212, 175, 122, 255) # #D4AF7A
    margin = 40
    draw.ellipse(
        [(margin, margin), (size - margin, size - margin)],
        outline=gold_color,
        width=10
    )
    
    # 3. Draw elegant Serif monogram "A"
    # Search for Georgia Bold
    font_path = "C:\\Windows\\Fonts\\georgiab.ttf"
    if not os.path.exists(font_path):
        font_path = "C:\\Windows\\Fonts\\georgia.ttf"
        
    try:
        font = ImageFont.truetype(font_path, 280)
    except Exception:
        font = ImageFont.load_default()
        
    # Draw letter A in center
    text = "A"
    # Calculate position to center text
    # In Pillow, to center text perfectly:
    bbox = draw.textbbox((0, 0), text, font=font)
    t_w = bbox[2] - bbox[0]
    t_h = bbox[3] - bbox[1]
    
    t_x = (size - t_w) // 2 - bbox[0]
    t_y = (size - t_h) // 2 - bbox[1]
    
    draw.text((t_x, t_y), text, font=font, fill=gold_color)
    
    # 4. Generate sizes
    # Apple Touch Icon: 180x180
    apple_icon = canvas.resize((180, 180), Image.Resampling.LANCZOS)
    apple_icon.save(os.path.join(public_dir, "apple-touch-icon.png"), "PNG")
    
    # Favicon 32x32
    fav32 = canvas.resize((32, 32), Image.Resampling.LANCZOS)
    fav32.save(os.path.join(public_dir, "favicon-32x32.png"), "PNG")
    
    # Favicon 16x16
    fav16 = canvas.resize((16, 16), Image.Resampling.LANCZOS)
    fav16.save(os.path.join(public_dir, "favicon-16x16.png"), "PNG")
    
    # Favicon.ico containing 16, 32, 48, 64
    ico_img = canvas.resize((64, 64), Image.Resampling.LANCZOS)
    ico_img.save(
        os.path.join(public_dir, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    
    print("Favicons successfully generated at:", public_dir)

if __name__ == "__main__":
    generate_favicons()
