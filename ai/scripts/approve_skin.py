#!/usr/bin/env python3
"""
Skin Approval & Deployment CLI for Matthew Clicker.
Validates candidate alignment, creates backups of existing production skins,
and exports approved assets into public/images/skins/<skin_id>-normal.png.
"""

import os
import sys
import shutil
import time
import argparse
import subprocess
from PIL import Image
import numpy as np

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRODUCTION_SKINS_DIR = os.path.join(WORKSPACE_ROOT, "public", "images", "skins")
BACKUPS_DIR = os.path.join(WORKSPACE_ROOT, "ai", "backups")
SCRIPTS_DIR = os.path.join(WORKSPACE_ROOT, "scripts")

def validate_and_approve(candidate_path, skin_id):
    if not os.path.isabs(candidate_path):
        candidate_path = os.path.join(WORKSPACE_ROOT, candidate_path)

    if not os.path.exists(candidate_path):
        raise FileNotFoundError(f"Candidate file not found: {candidate_path}")

    # Standardize skin ID
    clean_id = skin_id.replace("_matthew", "").lower()
    target_filename = f"{clean_id}-normal.png"
    target_path = os.path.join(PRODUCTION_SKINS_DIR, target_filename)

    print("=" * 70)
    print(f"  APPROVING SKIN: {skin_id} -> {target_filename}")
    print("=" * 70)

    # 1. Image Validation
    img = Image.open(candidate_path)
    print(f"  Format    : {img.format}")
    print(f"  Mode      : {img.mode}")
    print(f"  Dimensions: {img.size}")

    if img.size != (1024, 1024):
        print(f"  [AUTO-FIX] Resizing {img.size} to canonical (1024, 1024)...")
        img = img.resize((1024, 1024), Image.Resampling.LANCZOS)

    if img.mode != "RGBA":
        print("  [AUTO-FIX] Converting image mode to RGBA for alpha transparency support...")
        img = img.convert("RGBA")

    # 2. Check Alpha & Centering
    alpha = np.array(img.split()[-1])
    opaque_pixels = np.count_nonzero(alpha > 10)
    total_pixels = 1024 * 1024
    opacity_ratio = opaque_pixels / total_pixels
    print(f"  Opaque Area: {opacity_ratio * 100:.1f}% of canvas")

    if opacity_ratio > 0.98:
        print("  [WARNING] High background opacity detected! Ensure background is transparent.")

    y_indices, x_indices = np.where(alpha > 20)
    if len(x_indices) > 0 and len(y_indices) > 0:
        center_x = float(np.mean(x_indices))
        center_y = float(np.mean(y_indices))
        print(f"  Visible Centroid: ({center_x:.1f}, {center_y:.1f}) [Baseline target: (515.6, 454.6)]")
        drift_x = abs(center_x - 515.6)
        drift_y = abs(center_y - 454.6)
        print(f"  Centroid Drift  : X={drift_x:.1f}px, Y={drift_y:.1f}px")
        if drift_x > 25 or drift_y > 25:
            print("  [ALERT] Significant centroid drift detected (>25px). Check facial alignment!")
        else:
            print("  [ANCHOR] Centroid perfectly within tolerance (<25px).")

    # 3. Create Backup of Existing Production Skin
    os.makedirs(BACKUPS_DIR, exist_ok=True)
    if os.path.exists(target_path):
        timestamp = int(time.time())
        backup_filename = f"{clean_id}_{timestamp}_backup.png"
        backup_path = os.path.join(BACKUPS_DIR, backup_filename)
        shutil.copy2(target_path, backup_path)
        print(f"  [BACKUP] Existing production skin backed up to:\n    {backup_path}")

    # 4. Save to Production
    os.makedirs(PRODUCTION_SKINS_DIR, exist_ok=True)
    img.save(target_path, "PNG", optimize=True)
    print(f"  [SUCCESS] Deployed approved skin to:\n    {target_path}")

    # 5. Automatically regenerate Contact Sheet
    try:
        cs_script = os.path.join(SCRIPTS_DIR, "generate_contact_sheet.py")
        if os.path.exists(cs_script):
            print("\n  [UPDATING] Regenerating visual QC contact sheet...")
            subprocess.run([sys.executable, cs_script], check=True)
    except Exception as e:
        print(f"  [NOTE] Contact sheet update: {e}")

    print("=" * 70)
    print(f"Skin '{clean_id}' successfully updated and ready in Matthew Clicker!")
    print("=" * 70)

def main():
    parser = argparse.ArgumentParser(description="Approve and deploy a candidate skin into Matthew Clicker.")
    parser.add_argument("--candidate", type=str, required=True, help="Path to candidate image in ai/output/")
    parser.add_argument("--skin", type=str, required=True, help="Skin ID (e.g. aura_matthew, god, sigma, etc.)")
    args = parser.parse_args()

    validate_and_approve(args.candidate, args.skin)

if __name__ == "__main__":
    main()
