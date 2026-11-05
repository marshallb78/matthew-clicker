import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

try:
    from rembg import remove, new_session
    session = new_session('u2net')
except Exception as e:
    session = None
    print(f"rembg warning: {e}")

AI_SKIN_MAP = {
    "classic_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\classic_matthew_ai_1793917778729.jpg",
    "aura_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\aura_matthew_ai_1793917824690.jpg",
    "sad_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\sad_matthew_ai_1793917687903.jpg",
    "angry_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\angry_matthew_ai_1793917880110.jpg",
    "sigma_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\sigma_matthew_ai_1793917939475.jpg",
    "sleepy_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\sleepy_matthew_ai_1793917988937.jpg",
    "golden_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\golden_matthew_ai_1793917825126.jpg",
    "diamond_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\diamond_matthew_ai_1793917881822.jpg",
    "fire_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\fire_matthew_ai_1793917935411.jpg",
    "ice_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\ice_matthew_ai_1793917982485.jpg",
    "rich_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\rich_matthew_ai_1793918026400.jpg",
    "galaxy_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\galaxy_matthew_ai_1793917904635.jpg",
    "evil_matthew.png": r"C:\Users\geoff\.gemini\antigravity\brain\f7147586-16db-465f-9e75-c8e75499ad9a\evil_matthew_ai_1793917949814.jpg",
}

OUT_DIR = Path("public/images/skins")
OUT_DIR.mkdir(parents=True, exist_ok=True)

def process_all():
    print("[PROCESSING AI-GENERATED SKINS]")
    for filename, src_path in AI_SKIN_MAP.items():
        src = Path(src_path)
        dst = OUT_DIR / filename
        if not src.exists():
            print(f"[MISSING] {src}")
            continue

        print(f"Processing {filename} from {src.name}...")
        img = Image.open(src).convert("RGBA")
        w, h = img.size

        # Cover any bottom text caption with corner background color
        bg_col = img.getpixel((15, 15))
        for y in range(h - 75, h):
            for x in range(w):
                img.putpixel((x, y), bg_col)

        if session is not None:
            cutout = remove(img, session=session, alpha_matting=False)
        else:
            arr = np.array(img).astype(np.float32)
            bg = np.array(bg_col[:3]).astype(np.float32)
            dist = np.linalg.norm(arr[:, :, :3] - bg, axis=2)
            mask = np.clip((dist - 30) / 20 * 255, 0, 255).astype(np.uint8)
            cutout = Image.fromarray(np.dstack([arr[:, :, :3].astype(np.uint8), mask]))

        cutout.save(dst, "PNG", optimize=True)
        print(f"  -> Saved {dst} ({dst.stat().st_size // 1024} KB)")

    # For the remaining 3 (glitch, rainbow, god) where API quota paused, create matching 2D cartoon versions
    # from the brand new 2D AI classic_matthew.png:
    classic_path = OUT_DIR / "classic_matthew.png"
    if classic_path.exists():
        base_ai = Image.open(classic_path).convert("RGBA")

        # 1. Glitch Matthew (from 2D cartoon base)
        arr = np.array(base_ai)
        r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
        r_shift = np.roll(r, -15, axis=1)
        b_shift = np.roll(b, 15, axis=1)
        glitched = np.dstack([r_shift, g, b_shift, a])
        for sy in range(200, 800, 50):
            glitched[sy:sy+20, :, :] = np.roll(glitched[sy:sy+20, :, :], 25, axis=1)
        for y in range(0, glitched.shape[0], 5):
            glitched[y:y+2, :, :3] = (glitched[y:y+2, :, :3] * 0.8).astype(np.uint8)
        glitch_img = Image.fromarray(glitched)
        glitch_img.save(OUT_DIR / "glitch_matthew.png", "PNG", optimize=True)
        print("  -> Saved glitch_matthew.png (stylized 2D)")

        # 2. Rainbow Matthew (from 2D cartoon base)
        arr = np.array(base_ai).astype(np.float32)
        h, w, _ = arr.shape
        x_c, y_c = np.meshgrid(np.arange(w), np.arange(h))
        wave = (x_c + y_c * 0.5) / 1024.0 * 2 * 3.14159
        rb_r = (np.sin(wave) * 0.5 + 0.5) * 255
        rb_g = (np.sin(wave + 2.09) * 0.5 + 0.5) * 255
        rb_b = (np.sin(wave + 4.18) * 0.5 + 0.5) * 255
        bl_r = np.clip(arr[:, :, 0] * 0.55 + rb_r * 0.45, 0, 255)
        bl_g = np.clip(arr[:, :, 1] * 0.55 + rb_g * 0.45, 0, 255)
        bl_b = np.clip(arr[:, :, 2] * 0.55 + rb_b * 0.45, 0, 255)
        rb_img = Image.fromarray(np.dstack([bl_r, bl_g, bl_b, arr[:, :, 3]]).astype(np.uint8))
        rb_img.save(OUT_DIR / "rainbow_matthew.png", "PNG", optimize=True)
        print("  -> Saved rainbow_matthew.png (stylized 2D)")

        # 3. God Matthew (from 2D cartoon base)
        god_canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        gd = ImageDraw.Draw(god_canvas)
        # Divine solar rays behind head
        for ang in range(0, 360, 15):
            rad = ang * 3.14159 / 180
            x1 = 512 + int(np.cos(rad) * 320)
            y1 = 450 + int(np.sin(rad) * 320)
            x2 = 512 + int(np.cos(rad) * 470)
            y2 = 450 + int(np.sin(rad) * 470)
            gd.line([(x1, y1), (x2, y2)], fill=(255, 225, 100, 220), width=8)
        gd.ellipse([180, 120, 844, 780], outline=(255, 215, 50, 240), width=10)
        god_canvas = god_canvas.filter(ImageFilter.GaussianBlur(3))
        god_canvas.paste(base_ai, (0, 0), base_ai)
        # Light eyes
        gd2 = ImageDraw.Draw(god_canvas)
        gd2.ellipse([395-15, 520-15, 395+15, 520+15], fill=(255, 255, 255, 255))
        gd2.ellipse([625-15, 515-15, 625+15, 515+15], fill=(255, 255, 255, 255))
        god_canvas.save(OUT_DIR / "god_matthew.png", "PNG", optimize=True)
        print("  -> Saved god_matthew.png (stylized 2D)")

    print("[ALL 16 SKINS READY IN 2D CASUAL GAME STYLE]")

if __name__ == "__main__":
    process_all()

