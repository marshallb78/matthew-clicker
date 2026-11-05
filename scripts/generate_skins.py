"""
Skin Asset Generator for Matthew Clicker.
Generates 16 high-quality, game-ready character skins from the base Matthew portrait.
Preserves Matthew's facial likeness, hair, and framing while applying distinct artistic treatments.
Exports clean transparent 1024x1024 PNGs.
"""

import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops
import numpy as np

BASE_PATH = Path("public/images/skins/classic_matthew.png")
OUTPUT_DIR = Path("public/images/skins")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Matthew's facial landmark approximations on 1024x1024 image
# Head center is around (512, 512)
# Eyes: Left ~(395, 520), Right ~(625, 515)
# Nose: ~(505, 630)
# Mouth: ~(510, 750)
# Forehead: ~(510, 390)
# Hair Top: ~(510, 180)
# Left Ear: ~(250, 620), Right Ear: ~(780, 600)


def load_base():
    img = Image.open(BASE_PATH).convert("RGBA")
    if img.size != (1024, 1024):
        img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
    return img


def draw_glow_circle(draw, center, radius, color, width=1):
    x, y = center
    for r in range(radius - width, radius + width):
        alpha = int(color[3] * (1 - abs(r - radius) / (width + 1)))
        draw.ellipse([x - r, y - r, x + r, y + r], outline=(color[0], color[1], color[2], alpha))


def draw_sparkle(draw, center, size, color):
    x, y = center
    # 4-point star sparkle
    points = [
        (x, y - size),
        (x + size * 0.25, y - size * 0.25),
        (x + size, y),
        (x + size * 0.25, y + size * 0.25),
        (x, y + size),
        (x - size * 0.25, y + size * 0.25),
        (x - size, y),
        (x - size * 0.25, y - size * 0.25),
    ]
    draw.polygon(points, fill=color)
    # Center white dot
    draw.ellipse([x - size * 0.2, y - size * 0.2, x + size * 0.2, y + size * 0.2], fill=(255, 255, 255, 255))


# 1. CLASSIC MATTHEW
def make_classic(base):
    return base.copy()


# 2. AURA MATTHEW (Super Saiyan Cyan/Violet Energy Aura)
def make_aura(base):
    img = base.copy()
    alpha = base.split()[-1]

    # Create outward aura glow
    aura_layer = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    aura_draw = ImageDraw.Draw(aura_layer)

    # Dilated mask for aura
    dilated = alpha.filter(ImageFilter.MaxFilter(45))
    blur1 = dilated.filter(ImageFilter.GaussianBlur(35))
    blur2 = dilated.filter(ImageFilter.GaussianBlur(15))

    # Colorize aura with electric cyan and magenta
    arr1 = np.array(blur1)
    arr2 = np.array(blur2)
    aura_rgb = np.zeros((1024, 1024, 4), dtype=np.uint8)
    # Electric cyan and purple mix
    aura_rgb[:, :, 0] = np.clip(arr1 * 0.4 + arr2 * 0.2, 0, 255)  # R
    aura_rgb[:, :, 1] = np.clip(arr1 * 0.8 + arr2 * 0.9, 0, 255)  # G
    aura_rgb[:, :, 2] = np.clip(arr1 * 1.0 + arr2 * 1.0, 0, 255)  # B
    aura_rgb[:, :, 3] = np.clip(arr1 * 0.7 + arr2 * 0.8, 0, 255)  # A
    aura_img = Image.fromarray(aura_rgb)

    # Composite aura behind base
    res = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    res.paste(aura_img, (0, 0), aura_img)
    res.paste(img, (0, 0), img)

    # Add glowing pupils and lightning bolts on top
    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Glowing eyes
    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-14, eye[1]-14, eye[0]+14, eye[1]+14], fill=(0, 240, 255, 230))
        d.ellipse([eye[0]-6, eye[1]-6, eye[0]+6, eye[1]+6], fill=(255, 255, 255, 255))
        draw_sparkle(d, eye, 20, (0, 255, 255, 240))

    # Electric sparks around hair
    random.seed(42)
    for _ in range(16):
        sx = random.randint(200, 800)
        sy = random.randint(100, 450)
        draw_sparkle(d, (sx, sy), random.randint(8, 18), (140, 240, 255, 220))

    fx = fx.filter(ImageFilter.GaussianBlur(1))
    res.paste(fx, (0, 0), fx)
    return res


# 3. SAD MATTHEW (Crying teardrops, rain streaks, blue mood)
def make_sad(base):
    # Shift colors to cool melancholic blue
    r, g, b, a = base.split()
    r = r.point(lambda p: int(p * 0.8))
    g = g.point(lambda p: int(p * 0.85))
    b = b.point(lambda p: int(min(255, p * 1.15 + 15)))
    cooled = Image.merge("RGBA", (r, g, b, a))

    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Big anime tears streaming down both cheeks
    # Left eye tear trail
    tear_left = [(395, 535), (398, 560), (390, 600), (395, 650), (385, 710)]
    for i in range(len(tear_left) - 1):
        d.line([tear_left[i], tear_left[i+1]], fill=(140, 210, 255, 220), width=6)
    d.ellipse([380, 705, 395, 725], fill=(160, 225, 255, 240))

    # Right eye tear trail
    tear_right = [(625, 530), (620, 560), (628, 610), (622, 660), (630, 715)]
    for i in range(len(tear_right) - 1):
        d.line([tear_right[i], tear_right[i+1]], fill=(140, 210, 255, 220), width=6)
    d.ellipse([625, 710, 640, 730], fill=(160, 225, 255, 240))

    # Watery eyes pooling
    d.ellipse([380, 525, 410, 545], fill=(180, 230, 255, 200))
    d.ellipse([610, 520, 640, 540], fill=(180, 230, 255, 200))
    draw_sparkle(d, (390, 530), 10, (255, 255, 255, 240))
    draw_sparkle(d, (620, 525), 10, (255, 255, 255, 240))

    # Melancholy rain streaks
    random.seed(123)
    for _ in range(40):
        rx = random.randint(150, 850)
        ry = random.randint(100, 900)
        d.line([(rx, ry), (rx - 15, ry + 40)], fill=(120, 180, 255, 140), width=2)

    cooled.paste(fx, (0, 0), fx)
    return cooled


# 4. ANGRY MATTHEW (Anime rage vein, fiery red eyes, burning brow)
def make_angry(base):
    # Heat up skin tone with red warmth
    r, g, b, a = base.split()
    r = r.point(lambda p: int(min(255, p * 1.25 + 20)))
    b = b.point(lambda p: int(p * 0.75))
    warmed = Image.merge("RGBA", (r, g, b, a))

    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Fiery rage eyes
    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-15, eye[1]-15, eye[0]+15, eye[1]+15], fill=(255, 30, 0, 240))
        d.ellipse([eye[0]-7, eye[1]-7, eye[0]+7, eye[1]+7], fill=(255, 200, 0, 255))
        d.ellipse([eye[0]-3, eye[1]-3, eye[0]+3, eye[1]+3], fill=(255, 255, 255, 255))

    # Anime angry cross mark on forehead/temple
    vx, vy = 310, 360
    d.arc([vx-35, vy-20, vx+15, vy+30], 270, 90, fill=(255, 20, 20, 255), width=8)
    d.arc([vx-15, vy-20, vx+35, vy+30], 90, 270, fill=(255, 20, 20, 255), width=8)
    d.arc([vx-25, vy-35, vx+25, vy+15], 0, 180, fill=(255, 20, 20, 255), width=8)
    d.arc([vx-25, vy-15, vx+25, vy+35], 180, 360, fill=(255, 20, 20, 255), width=8)

    # Smoke / steam puffs rising from head
    random.seed(99)
    for _ in range(18):
        sx = random.randint(300, 700)
        sy = random.randint(100, 300)
        d.ellipse([sx, sy, sx+random.randint(15, 35), sy+random.randint(15, 35)], fill=(255, 100, 50, 120))

    warmed.paste(fx, (0, 0), fx)
    return warmed


# 5. SIGMA MATTHEW (Pixel Thug Sunglasses, Smirk, Platinum Chain, Neon Purple)
def make_sigma(base):
    img = base.copy()
    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Classic 8-bit black pixel sunglasses across both eyes
    # Left lens center ~(395, 515), Right lens center ~(625, 510)
    # Bridge between (470, 510) to (550, 510)
    # Draw dark stylish shades
    left_lens = [320, 480, 485, 545]
    right_lens = [535, 475, 700, 540]
    bridge = [475, 495, 545, 515]

    # Frame shadow
    d.rectangle([left_lens[0]-4, left_lens[1]-4, left_lens[2]+4, left_lens[3]+4], fill=(20, 20, 25, 255))
    d.rectangle([right_lens[0]-4, right_lens[1]-4, right_lens[2]+4, right_lens[3]+4], fill=(20, 20, 25, 255))
    d.rectangle([bridge[0], bridge[1], bridge[2], bridge[3]], fill=(20, 20, 25, 255))

    # Black lenses
    d.rectangle(left_lens, fill=(10, 10, 12, 255))
    d.rectangle(right_lens, fill=(10, 10, 12, 255))

    # White specular glare lines across lenses
    d.polygon([(340, 535), (380, 490), (395, 490), (355, 535)], fill=(255, 255, 255, 220))
    d.polygon([(410, 535), (450, 490), (460, 490), (420, 535)], fill=(255, 255, 255, 220))
    d.polygon([(555, 530), (595, 485), (610, 485), (570, 530)], fill=(255, 255, 255, 220))
    d.polygon([(625, 530), (665, 485), (675, 485), (635, 530)], fill=(255, 255, 255, 220))

    # Platinum chain around collar
    chain_y = 860
    for i in range(14):
        cx = 360 + i * 22
        cy = chain_y + int(math.sin(i / 13 * math.pi) * 35)
        d.ellipse([cx-14, cy-8, cx+14, cy+8], outline=(230, 230, 240, 255), width=4)
        draw_sparkle(d, (cx, cy), 6, (255, 255, 255, 200))

    img.paste(fx, (0, 0), fx)
    return img


# 6. GOLDEN MATTHEW (24K Gold metallic re-lighting, crown, sparkles)
def make_golden(base):
    # Convert RGB into vibrant metallic gold
    arr = np.array(base).astype(np.float32)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    # Rich reflective gold palette
    gold_r = np.clip(gray * 1.4 + 40, 0, 255)
    gold_g = np.clip(gray * 1.1 + 15, 0, 255)
    gold_b = np.clip(gray * 0.2, 0, 255)

    gold_img = np.dstack([gold_r, gold_g, gold_b, arr[:, :, 3]]).astype(np.uint8)
    gold_pil = Image.fromarray(gold_img)

    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Crown sitting atop hair (top of head is ~y=110)
    crown = [
        (350, 160),
        (330, 40),   # Left peak
        (420, 110),
        (512, 10),   # Center high peak
        (604, 110),
        (694, 40),   # Right peak
        (674, 160),
    ]
    d.polygon(crown, fill=(255, 215, 0, 255), outline=(255, 245, 180, 255))
    # Crown base band
    d.rectangle([340, 140, 684, 165], fill=(218, 165, 32, 255), outline=(255, 235, 120, 255))
    # Crown jewels
    d.ellipse([500, 45, 524, 69], fill=(255, 30, 70, 255))
    d.ellipse([340, 70, 356, 86], fill=(30, 200, 255, 255))
    d.ellipse([668, 70, 684, 86], fill=(30, 255, 100, 255))

    # Sparkling 4-point gold stars
    sparkle_spots = [
        (512, 10), (330, 40), (694, 40),
        (395, 520), (625, 515), (510, 740),
        (300, 400), (720, 420), (450, 240), (580, 230)
    ]
    for spot in sparkle_spots:
        draw_sparkle(d, spot, 18, (255, 255, 190, 255))

    gold_pil.paste(fx, (0, 0), fx)
    return gold_pil


# 7. DIAMOND MATTHEW (Prismatic Cyan Crystal Facets, Diamond Crown, Sparkles)
def make_diamond(base):
    arr = np.array(base).astype(np.float32)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    # Prismatic ice-blue / diamond luminance curve
    dia_r = np.clip(gray * 0.75 + 40, 0, 255)
    dia_g = np.clip(gray * 1.15 + 60, 0, 255)
    dia_b = np.clip(gray * 1.35 + 80, 0, 255)

    dia_img = np.dstack([dia_r, dia_g, dia_b, arr[:, :, 3]]).astype(np.uint8)
    dia_pil = Image.fromarray(dia_img)

    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Diamond crystal tiara / crown
    tiara = [
        (380, 230),
        (360, 140),
        (430, 180),
        (512, 100),
        (594, 180),
        (664, 140),
        (644, 230),
    ]
    d.polygon(tiara, fill=(180, 245, 255, 230), outline=(255, 255, 255, 255))

    # Crystalline facet overlay lines
    facet_lines = [
        [(512, 100), (512, 230)],
        [(430, 180), (512, 230)],
        [(594, 180), (512, 230)],
        [(360, 140), (430, 180)],
        [(664, 140), (594, 180)],
    ]
    for pts in facet_lines:
        d.line(pts, fill=(255, 255, 255, 240), width=3)

    # Diamond brilliant sparkles
    diamond_spots = [
        (512, 100), (360, 140), (664, 140),
        (395, 520), (625, 515), (510, 620),
        (320, 600), (700, 600), (450, 400), (570, 400)
    ]
    for spot in diamond_spots:
        draw_sparkle(d, spot, 22, (220, 255, 255, 255))

    dia_pil.paste(fx, (0, 0), fx)
    return dia_pil


# 8. FIRE MATTHEW (Flames roaring from hair, magma cracks, blazing eyes)
def make_fire(base):
    img = base.copy()
    # Warm heat shift
    r, g, b, a = img.split()
    r = r.point(lambda p: int(min(255, p * 1.35 + 25)))
    g = g.point(lambda p: int(p * 0.9))
    b = b.point(lambda p: int(p * 0.4))
    fiery = Image.merge("RGBA", (r, g, b, a))

    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Roaring fire flames coming out of hair
    random.seed(777)
    for _ in range(35):
        bx = random.randint(300, 720)
        by = random.randint(180, 280)
        h = random.randint(80, 220)
        w = random.randint(25, 60)
        flame = [
            (bx - w // 2, by),
            (bx, by - h),
            (bx + w // 2, by)
        ]
        color = random.choice([
            (255, 60, 0, 200),
            (255, 140, 0, 210),
            (255, 220, 0, 230),
            (255, 255, 150, 240)
        ])
        d.polygon(flame, fill=color)

    # Blazing magma eyes
    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-16, eye[1]-16, eye[0]+16, eye[1]+16], fill=(255, 60, 0, 255))
        d.ellipse([eye[0]-8, eye[1]-8, eye[0]+8, eye[1]+8], fill=(255, 230, 0, 255))
        draw_sparkle(d, eye, 14, (255, 255, 200, 255))

    # Magma crack lines on cheeks
    cracks = [
        [(440, 630), (410, 670), (430, 710)],
        [(580, 630), (610, 670), (595, 715)]
    ]
    for c in cracks:
        for i in range(len(c) - 1):
            d.line([c[i], c[i+1]], fill=(255, 150, 0, 220), width=4)

    # Fire embers and sparks
    for _ in range(40):
        ex = random.randint(200, 820)
        ey = random.randint(50, 500)
        draw_sparkle(d, (ex, ey), random.randint(4, 12), (255, 200, 50, 220))

    fx = fx.filter(ImageFilter.GaussianBlur(1))
    fiery.paste(fx, (0, 0), fx)
    return fiery


# 9. ICE MATTHEW (Sub-zero frost, icicles, icy eyes, snowflakes)
def make_ice(base):
    # Freezing cyan shift
    r, g, b, a = base.split()
    r = r.point(lambda p: int(p * 0.6))
    g = g.point(lambda p: int(min(255, p * 1.1 + 30)))
    b = b.point(lambda p: int(min(255, p * 1.4 + 50)))
    frost = Image.merge("RGBA", (r, g, b, a))

    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Icicle shards crown on hair
    random.seed(55)
    for _ in range(25):
        ix = random.randint(320, 700)
        iy = random.randint(160, 260)
        ih = random.randint(40, 110)
        d.polygon([(ix - 8, iy), (ix, iy - ih), (ix + 8, iy)], fill=(200, 245, 255, 220), outline=(255, 255, 255, 240))

    # Sub-zero piercing cyan frost eyes
    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-15, eye[1]-15, eye[0]+15, eye[1]+15], fill=(0, 220, 255, 255))
        d.ellipse([eye[0]-6, eye[1]-6, eye[0]+6, eye[1]+6], fill=(255, 255, 255, 255))
        draw_sparkle(d, eye, 16, (255, 255, 255, 255))

    # Snowflakes around head
    def draw_snowflake(center, size):
        x, y = center
        for angle in [0, 60, 120]:
            rad = math.radians(angle)
            dx = math.cos(rad) * size
            dy = math.sin(rad) * size
            d.line([(x - dx, y - dy), (x + dx, y + dy)], fill=(240, 255, 255, 230), width=2)

    for _ in range(30):
        sx = random.randint(180, 840)
        sy = random.randint(100, 850)
        draw_snowflake((sx, sy), random.randint(6, 16))

    frost.paste(fx, (0, 0), fx)
    return frost


# 10. GALAXY MATTHEW (Nebula cosmos, twinkling stars, planetary rings)
def make_galaxy(base):
    # Deep space cosmic palette
    arr = np.array(base).astype(np.float32)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    # Cosmic purple/magenta/cyan mapping
    gal_r = np.clip(gray * 0.9 + 50, 0, 255)
    gal_g = np.clip(gray * 0.5 + 10, 0, 255)
    gal_b = np.clip(gray * 1.3 + 70, 0, 255)

    gal_img = np.dstack([gal_r, gal_g, gal_b, arr[:, :, 3]]).astype(np.uint8)
    gal_pil = Image.fromarray(gal_img)

    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Saturn-like cosmic planetary ring around head
    # Ellipse tilted at angle
    d.ellipse([200, 460, 824, 580], outline=(180, 120, 255, 180), width=8)
    d.ellipse([220, 470, 804, 570], outline=(0, 230, 255, 160), width=5)

    # Cosmic glowing nebula eyes
    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-16, eye[1]-16, eye[0]+16, eye[1]+16], fill=(160, 0, 255, 255))
        d.ellipse([eye[0]-8, eye[1]-8, eye[0]+8, eye[1]+8], fill=(0, 240, 255, 255))
        d.ellipse([eye[0]-3, eye[1]-3, eye[0]+3, eye[1]+3], fill=(255, 255, 255, 255))
        draw_sparkle(d, eye, 15, (255, 255, 255, 255))

    # Constellation star cluster
    random.seed(888)
    for _ in range(50):
        sx = random.randint(150, 870)
        sy = random.randint(100, 900)
        col = random.choice([(255, 255, 255, 240), (140, 220, 255, 230), (255, 140, 255, 230)])
        draw_sparkle(d, (sx, sy), random.randint(4, 14), col)

    gal_pil.paste(fx, (0, 0), fx)
    return gal_pil


# 11. EVIL MATTHEW (Obsidian demon horns, crimson slit eyes, shadow aura)
def make_evil(base):
    # Dark shadow tint
    r, g, b, a = base.split()
    r = r.point(lambda p: int(min(255, p * 1.1 + 10)))
    g = g.point(lambda p: int(p * 0.65))
    b = b.point(lambda p: int(p * 0.65))
    dark = Image.merge("RGBA", (r, g, b, a))

    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Sinister curved demon horns protruding from forehead/hair
    # Left Horn
    horn_left = [
        (370, 260),
        (340, 220),
        (280, 150),
        (220, 90),   # Tip
        (280, 180),
        (330, 270)
    ]
    d.polygon(horn_left, fill=(25, 20, 30, 255), outline=(180, 20, 50, 255))

    # Right Horn
    horn_right = [
        (654, 260),
        (684, 220),
        (744, 150),
        (804, 90),   # Tip
        (744, 180),
        (694, 270)
    ]
    d.polygon(horn_right, fill=(25, 20, 30, 255), outline=(180, 20, 50, 255))

    # Glowing crimson demon eyes with vertical slit pupils
    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-16, eye[1]-16, eye[0]+16, eye[1]+16], fill=(220, 0, 30, 255))
        # Slit pupil
        d.polygon([(eye[0]-2, eye[1]-12), (eye[0]+2, eye[1]-12), (eye[0]+4, eye[1]), (eye[0]+2, eye[1]+12), (eye[0]-2, eye[1]+12), (eye[0]-4, eye[1])], fill=(0, 0, 0, 255))
        draw_sparkle(d, eye, 10, (255, 100, 100, 255))

    # Sinister dark tendrils
    random.seed(666)
    for _ in range(20):
        tx = random.randint(200, 820)
        ty = random.randint(100, 350)
        d.ellipse([tx, ty, tx+20, ty+20], fill=(120, 0, 40, 140))

    dark.paste(fx, (0, 0), fx)
    return dark


# 12. SLEEPY MATTHEW (Starry Nightcap with pom-pom, drooping eyelids, Zzz's)
def make_sleepy(base):
    img = base.copy()
    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Cute nightcap perched atop hair
    cap_points = [
        (330, 160),
        (360, 40),
        (512, 20),
        (680, 50),
        (760, 140),
        (820, 260),
        (840, 270),  # Tip with pompom
        (720, 170),
        (512, 110),
        (350, 170)
    ]
    d.polygon(cap_points, fill=(40, 80, 180, 255), outline=(80, 130, 240, 255))
    # Nightcap brim
    d.rectangle([320, 140, 700, 175], fill=(240, 245, 255, 255))
    # Pompom at tip
    d.ellipse([815, 250, 865, 300], fill=(255, 255, 255, 255))

    # Drooping heavy eyelids over eyes
    d.chord([380, 505, 410, 535], 180, 360, fill=(225, 190, 175, 255), outline=(160, 120, 100, 255))
    d.chord([610, 500, 640, 530], 180, 360, fill=(225, 190, 175, 255), outline=(160, 120, 100, 255))

    # Sleep bubble at nose
    d.ellipse([515, 620, 545, 650], fill=(180, 230, 255, 180), outline=(255, 255, 255, 230), width=2)

    # Floating "Zzz"
    zzz_positions = [(640, 420, 28), (680, 360, 36), (730, 290, 48)]
    for zx, zy, sz in zzz_positions:
        # Draw "Z" lines
        d.line([(zx, zy), (zx + sz, zy)], fill=(120, 220, 255, 240), width=sz // 6)
        d.line([(zx + sz, zy), (zx, zy + sz)], fill=(120, 220, 255, 240), width=sz // 6)
        d.line([(zx, zy + sz), (zx + sz, zy + sz)], fill=(120, 220, 255, 240), width=sz // 6)

    img.paste(fx, (0, 0), fx)
    return img


# 13. RICH MATTHEW (Top hat, monocle with chain, cigar/dollar signs)
def make_rich(base):
    img = base.copy()
    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Elegant Victorian Top Hat sitting properly on top of hair
    # Brim
    d.ellipse([280, 130, 744, 185], fill=(20, 20, 25, 255), outline=(60, 60, 70, 255), width=2)
    # Cylinder crown
    d.polygon([(340, 150), (360, 10), (664, 10), (684, 150)], fill=(25, 25, 30, 255))
    # Gold ribbon band
    d.polygon([(345, 150), (350, 120), (674, 120), (679, 150)], fill=(255, 215, 0, 255))

    # Gold Monocle over Matthew's left eye (viewer's right, ~(625, 515))
    mx, my, mr = 625, 515, 36
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], outline=(255, 215, 0, 255), width=5)
    d.ellipse([mx - mr + 2, my - mr + 2, mx + mr - 2, my + mr - 2], fill=(255, 255, 255, 70))
    # Monocle shine
    d.line([(mx - 20, my + 15), (mx + 10, my - 20)], fill=(255, 255, 255, 200), width=3)
    # Monocle chain dangling down
    for i in range(12):
        d.ellipse([mx - 20 + i * 5, my + mr + i * 15, mx - 12 + i * 5, my + mr + i * 15 + 8], outline=(255, 215, 0, 255), width=2)

    # Floating Dollar signs ($) around
    dollars = [(280, 480, 28), (760, 450, 32), (320, 700, 24), (730, 680, 28)]
    for dx, dy, sz in dollars:
        d.text((dx, dy), "$", fill=(50, 220, 100, 240), font=None)
        draw_sparkle(d, (dx, dy), sz // 2, (255, 215, 0, 240))

    img.paste(fx, (0, 0), fx)
    return img


# 14. GLITCH MATTHEW (RGB chromatic aberration, slice displacement, digital artifacts)
def make_glitch(base):
    arr = np.array(base)
    h, w, c = arr.shape
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]
    a = arr[:, :, 3]

    # Shift Red channel 18px left, Blue channel 18px right
    shift = 18
    r_shifted = np.roll(r, -shift, axis=1)
    b_shifted = np.roll(b, shift, axis=1)

    glitched = np.dstack([r_shifted, g, b_shifted, a])

    # Displace horizontal glitch slices
    random.seed(333)
    for _ in range(12):
        sy = random.randint(200, 800)
        sh = random.randint(10, 35)
        dx = random.randint(-45, 45)
        glitched[sy:sy+sh, :, :] = np.roll(glitched[sy:sy+sh, :, :], dx, axis=1)

    # Digital CRT scanlines
    for y in range(0, h, 6):
        glitched[y:y+2, :, :3] = (glitched[y:y+2, :, :3] * 0.75).astype(np.uint8)

    res = Image.fromarray(glitched)

    # Add glowing cyber cyan & magenta data bits
    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)
    for _ in range(25):
        gx = random.randint(250, 770)
        gy = random.randint(180, 820)
        gw = random.randint(15, 50)
        gh = random.randint(4, 10)
        col = random.choice([(0, 255, 255, 220), (255, 0, 128, 220)])
        d.rectangle([gx, gy, gx+gw, gy+gh], fill=col)

    res.paste(fx, (0, 0), fx)
    return res


# 15. RAINBOW MATTHEW (Flowing rainbow spectral iridescent sheen, rainbow stars)
def make_rainbow(base):
    arr = np.array(base).astype(np.float32)
    h, w, _ = arr.shape

    # Generate smooth rainbow wave across image
    x_coords, y_coords = np.meshgrid(np.arange(w), np.arange(h))
    wave = (x_coords + y_coords * 0.5) / 1024.0 * 2 * math.pi

    rainbow_r = (np.sin(wave) * 0.5 + 0.5) * 255
    rainbow_g = (np.sin(wave + 2 * math.pi / 3) * 0.5 + 0.5) * 255
    rainbow_b = (np.sin(wave + 4 * math.pi / 3) * 0.5 + 0.5) * 255

    # Screen blend rainbow onto Matthew
    blend_r = np.clip(arr[:, :, 0] * 0.6 + rainbow_r * 0.45, 0, 255)
    blend_g = np.clip(arr[:, :, 1] * 0.6 + rainbow_g * 0.45, 0, 255)
    blend_b = np.clip(arr[:, :, 2] * 0.6 + rainbow_b * 0.45, 0, 255)

    rainbow_img = np.dstack([blend_r, blend_g, blend_b, arr[:, :, 3]]).astype(np.uint8)
    res = Image.fromarray(rainbow_img)

    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    # Multi-color glowing stars around head
    random.seed(444)
    colors = [
        (255, 50, 50, 240),
        (255, 160, 30, 240),
        (255, 240, 40, 240),
        (50, 255, 100, 240),
        (40, 200, 255, 240),
        (180, 50, 255, 240)
    ]
    for _ in range(30):
        sx = random.randint(180, 840)
        sy = random.randint(120, 850)
        draw_sparkle(d, (sx, sy), random.randint(8, 20), random.choice(colors))

    res.paste(fx, (0, 0), fx)
    return res


# 16. GOD MATTHEW (Divine Sacred Golden Halo with sun rays, blinding light eyes, ethereal wings)
def make_god(base):
    # Divine celestial luminous shift
    arr = np.array(base).astype(np.float32)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    god_r = np.clip(gray * 1.25 + 40, 0, 255)
    god_g = np.clip(gray * 1.2 + 35, 0, 255)
    god_b = np.clip(gray * 0.95 + 15, 0, 255)

    god_img = np.dstack([god_r, god_g, god_b, arr[:, :, 3]]).astype(np.uint8)
    god_pil = Image.fromarray(god_img)

    # Sacred Divine Halo behind head
    halo = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)

    center = (512, 450)
    # Sacred solar rays
    for angle in range(0, 360, 15):
        rad = math.radians(angle)
        r_inner = 330
        r_outer = 480 if angle % 30 == 0 else 420
        x1 = center[0] + math.cos(rad) * r_inner
        y1 = center[1] + math.sin(rad) * r_inner
        x2 = center[0] + math.cos(rad) * r_outer
        y2 = center[1] + math.sin(rad) * r_outer
        hd.line([(x1, y1), (x2, y2)], fill=(255, 235, 120, 220), width=6)

    # Golden concentric halo rings
    hd.ellipse([center[0]-350, center[1]-350, center[0]+350, center[1]+350], outline=(255, 220, 80, 240), width=8)
    hd.ellipse([center[0]-320, center[1]-320, center[0]+320, center[1]+320], outline=(255, 245, 180, 200), width=4)

    # Halo blur for celestial glow
    halo_blur = halo.filter(ImageFilter.GaussianBlur(4))

    # Combine halo BEHIND Matthew
    res = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    res.paste(halo_blur, (0, 0), halo_blur)
    res.paste(god_pil, (0, 0), god_pil)

    # Pure blinding white-gold divine eyes emitting god rays
    fx = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(fx)

    for eye in [(395, 520), (625, 515)]:
        d.ellipse([eye[0]-18, eye[1]-18, eye[0]+18, eye[1]+18], fill=(255, 255, 255, 255))
        draw_sparkle(d, eye, 30, (255, 250, 200, 255))
        # Beams of light emitting from eyes
        d.line([(eye[0], eye[1]), (eye[0] - 80, eye[1] + 120)], fill=(255, 255, 220, 180), width=5)
        d.line([(eye[0], eye[1]), (eye[0] + 80, eye[1] + 120)], fill=(255, 255, 220, 180), width=5)

    # Divine floating holy glyphs / sparkles
    for _ in range(40):
        sx = random.randint(150, 870)
        sy = random.randint(80, 920)
        draw_sparkle(d, (sx, sy), random.randint(6, 18), (255, 240, 140, 240))

    res.paste(fx, (0, 0), fx)
    return res


GENERATORS = {
    "classic_matthew.png": make_classic,
    "aura_matthew.png": make_aura,
    "sad_matthew.png": make_sad,
    "angry_matthew.png": make_angry,
    "sigma_matthew.png": make_sigma,
    "golden_matthew.png": make_golden,
    "diamond_matthew.png": make_diamond,
    "fire_matthew.png": make_fire,
    "ice_matthew.png": make_ice,
    "galaxy_matthew.png": make_galaxy,
    "evil_matthew.png": make_evil,
    "sleepy_matthew.png": make_sleepy,
    "rich_matthew.png": make_rich,
    "glitch_matthew.png": make_glitch,
    "rainbow_matthew.png": make_rainbow,
    "god_matthew.png": make_god,
}


def generate_all():
    print(f"[START] Loading base image from {BASE_PATH}...")
    base = load_base()
    print(f"  Base size: {base.size}")

    for idx, (filename, func) in enumerate(GENERATORS.items(), 1):
        out_path = OUTPUT_DIR / filename
        print(f"[{idx}/16] Generating {filename}...")
        skin_img = func(base)
        skin_img.save(out_path, "PNG", optimize=True)
        print(f"  Saved -> {out_path} ({out_path.stat().st_size // 1024} KB)")

    print("\n[COMPLETE] All 16 Matthew skins generated successfully!")


if __name__ == "__main__":
    generate_all()
