import os
import numpy as np
from PIL import Image

src_path = r'C:\Users\power tech\.gemini\antigravity\brain\9a5eb8e0-ba9a-480a-9f4b-bc13fbb4d09c\.user_uploaded\media_1794201333344_7b3ad70b.jpg'
src = Image.open(src_path).convert('RGB')
arr = np.array(src, dtype=np.float32)

# Precise bounding boxes excluding floor shadows
boxes = {
    'excited': (60, 68, 344, 420),
    'shrug': (75, 600, 348, 980),
    'dizzy': (240, 375, 518, 676),
    'determined': (400, 100, 686, 440),
    'crying': (400, 640, 686, 945)
}

os.makedirs('extracted_robots/opt', exist_ok=True)
os.makedirs('extracted_robots', exist_ok=True)

for name, (ymin, xmin, ymax, xmax) in boxes.items():
    crop = arr[ymin:ymax, xmin:xmax]
    H, W, _ = crop.shape
    
    # Distance from pure white
    diff = 255.0 - crop
    dist = np.sqrt(np.sum(diff**2, axis=2))
    
    # Smooth alpha:
    alpha = np.clip((dist - 12.0) / 25.0, 0.0, 1.0) * 255.0
    alpha[dist < 12.0] = 0.0
    
    # De-matting against white
    a_norm = alpha / 255.0
    fg_rgb = np.zeros_like(crop)
    for c in range(3):
        val = np.where(a_norm > 0.03, (crop[:, :, c] - (1.0 - a_norm) * 255.0) / np.maximum(a_norm, 0.03), crop[:, :, c])
        fg_rgb[:, :, c] = np.clip(val, 0, 255)
        
    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[:, :, :3] = fg_rgb.astype(np.uint8)
    rgba[:, :, 3] = alpha.astype(np.uint8)
    
    img = Image.fromarray(rgba, 'RGBA')
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    # Add 12px transparent padding around character
    pad = 12
    padded = Image.new('RGBA', (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    padded.paste(img, (pad, pad))
    
    out_hires = os.path.join('extracted_robots', name + '.png')
    padded.save(out_hires, 'PNG')
    
    scale = 180.0 / padded.height
    new_w = int(padded.width * scale)
    new_h = int(padded.height * scale)
    opt = padded.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    out_opt = os.path.join('extracted_robots', 'opt', name + '.png')
    opt.save(out_opt, 'PNG', optimize=True)
    
    print(f'{name}: cropped={img.size}, padded={padded.size}, opt={opt.size}')

print("All poses processed successfully!")
