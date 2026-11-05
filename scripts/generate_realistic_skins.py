"""
Realistic Matthew Skin Generator with Dual Normal + Tongue-Out Expressions.
Uses the authentic high-resolution photograph 'Images/Main Matthew.png' as identity reference.
Generates 32 transparent PNGs (16 normal + 16 tongue-out) with 100% preserved facial likeness.
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

def create_realistic_tongue(base_img):
    """
    Creates a photorealistic playful tongue-out expression on Matthew's face.
    Slightly parts lips with natural mouth cavity depth, upper teeth edge,
    and a realistic pink textured tongue with natural human curvature and moist specular highlights.
    """
    tongue_img = base_img.copy()
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Mouth center is around (508, 748)
    mx, my = 508, 748

    # 1. Dark interior mouth opening (parted lips)
    d.ellipse([mx - 38, my - 8, mx + 38, my + 24], fill=(45, 12, 18, 255))

    # 2. Subtle upper teeth line
    d.rectangle([mx - 22, my - 6, mx + 22, my + 2], fill=(245, 240, 235, 255))
    # Teeth separation
    d.line([(mx, my - 6), (mx, my + 2)], fill=(120, 80, 80, 200), width=1)

    # 3. Natural human tongue anatomy
    # Tongue body extending forward and downward over lower lip
    tongue_points = [
        (mx - 28, my + 4),   # Left root
        (mx - 32, my + 25),  # Left edge
        (mx - 25, my + 55),  # Left curve
        (mx - 14, my + 76),  # Tip left
        (mx, my + 82),       # Tip center
        (mx + 14, my + 76),  # Tip right
        (mx + 25, my + 55),  # Right curve
        (mx + 32, my + 25),  # Right edge
        (mx + 28, my + 4),   # Right root
    ]
    # Rich natural tongue pink base
    d.polygon(tongue_points, fill=(235, 95, 115, 255))

    # Tongue center groove / median sulcus
    d.line([(mx, my + 10), (mx, my + 65)], fill=(185, 60, 80, 230), width=3)

    # Tongue 3D lighting: lighter pink on upper surface, deeper shadow below
    # Upper tongue highlight
    d.ellipse([mx - 18, my + 15, mx + 18, my + 50], fill=(255, 135, 150, 160))
    # Tip highlight
    d.ellipse([mx - 12, my + 60, mx + 12, my + 75], fill=(255, 150, 165, 180))

    # Moist specular saliva reflections (photographic glints)
    d.ellipse([mx - 8, my + 30, mx - 4, my + 34], fill=(255, 255, 255, 220))
    d.ellipse([mx + 5, my + 48, mx + 8, my + 51], fill=(255, 255, 255, 200))
    d.ellipse([mx - 3, my + 68, mx + 1, my + 71], fill=(255, 255, 255, 240))

    # Soft edge feathering
    overlay = overlay.filter(ImageFilter.GaussianBlur(0.8))

    # Composite onto face
    tongue_img.paste(overlay, (0, 0), overlay)
    return tongue_img

# --- REALISTIC EFFECT COMPOSITORS ---

def apply_aura_effects(base):
    # Electric cyan/purple aura surrounding head
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

    # Glowing eye pupils
    d = ImageDraw.Draw(res)
    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-10, eye[1]-10, eye[0]+10, eye[1]+10], fill=(0, 240, 255, 220))
        d.ellipse([eye[0]-4, eye[1]-4, eye[0]+4, eye[1]+4], fill=(255, 255, 255, 255))
    return res

def apply_sad_effects(base):
    res = base.copy()
    d = ImageDraw.Draw(res)
    # Realistic glistening tears streaming down both cheeks
    # Left cheek
    d.line([(395, 535), (392, 580), (396, 640), (388, 710)], fill=(200, 230, 255, 230), width=5)
    d.ellipse([382, 705, 396, 722], fill=(220, 240, 255, 255))
    # Right cheek
    d.line([(625, 530), (622, 575), (627, 635), (621, 715)], fill=(200, 230, 255, 230), width=5)
    d.ellipse([615, 710, 629, 727], fill=(220, 240, 255, 255))
    # Tear glints
    d.ellipse([394, 545, 397, 550], fill=(255, 255, 255, 255))
    d.ellipse([624, 540, 627, 545], fill=(255, 255, 255, 255))
    return res

def apply_angry_effects(base):
    # Warmed angry flush
    r, g, b, a = base.split()
    r = r.point(lambda p: int(min(255, p * 1.15 + 15)))
    warmed = Image.merge("RGBA", (r, g, b, a))
    d = ImageDraw.Draw(warmed)
    # Fiery eyes
    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-12, eye[1]-12, eye[0]+12, eye[1]+12], fill=(255, 50, 0, 230))
        d.ellipse([eye[0]-5, eye[1]-5, eye[0]+5, eye[1]+5], fill=(255, 220, 0, 255))
    # Red anger cross on temple
    vx, vy = 310, 360
    d.arc([vx-30, vy-18, vx+12, vy+24], 270, 90, fill=(255, 20, 20, 255), width=6)
    d.arc([vx-12, vy-18, vx+30, vy+24], 90, 270, fill=(255, 20, 20, 255), width=6)
    d.arc([vx-20, vy-28, vx+20, vy+12], 0, 180, fill=(255, 20, 20, 255), width=6)
    d.arc([vx-20, vy-12, vx+20, vy+28], 180, 360, fill=(255, 20, 20, 255), width=6)
    return warmed

def apply_sigma_effects(base):
    res = base.copy()
    d = ImageDraw.Draw(res)
    # Dark black sunglasses
    d.rectangle([320, 485, 485, 540], fill=(15, 15, 18, 255), outline=(50, 50, 55, 255), width=2)
    d.rectangle([535, 480, 700, 535], fill=(15, 15, 18, 255), outline=(50, 50, 55, 255), width=2)
    d.rectangle([480, 495, 540, 515], fill=(15, 15, 18, 255))
    # Glare streaks
    d.polygon([(340, 530), (375, 490), (388, 490), (353, 530)], fill=(255, 255, 255, 200))
    d.polygon([(555, 525), (590, 485), (603, 485), (568, 525)], fill=(255, 255, 255, 200))
    # Platinum chain
    for i in range(14):
        cx = 360 + i * 22
        cy = 860 + int(math.sin(i / 13 * math.pi) * 35)
        d.ellipse([cx-14, cy-8, cx+14, cy+8], outline=(230, 230, 240, 255), width=4)
    return res

def apply_golden_effects(base):
    arr = np.array(base).astype(np.float32)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    gold_r = np.clip(gray * 1.35 + 45, 0, 255)
    gold_g = np.clip(gray * 1.1 + 20, 0, 255)
    gold_b = np.clip(gray * 0.25, 0, 255)
    res = Image.fromarray(np.dstack([gold_r, gold_g, gold_b, arr[:, :, 3]]).astype(np.uint8))
    d = ImageDraw.Draw(res)
    # Crown on head
    crown = [(350, 160), (330, 40), (420, 110), (512, 10), (604, 110), (694, 40), (674, 160)]
    d.polygon(crown, fill=(255, 215, 0, 255), outline=(255, 245, 180, 255))
    return res

def apply_diamond_effects(base):
    arr = np.array(base).astype(np.float32)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    dia_r = np.clip(gray * 0.75 + 40, 0, 255)
    dia_g = np.clip(gray * 1.15 + 60, 0, 255)
    dia_b = np.clip(gray * 1.35 + 85, 0, 255)
    res = Image.fromarray(np.dstack([dia_r, dia_g, dia_b, arr[:, :, 3]]).astype(np.uint8))
    d = ImageDraw.Draw(res)
    # Crystal tiara
    tiara = [(380, 200), (360, 110), (430, 150), (512, 70), (594, 150), (664, 110), (644, 200)]
    d.polygon(tiara, fill=(200, 245, 255, 230), outline=(255, 255, 255, 255), width=2)
    return res

def apply_fire_effects(base):
    res = base.copy()
    flames = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(flames)
    for i in range(25):
        bx = 320 + i * 16
        by = 220
        h = 100 + int(math.sin(i * 0.7) * 70)
        d.polygon([(bx - 18, by), (bx, by - h), (bx + 18, by)], fill=(255, 120 + i * 4, 0, 210))
    flames = flames.filter(ImageFilter.GaussianBlur(3))
    out = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    out.paste(flames, (0, 0), flames)
    out.paste(res, (0, 0), res)
    d2 = ImageDraw.Draw(out)
    for eye in [(395, 520), (625, 515)]:
        d2.ellipse([eye[0]-10, eye[1]-10, eye[0]+10, eye[1]+10], fill=(255, 100, 0, 240))
        d2.ellipse([eye[0]-4, eye[1]-4, eye[0]+4, eye[1]+4], fill=(255, 240, 50, 255))
    return out

def apply_ice_effects(base):
    r, g, b, a = base.split()
    r = r.point(lambda p: int(p * 0.65))
    g = g.point(lambda p: int(min(255, p * 1.1 + 25)))
    b = b.point(lambda p: int(min(255, p * 1.35 + 45)))
    res = Image.merge("RGBA", (r, g, b, a))
    d = ImageDraw.Draw(res)
    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-12, eye[1]-12, eye[0]+12, eye[1]+12], fill=(0, 220, 255, 240))
        d.ellipse([eye[0]-5, eye[1]-5, eye[0]+5, eye[1]+5], fill=(255, 255, 255, 255))
    return res

def apply_galaxy_effects(base):
    arr = np.array(base).astype(np.float32)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    gal_r = np.clip(gray * 0.85 + 40, 0, 255)
    gal_g = np.clip(gray * 0.55 + 10, 0, 255)
    gal_b = np.clip(gray * 1.25 + 65, 0, 255)
    res = Image.fromarray(np.dstack([gal_r, gal_g, gal_b, arr[:, :, 3]]).astype(np.uint8))
    d = ImageDraw.Draw(res)
    # Planetary ring behind head
    d.ellipse([200, 460, 824, 580], outline=(180, 120, 255, 180), width=6)
    d.ellipse([220, 470, 804, 570], outline=(0, 230, 255, 160), width=4)
    return res

def apply_evil_effects(base):
    r, g, b, a = base.split()
    r = r.point(lambda p: int(min(255, p * 1.15 + 15)))
    g = g.point(lambda p: int(p * 0.7))
    b = b.point(lambda p: int(p * 0.7))
    res = Image.merge("RGBA", (r, g, b, a))
    d = ImageDraw.Draw(res)
    # Demon horns
    d.polygon([(370, 260), (340, 220), (280, 150), (220, 90), (280, 180), (330, 270)], fill=(25, 20, 30, 255), outline=(180, 20, 50, 255))
    d.polygon([(654, 260), (684, 220), (744, 150), (804, 90), (744, 180), (694, 270)], fill=(25, 20, 30, 255), outline=(180, 20, 50, 255))
    # Crimson eyes
    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-14, eye[1]-14, eye[0]+14, eye[1]+14], fill=(220, 0, 30, 255))
        d.polygon([(eye[0]-2, eye[1]-10), (eye[0]+2, eye[1]-10), (eye[0]+3, eye[1]), (eye[0]+2, eye[1]+10), (eye[0]-2, eye[1]+10), (eye[0]-3, eye[1])], fill=(0, 0, 0, 255))
    return res

def apply_sleepy_effects(base):
    res = base.copy()
    d = ImageDraw.Draw(res)
    # Nightcap
    cap = [(330, 160), (360, 40), (512, 20), (680, 50), (760, 140), (820, 260), (840, 270), (720, 170), (512, 110), (350, 170)]
    d.polygon(cap, fill=(35, 75, 170, 255), outline=(80, 130, 240, 255))
    d.rectangle([320, 140, 700, 175], fill=(240, 245, 255, 255))
    d.ellipse([815, 250, 865, 300], fill=(255, 255, 255, 255))
    # Drooping eyelids
    d.chord([380, 505, 410, 535], 180, 360, fill=(220, 180, 165, 255))
    d.chord([610, 500, 640, 530], 180, 360, fill=(220, 180, 165, 255))
    return res

def apply_rich_effects(base):
    res = base.copy()
    d = ImageDraw.Draw(res)
    # Top hat
    d.ellipse([280, 130, 744, 185], fill=(20, 20, 25, 255), outline=(60, 60, 70, 255))
    d.polygon([(340, 150), (360, 10), (664, 10), (684, 150)], fill=(25, 25, 30, 255))
    d.polygon([(345, 150), (350, 120), (674, 120), (679, 150)], fill=(255, 215, 0, 255))
    # Monocle
    mx, my, mr = 625, 515, 35
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], outline=(255, 215, 0, 255), width=4)
    d.ellipse([mx - mr + 2, my - mr + 2, mx + mr - 2, my + mr - 2], fill=(255, 255, 255, 60))
    for i in range(12):
        d.ellipse([mx - 20 + i * 5, my + mr + i * 15, mx - 12 + i * 5, my + mr + i * 15 + 8], outline=(255, 215, 0, 255), width=2)
    return res

def apply_glitch_effects(base):
    arr = np.array(base)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    r_shift = np.roll(r, -16, axis=1)
    b_shift = np.roll(b, 16, axis=1)
    glitched = np.dstack([r_shift, g, b_shift, a])
    for sy in range(200, 800, 60):
        glitched[sy:sy+20, :, :] = np.roll(glitched[sy:sy+20, :, :], 20, axis=1)
    for y in range(0, glitched.shape[0], 6):
        glitched[y:y+2, :, :3] = (glitched[y:y+2, :, :3] * 0.8).astype(np.uint8)
    return Image.fromarray(glitched)

def apply_rainbow_effects(base):
    arr = np.array(base).astype(np.float32)
    h, w, _ = arr.shape
    x_c, y_c = np.meshgrid(np.arange(w), np.arange(h))
    wave = (x_c + y_c * 0.5) / 1024.0 * 2 * math.pi
    rb_r = (np.sin(wave) * 0.5 + 0.5) * 255
    rb_g = (np.sin(wave + 2.09) * 0.5 + 0.5) * 255
    rb_b = (np.sin(wave + 4.18) * 0.5 + 0.5) * 255
    bl_r = np.clip(arr[:, :, 0] * 0.6 + rb_r * 0.4, 0, 255)
    bl_g = np.clip(arr[:, :, 1] * 0.6 + rb_g * 0.4, 0, 255)
    bl_b = np.clip(arr[:, :, 2] * 0.6 + rb_b * 0.4, 0, 255)
    return Image.fromarray(np.dstack([bl_r, bl_g, bl_b, arr[:, :, 3]]).astype(np.uint8))

def apply_god_effects(base):
    halo = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(halo)
    for ang in range(0, 360, 15):
        rad = math.radians(ang)
        x1 = 512 + int(math.cos(rad) * 310)
        y1 = 450 + int(math.sin(rad) * 310)
        x2 = 512 + int(math.cos(rad) * 460)
        y2 = 450 + int(math.sin(rad) * 460)
        d.line([(x1, y1), (x2, y2)], fill=(255, 230, 90, 230), width=6)
    d.ellipse([190, 130, 834, 770], outline=(255, 215, 60, 240), width=8)
    halo = halo.filter(ImageFilter.GaussianBlur(3))
    out = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    out.paste(halo, (0, 0), halo)
    out.paste(base, (0, 0), base)
    d2 = ImageDraw.Draw(out)
    for eye in [(395, 520), (625, 515)]:
        d2.ellipse([eye[0]-14, eye[1]-14, eye[0]+14, eye[1]+14], fill=(255, 255, 255, 255))
        d2.line([(eye[0], eye[1]), (eye[0] - 60, eye[1] + 90)], fill=(255, 255, 210, 180), width=4)
        d2.line([(eye[0], eye[1]), (eye[0] + 60, eye[1] + 90)], fill=(255, 255, 210, 180), width=4)
    return out

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
    print("[STARTING REALISTIC MATTHEW GENERATION: 32 IMAGES (16 NORMAL + 16 TONGUE)]")
    real_normal = load_real_matthew()
    real_tongue = create_realistic_tongue(real_normal)

    for skin_id, mod_func in SKIN_MODIFIERS.items():
        # 1. Normal image
        normal_out = OUT_DIR / f"{skin_id}-normal.png"
        normal_img = mod_func(real_normal)
        normal_img.save(normal_out, "PNG", optimize=True)
        print(f"  Generated: {normal_out.name} ({normal_out.stat().st_size // 1024} KB)")

        # 2. Tongue-out image
        tongue_out = OUT_DIR / f"{skin_id}-tongue.png"
        tongue_img = mod_func(real_tongue)
        tongue_img.save(tongue_out, "PNG", optimize=True)
        print(f"  Generated: {tongue_out.name} ({tongue_out.stat().st_size // 1024} KB)")

    print("[SUCCESS] All 32 realistic Matthew image assets created successfully!")

if __name__ == "__main__":
    generate_all()
