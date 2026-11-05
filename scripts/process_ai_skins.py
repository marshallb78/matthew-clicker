import sys
from pathlib import Path
from PIL import Image
import numpy as np

try:
    from rembg import remove, new_session
    session = new_session('u2net')
except Exception as e:
    session = None
    print(f"Warning: rembg session failed: {e}")

def process_single_ai_skin(input_path: str, output_path: str, crop_bottom_px: int = 70):
    inp = Path(input_path)
    outp = Path(output_path)
    outp.parent.mkdir(parents=True, exist_ok=True)

    if not inp.exists():
        print(f"File not found: {input_path}")
        return False

    img = Image.open(inp).convert("RGBA")
    w, h = img.size

    # Fill bottom area with the background color to erase any text like 'SAD MATTHEW' before keying
    # Sample background color from top corners
    bg_sample = img.getpixel((10, 10))
    if crop_bottom_px > 0:
        # Create a solid rectangle over bottom crop_bottom_px
        for y in range(h - crop_bottom_px, h):
            for x in range(w):
                img.putpixel((x, y), bg_sample)

    print(f"Removing background for {inp.name}...")
    if session is not None:
        cutout = remove(img, session=session, alpha_matting=False)
    else:
        # Simple color distance fallback
        arr = np.array(img).astype(np.float32)
        bg = np.array(bg_sample[:3]).astype(np.float32)
        dist = np.linalg.norm(arr[:, :, :3] - bg, axis=2)
        mask = np.clip((dist - 30) / 20 * 255, 0, 255).astype(np.uint8)
        cutout = Image.fromarray(np.dstack([arr[:, :, :3].astype(np.uint8), mask]))

    cutout.save(outp, "PNG", optimize=True)
    print(f"Saved transparent game skin to {outp} ({outp.stat().st_size // 1024} KB)")
    return True

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        process_single_ai_skin(sys.argv[1], sys.argv[2])
    else:
        print("Usage: py scripts/process_ai_skins.py <input_jpg> <output_png>")
