"""
Automatic Background Removal Script for Matthew Clicker.
Uses rembg (U2-Net) or intelligent alpha extraction to export clean transparent PNGs.
Optimized for game assets and web performance.
"""

import sys
import os
import argparse
from pathlib import Path
from PIL import Image
import numpy as np

try:
    from rembg import remove, new_session
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False


def process_image(
    input_path: str,
    output_path: str,
    target_size: int = 1024,
    force_rembg: bool = False,
    session=None
) -> bool:
    """Removes background and resizes for web performance."""
    try:
        in_p = Path(input_path)
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)

        if not in_p.exists():
            print(f"[ERROR] Input file does not exist: {input_path}")
            return False

        print(f"[PROCESSING] {in_p.name} -> {out_p.name}...")
        img = Image.open(in_p)

        # Check existing alpha
        has_alpha = img.mode == "RGBA"
        is_already_cutout = False
        if has_alpha:
            alpha_channel = np.array(img.split()[-1])
            zero_ratio = np.mean(alpha_channel == 0)
            if zero_ratio > 0.15:  # Already has clean cutout transparency
                is_already_cutout = True

        if is_already_cutout and not force_rembg:
            print("  [INFO] Image already has a clean transparent background.")
            result = img
        elif REMBG_AVAILABLE:
            print("  [REMBG] Running U2-Net background removal...")
            # For large images, resize temporary for fast inference or process directly without heavy matting
            orig_size = img.size
            if max(orig_size) > 2048:
                scale = 2048 / max(orig_size)
                temp_size = (int(orig_size[0] * scale), int(orig_size[1] * scale))
                downscaled = img.resize(temp_size, Image.Resampling.LANCZOS)
                cutout = remove(downscaled, session=session, alpha_matting=False)
                # Extract alpha and resize to original
                alpha_mask = cutout.split()[-1].resize(orig_size, Image.Resampling.BICUBIC)
                result = img.convert("RGBA")
                result.putalpha(alpha_mask)
            else:
                result = remove(img, session=session, alpha_matting=False)
        else:
            print("  [WARN] Fallback keying applied.")
            img_rgba = img.convert("RGBA")
            arr = np.array(img_rgba).astype(np.float32)
            bg_color = np.array([255, 255, 255])
            dist = np.linalg.norm(arr[:, :, :3] - bg_color, axis=2)
            mask = np.clip((dist - 30) / 40 * 255, 0, 255).astype(np.uint8)
            result = Image.fromarray(np.dstack([arr[:, :, :3].astype(np.uint8), mask]))

        # Normalize and center crop/scale to target_size if desired
        if target_size > 0:
            # Maintain aspect ratio within target_size box
            result.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)

        result.save(out_p, "PNG", optimize=True)
        print(f"  [SUCCESS] Saved {out_p} ({result.size[0]}x{result.size[1]})")
        return True
    except Exception as e:
        print(f"[ERROR] Failed processing {input_path}: {e}")
        return False


def batch_process(input_dir: str, output_dir: str, target_size: int = 1024, force_rembg: bool = False):
    """Processes directory of images."""
    in_dir = Path(input_dir)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    image_extensions = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
    files = [f for f in in_dir.iterdir() if f.suffix.lower() in image_extensions]

    if not files:
        print(f"[INFO] No image files found in {input_dir}")
        return

    session = None
    if REMBG_AVAILABLE and force_rembg:
        try:
            session = new_session("u2net")
        except Exception:
            pass

    print(f"[BATCH] Processing {len(files)} files...")
    for f in files:
        out_f = out_dir / f"{f.stem}.png"
        process_image(str(f), str(out_f), target_size=target_size, force_rembg=force_rembg, session=session)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Matthew Clicker Background Removal")
    parser.add_argument("--input", "-i", type=str, default="Images/Main Matthew.png")
    parser.add_argument("--output", "-o", type=str, default="public/images/skins/classic_matthew.png")
    parser.add_argument("--size", "-s", type=int, default=1024, help="Target max resolution")
    parser.add_argument("--force-rembg", action="store_true", help="Force rembg even if alpha exists")
    parser.add_argument("--batch", "-b", action="store_true", help="Batch process folder")

    args = parser.parse_args()

    if args.batch:
        batch_process(args.input, args.output, target_size=args.size, force_rembg=args.force_rembg)
    else:
        process_image(args.input, args.output, target_size=args.size, force_rembg=args.force_rembg)
