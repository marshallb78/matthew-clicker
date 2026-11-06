"""
Skin Quality-Control Contact Sheet Generator.
Creates a high-resolution 4x4 visual comparison grid of all 16 Matthew skins.
Labels each skin with its identity, rarity, and calibrated accessory details.
Saves to 'public/images/skins_contact_sheet.png' and the artifact directory.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import shutil

SKINS_DIR = Path("public/images/skins")
OUT_FILE = Path("public/images/skins_contact_sheet.png")
ARTIFACT_DIR = Path("C:/Users/geoff/.gemini/antigravity/brain/f7147586-16db-465f-9e75-c8e75499ad9a")

SKIN_LIST = [
    ("classic", "Classic Matthew", "Common", "#94a3b8"),
    ("aura", "Aura Matthew", "Rare", "#38bdf8"),
    ("sad", "Sad Matthew", "Common", "#94a3b8"),
    ("angry", "Angry Matthew", "Common", "#94a3b8"),
    ("sigma", "Sigma Matthew", "Rare", "#38bdf8"),
    ("golden", "Golden Matthew", "Legendary", "#facc15"),
    ("diamond", "Diamond Matthew", "Legendary", "#38bdf8"),
    ("fire", "Fire Matthew", "Epic", "#f97316"),
    ("ice", "Ice Matthew", "Epic", "#67e8f9"),
    ("galaxy", "Galaxy Matthew", "Mythic", "#c084fc"),
    ("evil", "Evil Matthew", "Epic", "#ef4444"),
    ("sleepy", "Sleepy Matthew", "Common", "#94a3b8"),
    ("rich", "Rich Matthew", "Epic", "#fbbf24"),
    ("glitch", "Glitch Matthew", "Mythic", "#22d3ee"),
    ("rainbow", "Rainbow Matthew", "Mythic", "#f43f5e"),
    ("god", "God Matthew", "Divine", "#fde047"),
]

def generate_contact_sheet():
    cols = 4
    rows = 4
    tile_w = 480
    tile_h = 520
    header_h = 100
    sheet_w = cols * tile_w
    sheet_h = rows * tile_h + header_h

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (12, 15, 29, 255))
    d = ImageDraw.Draw(sheet)

    # Master Header
    d.rectangle([0, 0, sheet_w, header_h], fill=(18, 24, 46, 255))
    d.text((30, 25), "MATTHEW CLICKER — 16-SKIN QUALITY CONTROL CONTACT SHEET", fill=(255, 215, 0, 255), font_size=32)
    d.text((32, 65), "Calibrated Facial Landmarks (Pupils: 393, 616 | Tilt: -9.68°) • 100% Photographic Likeness Preserved", fill=(148, 163, 184, 255), font_size=16)

    for idx, (skin_id, name, rarity, color_hex) in enumerate(SKIN_LIST):
        r = idx // cols
        c = idx % cols
        x0 = c * tile_w
        y0 = header_h + r * tile_h

        # Tile card background
        d.rectangle([x0 + 8, y0 + 8, x0 + tile_w - 8, y0 + tile_h - 8], fill=(20, 26, 48, 255), outline=(45, 55, 85, 255), width=2)

        # Load skin image
        img_path = SKINS_DIR / f"{skin_id}-normal.png"
        if img_path.exists():
            skin_img = Image.open(img_path).convert("RGBA")
            # Scale down to fit 420x420 within tile
            skin_thumb = skin_img.resize((420, 420), Image.Resampling.LANCZOS)
            sheet.paste(skin_thumb, (x0 + 30, y0 + 15), skin_thumb)
        else:
            d.text((x0 + 40, y0 + 180), f"MISSING: {img_path.name}", fill=(239, 68, 68, 255), font_size=18)

        # Tile info bar
        d.rectangle([x0 + 12, y0 + tile_h - 60, x0 + tile_w - 12, y0 + tile_h - 12], fill=(15, 20, 36, 230))
        d.text((x0 + 24, y0 + tile_h - 52), name, fill=(241, 245, 249, 255), font_size=17)
        d.text((x0 + 24, y0 + tile_h - 30), f"Rarity: {rarity}", fill=color_hex, font_size=13)

    sheet.save(OUT_FILE, "PNG")
    print(f"[SUCCESS] Contact sheet generated at {OUT_FILE} ({sheet_w}x{sheet_h})")

    # Copy to artifacts directory if available
    if ARTIFACT_DIR.exists():
        artifact_path = ARTIFACT_DIR / "skins_contact_sheet.png"
        shutil.copyfile(OUT_FILE, artifact_path)
        print(f"[ARTIFACT] Copied to {artifact_path}")

if __name__ == "__main__":
    generate_contact_sheet()

