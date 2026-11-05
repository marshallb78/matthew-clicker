"""
Realistic Matthew Skin Generator — Photorealistic Editions.
Uses the authentic high-resolution photograph 'Images/Main Matthew.png' as identity reference.
Generates 16 transparent PNGs with 100% preserved facial likeness.
"""

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np

try:
    from rembg import remove, new_session
    session = new_session('u2net')
except Exception:
    session = None

SRC_PHOTO = Path("Images/Main Matthew.png")
OUT_DIR = Path("public/images/skins")
OUT_DIR.mkdir(parents=True, exist_ok=True)

def load_real_matthew():
    """Loads the real photograph and resizes to standard 1024x1024 transparent PNG."""
    img = Image.open(SRC_PHOTO).convert("RGBA")
    img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return img

# --- REALISTIC EFFECT COMPOSITORS ---

def apply_aura_effects(base):
    alpha = base.split()[-1]
    dilated = alpha.filter(ImageFilter.MaxFilter(35)).filter(ImageFilter.GaussianBlur(25))
    aura_arr = np.array(dilated)

    aura_layer = np.zeros((1024, 1024, 4), dtype=np.uint8)
    aura_layer[:, :, 0] = np.clip(aura_arr * 0.3, 0, 255)
    aura_layer[:, :, 1] = np.clip(aura_arr * 0.9, 0, 255)
    aura_layer[:, :, 2] = np.clip(aura_arr * 1.0, 0, 255)
    aura_layer[:, :, 3] = np.clip(aura_arr * 0.75, 0, 255)

    res = Image.fromarray(aura_layer)
    res.paste(base, (0, 0), base)
    return res

def apply_sad_effects(base):
    res = base.copy()
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    left_eye = (440, 680)
    right_eye = (575, 680)

    tear_blue = (180, 220, 255, 230)
    tear_highlight = (255, 255, 255, 250)

    for ex, ey in [left_eye, right_eye]:
        d.ellipse([ex - 7, ey, ex + 7, ey + 40], fill=tear_blue)
        d.ellipse([ex - 3, ey + 5, ex + 2, ey + 25], fill=tear_highlight)
        d.ellipse([ex - 9, ey + 35, ex + 9, ey + 55], fill=tear_blue)
        d.ellipse([ex - 4, ey + 40, ex + 1, ey + 50], fill=tear_highlight)

    overlay = overlay.filter(ImageFilter.GaussianBlur(1.0))
    res.paste(overlay, (0, 0), overlay)
    return res

def apply_angry_effects(base):
    res = base.copy()
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    for side, cx in [("left", 260), ("right", 760)]:
        cy = 500
        d.ellipse([cx - 25, cy - 20, cx + 25, cy + 20], fill=(240, 240, 245, 180))
        d.ellipse([cx - 15, cy - 45, cx + 15, cy - 15], fill=(240, 240, 245, 140))
        d.ellipse([cx - 8, cy - 70, cx + 8, cy - 50], fill=(240, 240, 245, 100))

    overlay = overlay.filter(ImageFilter.GaussianBlur(3.0))
    res.paste(overlay, (0, 0), overlay)

    enhancer = ImageEnhance.Color(res)
    res = enhancer.enhance(1.2)
    return res

def apply_sigma_effects(base):
    res = base.copy()
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    left_lens = [(390, 645), (480, 645), (475, 700), (400, 695)]
    right_lens = [(535, 645), (625, 645), (620, 695), (545, 700)]

    d.polygon(left_lens, fill=(20, 20, 25, 245))
    d.polygon(right_lens, fill=(20, 20, 25, 245))
    d.line([(475, 655), (540, 655)], fill=(180, 180, 190, 255), width=3)
    d.line([(395, 655), (440, 690)], fill=(255, 255, 255, 120), width=3)
    d.line([(540, 655), (585, 690)], fill=(255, 255, 255, 120), width=3)

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.5))
    res.paste(overlay, (0, 0), overlay)
    return res

def apply_sleepy_effects(base):
    res = base.copy()
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    cap_points = [(350, 420), (670, 420), (580, 220), (450, 280)]
    d.polygon(cap_points, fill=(60, 110, 190, 230))
    d.ellipse([430, 260, 470, 300], fill=(245, 245, 250, 255))

    overlay = overlay.filter(ImageFilter.GaussianBlur(1.0))
    res.paste(overlay, (0, 0), overlay)
    return res

def apply_rich_effects(base):
    res = base.copy()
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    d.ellipse([535, 645, 615, 705], outline=(255, 215, 0, 255), width=4)
    d.ellipse([537, 647, 613, 703], fill=(255, 245, 200, 60))
    d.line([(575, 705), (630, 780)], fill=(255, 215, 0, 220), width=2)

    hat_brim = [(340, 430), (680, 430)]
    d.line(hat_brim, fill=(25, 25, 30, 255), width=16)
    d.rectangle([410, 250, 610, 425], fill=(30, 30, 35, 255))
    d.rectangle([410, 395, 610, 425], fill=(180, 25, 35, 255))

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.8))
    res.paste(overlay, (0, 0), overlay)
    return res

def apply_golden_effects(base):
    arr = np.array(base).astype(np.float32)
    alpha = arr[:, :, 3] / 255.0
    gray = (0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2])
    gold_r = np.clip(gray * 1.35 + 40, 0, 255)
    gold_g = np.clip(gray * 1.15 + 10, 0, 255)
    gold_b = np.clip(gray * 0.45, 0, 255)

    out_arr = np.zeros_like(arr, dtype=np.uint8)
    out_arr[:, :, 0] = (gold_r * 0.65 + arr[:, :, 0] * 0.35).astype(np.uint8)
    out_arr[:, :, 1] = (gold_g * 0.65 + arr[:, :, 1] * 0.35).astype(np.uint8)
    out_arr[:, :, 2] = (gold_b * 0.65 + arr[:, :, 2] * 0.35).astype(np.uint8)
    out_arr[:, :, 3] = arr[:, :, 3].astype(np.uint8)

    res = Image.fromarray(out_arr)
    halo = base.split()[-1].filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(30))
    halo_arr = np.array(halo)
    halo_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    halo_img[:, :, 0] = np.clip(halo_arr * 1.0, 0, 255)
    halo_img[:, :, 1] = np.clip(halo_arr * 0.85, 0, 255)
    halo_img[:, :, 2] = np.clip(halo_arr * 0.2, 0, 255)
    halo_img[:, :, 3] = np.clip(halo_arr * 0.7, 0, 255)
    halo_res = Image.fromarray(halo_img)
    halo_res.paste(res, (0, 0), res)
    return halo_res

def apply_diamond_effects(base):
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(35)).filter(ImageFilter.GaussianBlur(25))
    h_arr = np.array(halo)
    h_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    h_img[:, :, 0] = np.clip(h_arr * 0.7, 0, 255)
    h_img[:, :, 1] = np.clip(h_arr * 0.95, 0, 255)
    h_img[:, :, 2] = np.clip(h_arr * 1.0, 0, 255)
    h_img[:, :, 3] = np.clip(h_arr * 0.75, 0, 255)
    res = Image.fromarray(h_img)
    res.paste(base, (0, 0), base)
    return res

def apply_fire_effects(base):
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(30))
    h_arr = np.array(halo)
    h_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    h_img[:, :, 0] = np.clip(h_arr * 1.0, 0, 255)
    h_img[:, :, 1] = np.clip(h_arr * 0.45, 0, 255)
    h_img[:, :, 2] = np.clip(h_arr * 0.05, 0, 255)
    h_img[:, :, 3] = np.clip(h_arr * 0.8, 0, 255)
    res = Image.fromarray(h_img)
    res.paste(base, (0, 0), base)
    return res

def apply_ice_effects(base):
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(35)).filter(ImageFilter.GaussianBlur(25))
    h_arr = np.array(halo)
    h_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    h_img[:, :, 0] = np.clip(h_arr * 0.4, 0, 255)
    h_img[:, :, 1] = np.clip(h_arr * 0.85, 0, 255)
    h_img[:, :, 2] = np.clip(h_arr * 1.0, 0, 255)
    h_img[:, :, 3] = np.clip(h_arr * 0.75, 0, 255)
    res = Image.fromarray(h_img)
    res.paste(base, (0, 0), base)
    return res

def apply_galaxy_effects(base):
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(45)).filter(ImageFilter.GaussianBlur(35))
    h_arr = np.array(halo)
    h_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    h_img[:, :, 0] = np.clip(h_arr * 0.6, 0, 255)
    h_img[:, :, 1] = np.clip(h_arr * 0.2, 0, 255)
    h_img[:, :, 2] = np.clip(h_arr * 0.95, 0, 255)
    h_img[:, :, 3] = np.clip(h_arr * 0.8, 0, 255)
    res = Image.fromarray(h_img)
    res.paste(base, (0, 0), base)
    return res

def apply_evil_effects(base):
    res = base.copy()
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    left_horn = [(380, 480), (340, 390), (310, 340), (330, 370), (410, 470)]
    right_horn = [(640, 480), (680, 390), (710, 340), (690, 370), (610, 470)]

    d.polygon(left_horn, fill=(180, 25, 30, 240))
    d.polygon(right_horn, fill=(180, 25, 30, 240))

    overlay = overlay.filter(ImageFilter.GaussianBlur(1.0))
    res.paste(overlay, (0, 0), overlay)
    return res

def apply_glitch_effects(base):
    arr = np.array(base).copy()
    shift = 15
    red_ch = arr[:, :, 0].copy()
    blue_ch = arr[:, :, 2].copy()

    arr[:, shift:, 0] = red_ch[:, :-shift]
    arr[:, :-shift, 2] = blue_ch[:, shift:]
    return Image.fromarray(arr)

def apply_rainbow_effects(base):
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(30))
    h_arr = np.array(halo).astype(np.float32) / 255.0

    rainbow = np.zeros((1024, 1024, 4), dtype=np.uint8)
    for y in range(1024):
        hue = (y / 1024.0) * 2 * math.pi
        r = int((math.sin(hue) * 0.5 + 0.5) * 255)
        g = int((math.sin(hue + 2.094) * 0.5 + 0.5) * 255)
        b = int((math.sin(hue + 4.188) * 0.5 + 0.5) * 255)
        rainbow[y, :, 0] = (r * h_arr[y, :]).astype(np.uint8)
        rainbow[y, :, 1] = (g * h_arr[y, :]).astype(np.uint8)
        rainbow[y, :, 2] = (b * h_arr[y, :]).astype(np.uint8)
        rainbow[y, :, 3] = (h_arr[y, :] * 200).astype(np.uint8)

    res = Image.fromarray(rainbow)
    res.paste(base, (0, 0), base)
    return res

def apply_god_effects(base):
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(61)).filter(ImageFilter.GaussianBlur(40))
    h_arr = np.array(halo)
    h_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    h_img[:, :, 0] = np.clip(h_arr * 1.0, 0, 255)
    h_img[:, :, 1] = np.clip(h_arr * 0.95, 0, 255)
    h_img[:, :, 2] = np.clip(h_arr * 0.5, 0, 255)
    h_img[:, :, 3] = np.clip(h_arr * 0.85, 0, 255)
    res = Image.fromarray(h_img)
    res.paste(base, (0, 0), base)
    return res

SKIN_MODIFIERS = {
    "classic": lambda b: b,
    "aura": apply_aura_effects,
    "sad": apply_sad_effects,
    "angry": apply_angry_effects,
    "sigma": apply_sigma_effects,
    "golden": apply_golden_effects,
    "diamond": apply_diamond_effects,
    "fire": apply_fire_effects,
    "ice": apply_ice_effects,
    "galaxy": apply_galaxy_effects,
    "evil": apply_evil_effects,
    "sleepy": apply_sleepy_effects,
    "rich": apply_rich_effects,
    "glitch": apply_glitch_effects,
    "rainbow": apply_rainbow_effects,
    "god": apply_god_effects,
}

def generate_all():
    print("[STARTING REALISTIC MATTHEW GENERATION: 16 SKINS]")
    real_normal = load_real_matthew()

    for skin_id, mod_func in SKIN_MODIFIERS.items():
        normal_out = OUT_DIR / f"{skin_id}-normal.png"
        normal_img = mod_func(real_normal)
        normal_img.save(normal_out, "PNG", optimize=True)
        print(f"  Generated: {normal_out.name} ({normal_out.stat().st_size // 1024} KB)")

    # Clean up any unused tongue-out files in OUT_DIR
    for tongue_file in OUT_DIR.glob("*-tongue.png"):
        tongue_file.unlink(missing_ok=True)
        print(f"  Removed unused tongue file: {tongue_file.name}")

    print("[SUCCESS] All 16 photorealistic Matthew skins generated and clean!")

if __name__ == "__main__":
    generate_all()
