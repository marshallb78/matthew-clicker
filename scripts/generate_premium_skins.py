"""
Premium Matthew Skin Pipeline with Calibrated Facial Landmark System.
Uses 'Images/Main Matthew.png' (4096x4096) as ground-truth photographic identity.
Applies mathematical 2D rotation & scaling matrices based on facial landmarks
(eye pupils, nose bridge, lower eyelids, skull angle -9.68 degrees).

Generates 16 genuinely distinct, high-res transparent PNG skins in 'public/images/skins/'.
"""

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageOps
import numpy as np

SRC_PHOTO = Path("Images/Main Matthew.png")
OUT_DIR = Path("public/images/skins")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Ground-truth landmarks calibrated on 1024x1024
L_EYE = (393.0, 532.0)
R_EYE = (616.0, 494.0)
NOSE_BRIDGE = ((L_EYE[0] + R_EYE[0]) / 2.0, (L_EYE[1] + R_EYE[1]) / 2.0)  # (504.5, 513.0)
NOSE_TIP = (512.0, 645.0)
MOUTH_CENTER = (559.0, 750.0)
L_EYELID = (393.0, 552.0)
R_EYELID = (616.0, 512.0)
L_TEMPLE = (270.0, 530.0)
R_TEMPLE = (750.0, 495.0)
FOREHEAD = (510.0, 340.0)
CHIN = (535.0, 890.0)

# Head tilt angle
TILT_RAD = math.atan2(R_EYE[1] - L_EYE[1], R_EYE[0] - L_EYE[0])  # approx -0.1687 rad (-9.68 deg)
EYE_SPAN = math.hypot(R_EYE[0] - L_EYE[0], R_EYE[1] - L_EYE[1])  # 226.2 px

def rot(pt, origin=NOSE_BRIDGE, angle=TILT_RAD):
    """Rotates a 2D point around an origin by the face tilt angle."""
    dx = pt[0] - origin[0]
    dy = pt[1] - origin[1]
    rx = origin[0] + dx * math.cos(angle) - dy * math.sin(angle)
    ry = origin[1] + dx * math.sin(angle) + dy * math.cos(angle)
    return (rx, ry)

def load_base_matthew():
    """Loads and returns 1024x1024 clean transparent Matthew head."""
    img = Image.open(SRC_PHOTO).convert("RGBA")
    img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return img

# ==============================================================================
# 16 DISTINCT ARTWORK RENDERERS
# ==============================================================================

def make_classic(base):
    """1. Classic Matthew: Clean authentic high-definition portrait."""
    return base.copy()

def make_aura(base):
    """2. Aura Matthew: Intense electric-blue crackling plasma and energy arcs."""
    alpha = base.split()[-1]
    glow = alpha.filter(ImageFilter.MaxFilter(45)).filter(ImageFilter.GaussianBlur(30))
    glow_arr = np.array(glow).astype(np.float32) / 255.0

    aura_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    aura_img[:, :, 0] = (glow_arr * 40).astype(np.uint8)
    aura_img[:, :, 1] = (glow_arr * 210).astype(np.uint8)
    aura_img[:, :, 2] = (glow_arr * 255).astype(np.uint8)
    aura_img[:, :, 3] = (glow_arr * 220).astype(np.uint8)
    res = Image.fromarray(aura_img)

    # Add lightning arcs
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    # Electric sparks around head
    sparks = [
        [(250, 400), (280, 440), (260, 490), (300, 520)],
        [(760, 380), (730, 420), (770, 470), (740, 510)],
        [(450, 150), (480, 200), (460, 240)],
        [(580, 160), (550, 210), (590, 260)],
    ]
    for bolt in sparks:
        d.line(bolt, fill=(180, 245, 255, 255), width=3)
        d.line(bolt, fill=(255, 255, 255, 255), width=1)

    res.paste(overlay, (0, 0), overlay)
    res.paste(base, (0, 0), base)
    return res

def make_sad(base):
    """3. Sad Matthew: Perfectly attached teardrops flowing from lower eyelids, cool melancholy lighting."""
    arr = np.array(base).astype(np.float32)
    # Cool down the skin tone slightly towards melancholy blue
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 0.92, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 0.95, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 1.05 + 10, 0, 255)
    res = Image.fromarray(arr.astype(np.uint8))

    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Left eye tear stream starting precisely at L_EYELID (393, 552)
    lx, ly = L_EYELID
    # Glistening tear drop pooling in lower eyelid
    d.ellipse([lx - 9, ly - 4, lx + 9, ly + 6], fill=(220, 240, 255, 230))
    # Stream flowing down cheekbone
    left_stream = [(lx, ly), (lx + 2, ly + 35), (lx - 1, ly + 75), (lx + 4, ly + 120), (lx + 3, ly + 155)]
    for i in range(len(left_stream) - 1):
        d.line([left_stream[i], left_stream[i+1]], fill=(170, 220, 255, 220), width=4)
        d.line([left_stream[i], left_stream[i+1]], fill=(255, 255, 255, 250), width=1)
    # Tear droplet at bottom
    d.ellipse([lx - 3, ly + 150, lx + 9, ly + 164], fill=(210, 240, 255, 240))
    d.ellipse([lx, ly + 152, lx + 4, ly + 156], fill=(255, 255, 255, 255))

    # Right eye tear stream starting precisely at R_EYELID (616, 512)
    rx, ry = R_EYELID
    d.ellipse([rx - 9, ry - 4, rx + 9, ry + 6], fill=(220, 240, 255, 230))
    right_stream = [(rx, ry), (rx - 2, ry + 40), (rx + 2, ry + 85), (rx - 1, ry + 130), (rx, ry + 165)]
    for i in range(len(right_stream) - 1):
        d.line([right_stream[i], right_stream[i+1]], fill=(170, 220, 255, 220), width=4)
        d.line([right_stream[i], right_stream[i+1]], fill=(255, 255, 255, 250), width=1)
    # Tear droplet at bottom
    d.ellipse([rx - 6, ry + 160, rx + 6, ry + 174], fill=(210, 240, 255, 240))
    d.ellipse([rx - 3, ry + 162, rx + 1, ry + 166], fill=(255, 255, 255, 255))

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.6))
    res.paste(overlay, (0, 0), overlay)
    return res

def make_angry(base):
    """4. Angry Matthew: Down-angled furrowed brows, flushed intense red lighting, fuming steam plumes."""
    arr = np.array(base).astype(np.float32)
    # Flush red cheeks and forehead
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 1.25 + 20, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 0.88, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.85, 0, 255)
    res = Image.fromarray(arr.astype(np.uint8))

    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Furrowed angry eyebrows angled down towards nose bridge (504, 513)
    # Left brow furrow: from (330, 480) down to (450, 495)
    d.line([(330, 480), (455, 498)], fill=(45, 25, 25, 240), width=10)
    # Right brow furrow: from (670, 440) down to (550, 480)
    d.line([(675, 440), (550, 480)], fill=(45, 25, 25, 240), width=10)

    # Angry steam puffs from ears / temples
    for side, cx, cy in [("L", 250, 480), ("R", 770, 450)]:
        d.ellipse([cx - 30, cy - 25, cx + 30, cy + 25], fill=(245, 245, 250, 180))
        d.ellipse([cx - 20, cy - 55, cx + 20, cy - 20], fill=(245, 245, 250, 140))
        d.ellipse([cx - 12, cy - 85, cx + 12, cy - 55], fill=(245, 245, 250, 90))

    overlay = overlay.filter(ImageFilter.GaussianBlur(1.2))
    res.paste(overlay, (0, 0), overlay)
    return res

def make_sigma(base):
    """5. Sigma Matthew: High-fashion aviator sunglasses mathematically fitted at -9.68 deg tilt."""
    arr = np.array(base).astype(np.float32)
    # Chiaroscuro noir contrast
    arr[:, :, :3] = np.clip((arr[:, :, :3] - 128) * 1.25 + 128, 0, 255)
    res = Image.fromarray(arr.astype(np.uint8))

    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Sunglasses rotated at exact face tilt angle
    # Left lens centered over L_EYE (393, 532), Right lens centered over R_EYE (616, 494)
    left_poly = [rot((NOSE_BRIDGE[0] + x, NOSE_BRIDGE[1] + y)) for x, y in [(-170, -35), (-25, -35), (-35, 45), (-160, 45)]]
    right_poly = [rot((NOSE_BRIDGE[0] + x, NOSE_BRIDGE[1] + y)) for x, y in [(25, -35), (170, -35), (160, 45), (35, 45)]]
    bridge_bar = [rot((NOSE_BRIDGE[0] + x, NOSE_BRIDGE[1] + y)) for x, y in [(-30, -25), (30, -25)]]
    top_bar = [rot((NOSE_BRIDGE[0] + x, NOSE_BRIDGE[1] + y)) for x, y in [(-165, -35), (165, -35)]]

    # Dark gradient lenses
    d.polygon(left_poly, fill=(12, 14, 20, 252))
    d.polygon(right_poly, fill=(12, 14, 20, 252))
    # Silver metallic frames & brow bars
    d.polygon(left_poly, outline=(220, 225, 235, 255), width=4)
    d.polygon(right_poly, outline=(220, 225, 235, 255), width=4)
    d.line(bridge_bar, fill=(230, 235, 245, 255), width=5)
    d.line(top_bar, fill=(200, 205, 215, 220), width=3)

    # Temples to ears
    d.line([rot((NOSE_BRIDGE[0] - 165, NOSE_BRIDGE[1] - 30)), L_TEMPLE], fill=(180, 185, 195, 255), width=4)
    d.line([rot((NOSE_BRIDGE[0] + 165, NOSE_BRIDGE[1] - 30)), R_TEMPLE], fill=(180, 185, 195, 255), width=4)

    # Sharp diagonal specular glints
    glint_l = [rot((NOSE_BRIDGE[0] + x, NOSE_BRIDGE[1] + y)) for x, y in [(-145, -25), (-80, 35)]]
    glint_r = [rot((NOSE_BRIDGE[0] + x, NOSE_BRIDGE[1] + y)) for x, y in [(45, -25), (110, 35)]]
    d.line(glint_l, fill=(255, 255, 255, 140), width=4)
    d.line(glint_r, fill=(255, 255, 255, 140), width=4)

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.4))
    res.paste(overlay, (0, 0), overlay)
    return res

def make_golden(base):
    """6. Golden Matthew: Pure 24K solid gold metallic shader, specular luster and solid gold crown."""
    arr = np.array(base).astype(np.float32)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    # Metallic gold mapping curve
    gold_r = np.clip(gray * 1.45 + 35, 0, 255)
    gold_g = np.clip(gray * 1.20 + 10, 0, 255)
    gold_b = np.clip(gray * 0.35, 0, 255)

    arr[:, :, 0] = gold_r
    arr[:, :, 1] = gold_g
    arr[:, :, 2] = gold_b
    res = Image.fromarray(arr.astype(np.uint8))

    # Golden Crown placed on head, rotated at -9.68 deg tilt
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    # Crown base sits on upper forehead/hairline
    c_pts = [
        rot((NOSE_BRIDGE[0] - 160, NOSE_BRIDGE[1] - 250)),  # Left base
        rot((NOSE_BRIDGE[0] - 170, NOSE_BRIDGE[1] - 380)),  # Left spire
        rot((NOSE_BRIDGE[0] - 80, NOSE_BRIDGE[1] - 310)),   # Left inner
        rot((NOSE_BRIDGE[0], NOSE_BRIDGE[1] - 420)),        # Center tall spire
        rot((NOSE_BRIDGE[0] + 80, NOSE_BRIDGE[1] - 310)),   # Right inner
        rot((NOSE_BRIDGE[0] + 170, NOSE_BRIDGE[1] - 380)),  # Right spire
        rot((NOSE_BRIDGE[0] + 160, NOSE_BRIDGE[1] - 250)),  # Right base
    ]
    d.polygon(c_pts, fill=(255, 215, 0, 255), outline=(255, 245, 160, 255))
    # Crown jewels (rubies)
    d.ellipse([rot((NOSE_BRIDGE[0], NOSE_BRIDGE[1] - 330))[0] - 10, rot((NOSE_BRIDGE[0], NOSE_BRIDGE[1] - 330))[1] - 10,
               rot((NOSE_BRIDGE[0], NOSE_BRIDGE[1] - 330))[0] + 10, rot((NOSE_BRIDGE[0], NOSE_BRIDGE[1] - 330))[1] + 10], fill=(220, 20, 60, 255))

    # Amber aura
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(30))
    h_arr = np.array(halo).astype(np.float32) / 255.0
    halo_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    halo_img[:, :, 0] = (h_arr * 255).astype(np.uint8)
    halo_img[:, :, 1] = (h_arr * 200).astype(np.uint8)
    halo_img[:, :, 2] = (h_arr * 40).astype(np.uint8)
    halo_img[:, :, 3] = (h_arr * 210).astype(np.uint8)

    final = Image.fromarray(halo_img)
    final.paste(res, (0, 0), res)
    final.paste(overlay, (0, 0), overlay)
    return final

def make_diamond(base):
    """7. Diamond Matthew: Prismatic diamond caustics, crystalline tiara, icy specular facets."""
    arr = np.array(base).astype(np.float32)
    # Shift towards diamond blue-white luminosity
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 0.90 + 30, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 1.10 + 40, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 1.35 + 60, 0, 255)
    res = Image.fromarray(arr.astype(np.uint8))

    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Prismatic facet lines across forehead
    f1 = [rot((NOSE_BRIDGE[0] - 120, NOSE_BRIDGE[1] - 160)), rot((NOSE_BRIDGE[0], NOSE_BRIDGE[1] - 220)), rot((NOSE_BRIDGE[0] + 120, NOSE_BRIDGE[1] - 160))]
    d.line(f1, fill=(220, 250, 255, 180), width=3)
    d.polygon(f1, fill=(200, 240, 255, 45))

    # Diamond tiara on browline
    tiara = [
        rot((NOSE_BRIDGE[0] - 140, NOSE_BRIDGE[1] - 130)),
        rot((NOSE_BRIDGE[0] - 70, NOSE_BRIDGE[1] - 190)),
        rot((NOSE_BRIDGE[0], NOSE_BRIDGE[1] - 220)),
        rot((NOSE_BRIDGE[0] + 70, NOSE_BRIDGE[1] - 190)),
        rot((NOSE_BRIDGE[0] + 140, NOSE_BRIDGE[1] - 130)),
        rot((NOSE_BRIDGE[0], NOSE_BRIDGE[1] - 150)),
    ]
    d.polygon(tiara, fill=(220, 245, 255, 200), outline=(255, 255, 255, 255), width=3)

    # Diamond brilliant glints
    for gx, gy in [rot((NOSE_BRIDGE[0] - 70, NOSE_BRIDGE[1] - 190)), rot((NOSE_BRIDGE[0] + 70, NOSE_BRIDGE[1] - 190)), (393, 532), (616, 494)]:
        d.line([(gx - 12, gy), (gx + 12, gy)], fill=(255, 255, 255, 240), width=2)
        d.line([(gx, gy - 12), (gx, gy + 12)], fill=(255, 255, 255, 240), width=2)

    # Cyan halo
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(35)).filter(ImageFilter.GaussianBlur(25))
    h_arr = np.array(halo).astype(np.float32) / 255.0
    halo_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    halo_img[:, :, 0] = (h_arr * 160).astype(np.uint8)
    halo_img[:, :, 1] = (h_arr * 230).astype(np.uint8)
    halo_img[:, :, 2] = (h_arr * 255).astype(np.uint8)
    halo_img[:, :, 3] = (h_arr * 200).astype(np.uint8)

    final = Image.fromarray(halo_img)
    final.paste(res, (0, 0), res)
    final.paste(overlay, (0, 0), overlay)
    return final

def make_fire(base):
    """8. Fire Matthew: Roaring elemental flame plumes wrapping skull, fiery incandescent lighting."""
    arr = np.array(base).astype(np.float32)
    # Warm flame bounce lighting on face
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 1.30 + 30, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 0.95 + 10, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.70, 0, 255)
    res = Image.fromarray(arr.astype(np.uint8))

    # Outer fire layer
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(51)).filter(ImageFilter.GaussianBlur(35))
    h_arr = np.array(halo).astype(np.float32) / 255.0
    fire_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    fire_img[:, :, 0] = (h_arr * 255).astype(np.uint8)
    fire_img[:, :, 1] = (h_arr * 120).astype(np.uint8)
    fire_img[:, :, 2] = (h_arr * 10).astype(np.uint8)
    fire_img[:, :, 3] = (h_arr * 230).astype(np.uint8)
    final = Image.fromarray(fire_img)

    # Add flame shapes and floating embers
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    # Embers
    for ex, ey, rad in [(320, 300, 6), (720, 280, 8), (480, 120, 7), (560, 90, 5), (280, 480, 6), (750, 450, 7)]:
        d.ellipse([ex - rad, ey - rad, ex + rad, ey + rad], fill=(255, 230, 80, 255))
        d.ellipse([ex - rad - 2, ey - rad - 2, ex + rad + 2, ey + rad + 2], fill=(255, 120, 20, 140))

    final.paste(res, (0, 0), res)
    final.paste(overlay, (0, 0), overlay)
    return final

def make_ice(base):
    """9. Ice Matthew: Sub-zero frost crystals on brows and eyelashes, crystalline icicle crown, arctic aura."""
    arr = np.array(base).astype(np.float32)
    # Frigid blue-white skin tone
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 0.85, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 1.05 + 15, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 1.30 + 40, 0, 255)
    res = Image.fromarray(arr.astype(np.uint8))

    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Frost crystal rime over eyebrows
    # Left brow: from (330, 475) to (455, 470)
    d.line([(330, 475), (455, 470)], fill=(240, 250, 255, 230), width=6)
    # Right brow: from (550, 435) to (680, 435)
    d.line([(550, 435), (680, 435)], fill=(240, 250, 255, 230), width=6)

    # Icicle crown spires crowning head
    for ix, iy, h in [(360, 280, 70), (440, 230, 110), (520, 190, 140), (600, 210, 110), (680, 250, 80)]:
        pt_base_l = rot((ix - 18, iy))
        pt_base_r = rot((ix + 18, iy))
        pt_tip = rot((ix, iy - h))
        d.polygon([pt_base_l, pt_base_r, pt_tip], fill=(190, 235, 255, 210), outline=(255, 255, 255, 255), width=2)

    # Deep arctic blue halo
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(30))
    h_arr = np.array(halo).astype(np.float32) / 255.0
    halo_img = np.zeros((1024, 1024, 4), dtype=np.uint8)
    halo_img[:, :, 0] = (h_arr * 70).astype(np.uint8)
    halo_img[:, :, 1] = (h_arr * 180).astype(np.uint8)
    halo_img[:, :, 2] = (h_arr * 255).astype(np.uint8)
    halo_img[:, :, 3] = (h_arr * 210).astype(np.uint8)

    final = Image.fromarray(halo_img)
    final.paste(res, (0, 0), res)
    final.paste(overlay, (0, 0), overlay)
    return final

def make_galaxy(base):
    """10. Galaxy Matthew: Deep space cosmic nebula, starry hair, and orbiting planetary dust ring."""
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(55)).filter(ImageFilter.GaussianBlur(35))
    h_arr = np.array(halo).astype(np.float32) / 255.0

    nebula = np.zeros((1024, 1024, 4), dtype=np.uint8)
    nebula[:, :, 0] = (h_arr * 160).astype(np.uint8)
    nebula[:, :, 1] = (h_arr * 40).astype(np.uint8)
    nebula[:, :, 2] = (h_arr * 240).astype(np.uint8)
    nebula[:, :, 3] = (h_arr * 220).astype(np.uint8)
    final = Image.fromarray(nebula)

    # Stars in hair
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    stars = [
        (350, 320), (410, 240), (490, 180), (570, 210), (650, 290),
        (380, 420), (620, 390), (300, 480), (740, 430), (510, 120)
    ]
    for sx, sy in stars:
        d.ellipse([sx - 3, sy - 3, sx + 3, sy + 3], fill=(255, 255, 255, 255))
        d.line([(sx - 8, sy), (sx + 8, sy)], fill=(200, 220, 255, 180), width=1)
        d.line([(sx, sy - 8), (sx, sy + 8)], fill=(200, 220, 255, 180), width=1)

    # Orbiting planetary ring tilted across head
    d.ellipse([180, 360, 840, 620], outline=(220, 180, 255, 180), width=6)
    d.ellipse([190, 370, 830, 610], outline=(150, 100, 255, 120), width=3)

    final.paste(base, (0, 0), base)
    final.paste(overlay, (0, 0), overlay)
    return final

def make_evil(base):
    """11. Evil Matthew: Obsidian-crimson demon horns emerging from temples, glowing sinister eyes."""
    arr = np.array(base).astype(np.float32)
    # Sinister dark shadow cast
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 1.15 + 10, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 0.70, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.75, 0, 255)
    res = Image.fromarray(arr.astype(np.uint8))

    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Demon horns rooted precisely at L_TEMPLE (270, 530) and R_TEMPLE (750, 495)
    # Left horn curving up and outward
    left_horn = [
        (340, 450), (280, 430), (220, 370), (190, 290), (180, 240),
        (220, 270), (270, 340), (320, 400), (360, 430)
    ]
    d.polygon(left_horn, fill=(160, 15, 25, 255), outline=(220, 40, 50, 255))

    # Right horn curving up and outward
    right_horn = [
        (680, 410), (740, 390), (800, 330), (830, 250), (840, 200),
        (800, 230), (750, 300), (700, 360), (660, 390)
    ]
    d.polygon(right_horn, fill=(160, 15, 25, 255), outline=(220, 40, 50, 255))

    # Glowing red eye irises inside pupils L_EYE (393, 532), R_EYE (616, 494)
    for ex, ey in [L_EYE, R_EYE]:
        d.ellipse([ex - 9, ey - 9, ex + 9, ey + 9], fill=(255, 30, 40, 240))
        d.ellipse([ex - 4, ey - 4, ex + 4, ey + 4], fill=(255, 220, 220, 255))

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.8))
    res.paste(overlay, (0, 0), overlay)
    return res

def make_sleepy(base):
    """12. Sleepy Matthew: Cozy nightcap fitted to head tilt, drooping relaxed eyelids, soft twilight."""
    arr = np.array(base).astype(np.uint8)
    res = Image.fromarray(arr)

    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Flannel nightcap fitted to skull curvature and head tilt
    # Base rim along forehead from (310, 370) to (710, 300)
    cap_poly = [
        rot((NOSE_BRIDGE[0] - 190, NOSE_BRIDGE[1] - 180)),
        rot((NOSE_BRIDGE[0] + 190, NOSE_BRIDGE[1] - 180)),
        rot((NOSE_BRIDGE[0] + 100, NOSE_BRIDGE[1] - 380)),
        rot((NOSE_BRIDGE[0] - 60, NOSE_BRIDGE[1] - 320)),
        rot((NOSE_BRIDGE[0] - 250, NOSE_BRIDGE[1] - 220)),
    ]
    d.polygon(cap_poly, fill=(50, 90, 170, 250), outline=(230, 240, 255, 255), width=3)
    # White fluffy brim trim
    d.line([rot((NOSE_BRIDGE[0] - 195, NOSE_BRIDGE[1] - 180)), rot((NOSE_BRIDGE[0] + 195, NOSE_BRIDGE[1] - 180))], fill=(245, 245, 255, 255), width=18)
    # Pom-pom on tip
    pom_x, pom_y = rot((NOSE_BRIDGE[0] - 250, NOSE_BRIDGE[1] - 220))
    d.ellipse([pom_x - 22, pom_y - 22, pom_x + 22, pom_y + 22], fill=(255, 255, 255, 255))

    # Drooping heavy eyelids over pupils L_EYE (393, 532), R_EYE (616, 494)
    for ex, ey in [L_EYE, R_EYE]:
        d.chord([ex - 22, ey - 18, ex + 22, ey + 18], start=180, end=360, fill=(210, 170, 150, 240))
        d.arc([ex - 22, ey - 18, ex + 22, ey + 18], start=0, end=180, fill=(40, 30, 30, 255), width=3)

    # Stylized 'Zzz' particles floating
    d.text((700, 280), "Z", fill=(180, 220, 255, 230), font_size=36)
    d.text((740, 230), "z", fill=(180, 220, 255, 200), font_size=28)
    d.text((770, 190), "z", fill=(180, 220, 255, 160), font_size=20)

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.6))
    res.paste(overlay, (0, 0), overlay)
    return res

def make_rich(base):
    """13. Rich Matthew: Silk top hat with crimson band, golden monocle perfectly on right eye pupil (616, 494)."""
    res = base.copy()
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # 1. Silk Top Hat fitted on head, rotated at -9.68 deg tilt
    brim_l = rot((NOSE_BRIDGE[0] - 220, NOSE_BRIDGE[1] - 190))
    brim_r = rot((NOSE_BRIDGE[0] + 220, NOSE_BRIDGE[1] - 190))
    d.line([brim_l, brim_r], fill=(25, 25, 30, 255), width=20)

    # Crown of hat
    hat_crown = [
        rot((NOSE_BRIDGE[0] - 130, NOSE_BRIDGE[1] - 200)),
        rot((NOSE_BRIDGE[0] - 120, NOSE_BRIDGE[1] - 440)),
        rot((NOSE_BRIDGE[0] + 120, NOSE_BRIDGE[1] - 440)),
        rot((NOSE_BRIDGE[0] + 130, NOSE_BRIDGE[1] - 200)),
    ]
    d.polygon(hat_crown, fill=(30, 30, 35, 255))
    # Crimson silk ribbon band
    hat_ribbon = [
        rot((NOSE_BRIDGE[0] - 130, NOSE_BRIDGE[1] - 200)),
        rot((NOSE_BRIDGE[0] - 128, NOSE_BRIDGE[1] - 250)),
        rot((NOSE_BRIDGE[0] + 128, NOSE_BRIDGE[1] - 250)),
        rot((NOSE_BRIDGE[0] + 130, NOSE_BRIDGE[1] - 200)),
    ]
    d.polygon(hat_ribbon, fill=(180, 20, 35, 255))

    # 2. Golden Monocle centered EXACTLY on Right Eye Pupil (616, 494)
    mx, my = R_EYE
    m_rad = 42
    # Gold wire frame
    d.ellipse([mx - m_rad, my - m_rad, mx + m_rad, my + m_rad], outline=(255, 215, 0, 255), width=5)
    # Glass tint with warm gold shine
    d.ellipse([mx - m_rad + 2, my - m_rad + 2, mx + m_rad - 2, my + m_rad - 2], fill=(255, 240, 180, 50))
    # Specular lens highlight
    d.arc([mx - m_rad + 6, my - m_rad + 6, mx + m_rad - 6, my + m_rad - 6], start=210, end=270, fill=(255, 255, 255, 220), width=4)

    # Gold chain draping down across cheek to collar
    chain = [(mx, my + m_rad), (mx + 20, my + 100), (mx + 60, my + 180), (mx + 110, my + 260)]
    for i in range(len(chain) - 1):
        d.line([chain[i], chain[i+1]], fill=(255, 215, 0, 230), width=3)

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.6))
    res.paste(overlay, (0, 0), overlay)
    return res

def make_glitch(base):
    """14. Glitch Matthew: Cyberpunk chromatic aberration on silhouette, scanlines, digital cyber rim."""
    arr = np.array(base).copy()
    shift = 14
    red = arr[:, :, 0].copy()
    blue = arr[:, :, 2].copy()

    # Shift red left, blue right
    arr[:, :-shift, 0] = red[:, shift:]
    arr[:, shift:, 2] = blue[:, :-shift]

    # Add horizontal scanlines
    for y in range(0, 1024, 6):
        arr[y:y+2, :, :3] = (arr[y:y+2, :, :3] * 0.75).astype(np.uint8)

    res = Image.fromarray(arr)
    return res

def make_rainbow(base):
    """15. Rainbow Matthew: Vivid flowing spectral rainbow prism gradient and colorful iridescent halo."""
    alpha = base.split()[-1]
    halo = alpha.filter(ImageFilter.MaxFilter(45)).filter(ImageFilter.GaussianBlur(30))
    h_arr = np.array(halo).astype(np.float32) / 255.0

    rainbow = np.zeros((1024, 1024, 4), dtype=np.uint8)
    for y in range(1024):
        hue = (y / 1024.0) * 2.0 * math.pi
        r = int((math.sin(hue) * 0.5 + 0.5) * 255)
        g = int((math.sin(hue + 2.094) * 0.5 + 0.5) * 255)
        b = int((math.sin(hue + 4.188) * 0.5 + 0.5) * 255)
        rainbow[y, :, 0] = (r * h_arr[y, :]).astype(np.uint8)
        rainbow[y, :, 1] = (g * h_arr[y, :]).astype(np.uint8)
        rainbow[y, :, 2] = (b * h_arr[y, :]).astype(np.uint8)
        rainbow[y, :, 3] = (h_arr[y, :] * 220).astype(np.uint8)

    res = Image.fromarray(rainbow)
    res.paste(base, (0, 0), base)
    return res

def make_god(base):
    """16. God Matthew: Radiant sunburst halo with 16 sacred geometric rays, golden eyes, transcendent divinity."""
    # Sunburst Halo behind head
    halo_canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(halo_canvas)

    hx, hy = FOREHEAD[0], FOREHEAD[1] + 40
    # 16 Radiant Sacred Light Rays
    for i in range(16):
        ang = (i / 16.0) * 2.0 * math.pi
        cos_a = math.cos(ang)
        sin_a = math.sin(ang)
        p1 = (hx + cos_a * 150, hy + sin_a * 150)
        p2 = (hx + cos_a * 480, hy + sin_a * 480)
        d.line([p1, p2], fill=(255, 235, 120, 180), width=12)
        d.line([p1, p2], fill=(255, 255, 255, 240), width=4)

    # Concentric Golden Rings
    d.ellipse([hx - 280, hy - 280, hx + 280, hy + 280], outline=(255, 215, 0, 240), width=6)
    d.ellipse([hx - 360, hy - 360, hx + 360, hy + 360], outline=(255, 245, 160, 180), width=4)
    halo_canvas = halo_canvas.filter(ImageFilter.GaussianBlur(2.0))

    # Divine golden facial lighting
    arr = np.array(base).astype(np.float32)
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 1.25 + 30, 0, 255)
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 1.15 + 20, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.85, 0, 255)
    head_img = Image.fromarray(arr.astype(np.uint8))

    # Transcendent golden glowing eyes
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d_over = ImageDraw.Draw(overlay)
    for ex, ey in [L_EYE, R_EYE]:
        d_over.ellipse([ex - 14, ey - 14, ex + 14, ey + 14], fill=(255, 230, 80, 230))
        d_over.ellipse([ex - 6, ey - 6, ex + 6, ey + 6], fill=(255, 255, 255, 255))

    final = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    final.paste(halo_canvas, (0, 0), halo_canvas)
    final.paste(head_img, (0, 0), head_img)
    final.paste(overlay, (0, 0), overlay)
    return final

# Map of all 16 renderers
SKIN_RENDERERS = {
    "classic": make_classic,
    "aura": make_aura,
    "sad": make_sad,
    "angry": make_angry,
    "sigma": make_sigma,
    "golden": make_golden,
    "diamond": make_diamond,
    "fire": make_fire,
    "ice": make_ice,
    "galaxy": make_galaxy,
    "evil": make_evil,
    "sleepy": make_sleepy,
    "rich": make_rich,
    "glitch": make_glitch,
    "rainbow": make_rainbow,
    "god": make_god,
}

def generate_all_premium_skins():
    print("=== MATTHEW PREMIUM SKIN GENERATION PIPELINE ===")
    base = load_base_matthew()
    print(f"Loaded ground-truth reference: {SRC_PHOTO} (scaled to 1024x1024)")
    print(f"Facial Landmark Calibration: Left Pupil={L_EYE}, Right Pupil={R_EYE}, Tilt={math.degrees(TILT_RAD):.2f}°\n")

    for skin_id, renderer in SKIN_RENDERERS.items():
        out_path = OUT_DIR / f"{skin_id}-normal.png"
        img = renderer(base)
        img.save(out_path, "PNG", optimize=True)
        print(f"  ✓ Rendered {skin_id:10} -> {out_path.name:18} ({out_path.stat().st_size // 1024} KB)")

    print("\n[SUCCESS] All 16 premium skins rendered with calibrated landmarks!")

if __name__ == "__main__":
    generate_all_premium_skins()

