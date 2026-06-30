import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def generate_og_image():
    src_path = r"c:\Users\Youssef\Desktop\Albatros\public\media\image.png"
    out_path = r"c:\Users\Youssef\Desktop\Albatros\public\media\og.png"
    
    # 1. Open original image
    if not os.path.exists(src_path):
        print(f"Source image not found at {src_path}")
        return
        
    with Image.open(src_path) as img:
        # Convert to RGBA
        img = img.convert("RGBA")
        
        # 2. Resize and Crop to 1200x630 (OG standard)
        target_w, target_h = 1200, 630
        src_w, src_h = img.size
        
        # Determine scale
        scale = max(target_w / src_w, target_h / src_h)
        new_w = int(src_w * scale)
        new_h = int(src_h * scale)
        img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Center crop
        left = (new_w - target_w) // 2
        top = (new_h - target_h) // 2
        right = left + target_w
        bottom = top + target_h
        img_cropped = img_resized.crop((left, top, right, bottom))
        
        # Create a drawing layer
        overlay = Image.new("RGBA", img_cropped.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        
        # 3. Add luxurious dark gradient or overlay
        # Let's create a radial or linear dark gradient overlay to make text pop
        for y in range(target_h):
            # Gradient factor: darker at top/bottom and sides, slightly lighter in middle
            # Let's use a solid dark overlay with 0.45 opacity (115/255) for simplicity and luxury look
            pass
        
        # Simple elegant dark overlay (opacity 0.45)
        draw.rectangle([(0, 0), (target_w, target_h)], fill=(15, 15, 15, 120))
        
        # 4. Add Gold Border
        # Gold color: #D4AF7A -> (212, 175, 122)
        gold_color = (212, 175, 122, 255)
        border_inset = 25
        # Draw outer thin gold rectangle
        draw.rectangle(
            [(border_inset, border_inset), (target_w - border_inset, target_h - border_inset)],
            outline=gold_color,
            width=2
        )
        # Draw inner very thin gold rectangle
        draw.rectangle(
            [(border_inset + 6, border_inset + 6), (target_w - border_inset - 6, target_h - border_inset - 6)],
            outline=(212, 175, 122, 100),
            width=1
        )
        
        # 5. Load Fonts
        # Search for Georgia (classic serif) or Times New Roman on Windows
        font_dir = "C:\\Windows\\Fonts"
        georgia_path = os.path.join(font_dir, "georgia.ttf")
        georgiab_path = os.path.join(font_dir, "georgiab.ttf")
        arial_path = os.path.join(font_dir, "arial.ttf")
        
        # Fallbacks
        font_title = None
        font_subtitle = None
        font_info = None
        
        try:
            if os.path.exists(georgiab_path):
                font_title = ImageFont.truetype(georgiab_path, 80)
            elif os.path.exists(georgia_path):
                font_title = ImageFont.truetype(georgia_path, 80)
            else:
                font_title = ImageFont.load_default()
                
            if os.path.exists(georgia_path):
                font_subtitle = ImageFont.truetype(georgia_path, 32)
            else:
                font_subtitle = ImageFont.load_default()
                
            if os.path.exists(arial_path):
                font_info = ImageFont.truetype(arial_path, 18)
            else:
                font_info = ImageFont.load_default()
        except Exception as e:
            print(f"Error loading fonts: {e}")
            font_title = ImageFont.load_default()
            font_subtitle = ImageFont.load_default()
            font_info = ImageFont.load_default()
            
        # 6. Draw Text
        # "ALBATROS" Title
        title_text = "A L B A T R O S"
        subtitle_text = "Café & Salle des Fêtes — Manouba"
        info_text = "Av Complexe Sportif, Manouba • Tél: +216 98 687 124"
        
        # Calculate text bounding boxes to center them
        # Title
        t_w = draw.textlength(title_text, font=font_title)
        t_x = (target_w - t_w) // 2
        t_y = 210
        
        # Shadow for title
        draw.text((t_x + 3, t_y + 3), title_text, font=font_title, fill=(0, 0, 0, 180))
        # Draw golden title
        draw.text((t_x, t_y), title_text, font=font_title, fill=gold_color)
        
        # Subtitle
        sub_w = draw.textlength(subtitle_text, font=font_subtitle)
        sub_x = (target_w - sub_w) // 2
        sub_y = 310
        
        # Shadow for subtitle
        draw.text((sub_x + 2, sub_y + 2), subtitle_text, font=font_subtitle, fill=(0, 0, 0, 180))
        # Draw white subtitle
        draw.text((sub_x, sub_y), subtitle_text, font=font_subtitle, fill=(255, 255, 255, 240))
        
        # Elegant Divider Line
        line_y = 380
        line_w = 120
        draw.line([((target_w - line_w) // 2, line_y), ((target_w + line_w) // 2, line_y)], fill=gold_color, width=2)
        
        # Info Text (Footer of the image)
        info_w = draw.textlength(info_text, font=font_info)
        info_x = (target_w - info_w) // 2
        info_y = 520
        
        # Draw info text in muted grey-white
        draw.text((info_x, info_y), info_text, font=font_info, fill=(200, 200, 200, 200))
        
        # 7. Composite and save
        final_img = Image.alpha_composite(img_cropped, overlay)
        # Convert back to RGB for JPEG compatibility (though saving as PNG)
        final_img = final_img.convert("RGB")
        final_img.save(out_path, "PNG")
        print(f"Luxurious OpenGraph image successfully generated at {out_path}")

if __name__ == "__main__":
    generate_og_image()
