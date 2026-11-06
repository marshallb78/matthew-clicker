#!/usr/bin/env python3
"""
Character Reference Package Extractor for Matthew Clicker
Extracts normalized face crops, silhouette masks, landmark metadata,
and identity conditioning parameters from Images/Main Matthew.png.
"""

import os
import json
from PIL import Image, ImageFilter
import numpy as np

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SOURCE_IMAGE_PATH = os.path.join(WORKSPACE_ROOT, "Images", "Main Matthew.png")
REFERENCE_DIR = os.path.join(WORKSPACE_ROOT, "ai", "reference")

def extract_reference_package():
    print(f"Loading source reference: {SOURCE_IMAGE_PATH}")
    if not os.path.exists(SOURCE_IMAGE_PATH):
        raise FileNotFoundError(f"Source image not found: {SOURCE_IMAGE_PATH}")

    os.makedirs(REFERENCE_DIR, exist_ok=True)
    raw_img = Image.open(SOURCE_IMAGE_PATH).convert("RGBA")
    raw_w, raw_h = raw_img.size
    print(f"Source raw dimensions: {raw_w}x{raw_h}")

    # Standardize to canonical 1024x1024 game resolution
    if raw_w != 1024 or raw_h != 1024:
        img = raw_img.resize((1024, 1024), Image.Resampling.LANCZOS)
    else:
        img = raw_img

    width, height = img.size
    print(f"Canonical reference dimensions: {width}x{height}")

    # Save canonical 1024x1024 reference
    ref_1024_path = os.path.join(REFERENCE_DIR, "matthew_1024_reference.png")
    img.save(ref_1024_path)
    print(f"Saved canonical 1024 reference: {ref_1024_path}")

    # Calibrated ground-truth landmarks for Matthew
    left_pupil = (393, 532)
    right_pupil = (616, 494)
    nose_bridge = (504.5, 513)
    nostrils = ((480, 665), (545, 660))
    mouth_center = (559, 750)
    tilt_angle_deg = -9.68
    eye_distance = float(np.hypot(right_pupil[0] - left_pupil[0], right_pupil[1] - left_pupil[1]))
    
    # 1. Silhouette / Alpha Mask
    alpha = img.split()[-1]
    silhouette = Image.new("L", (width, height), 0)
    silhouette.paste(alpha)
    silhouette_path = os.path.join(REFERENCE_DIR, "matthew_silhouette.png")
    silhouette.save(silhouette_path)
    print(f"Saved silhouette mask: {silhouette_path}")

    # 2. Normalized Face Crop (512x512) centered on nose bridge
    crop_size = 512
    cx, cy = int(nose_bridge[0]), int(nose_bridge[1])
    half = crop_size // 2
    left = max(0, cx - half)
    top = max(0, cy - half)
    right = min(width, left + crop_size)
    bottom = min(height, top + crop_size)
    face_crop = img.crop((left, top, right, bottom))
    face_crop_path = os.path.join(REFERENCE_DIR, "matthew_face_crop.png")
    face_crop.save(face_crop_path)
    print(f"Saved normalized face crop: {face_crop_path}")

    # 3. Visible Bounding Box from Alpha
    alpha_np = np.array(alpha)
    y_indices, x_indices = np.where(alpha_np > 10)
    bbox = {
        "x_min": int(np.min(x_indices)),
        "x_max": int(np.max(x_indices)),
        "y_min": int(np.min(y_indices)),
        "y_max": int(np.max(y_indices)),
        "width": int(np.max(x_indices) - np.min(x_indices)),
        "height": int(np.max(y_indices) - np.min(y_indices)),
        "visible_center_x": float(np.mean(x_indices)),
        "visible_center_y": float(np.mean(y_indices))
    }

    # 4. Landmarks JSON
    landmarks_data = {
        "source": "Images/Main Matthew.png",
        "canvas_size": {"width": width, "height": height},
        "eye_pupils": {
            "left": {"x": left_pupil[0], "y": left_pupil[1]},
            "right": {"x": right_pupil[0], "y": right_pupil[1]},
            "span_px": round(eye_distance, 2),
            "tilt_angle_degrees": tilt_angle_deg
        },
        "eyelids_tears": {
            "left": {"x": 393, "y": 552},
            "right": {"x": 616, "y": 512}
        },
        "nose": {
            "bridge": {"x": nose_bridge[0], "y": nose_bridge[1]},
            "left_nostril": {"x": nostrils[0][0], "y": nostrils[0][1]},
            "right_nostril": {"x": nostrils[1][0], "y": nostrils[1][1]}
        },
        "mouth": {
            "center": {"x": mouth_center[0], "y": mouth_center[1]},
            "left_corner": {"x": 490, "y": 745},
            "right_corner": {"x": 625, "y": 735}
        },
        "head_anchors": {
            "crown_center": {"x": 504.5, "y": 270},
            "left_temple": {"x": 270, "y": 530},
            "right_temple": {"x": 750, "y": 495},
            "halo_origin": {"x": 504.5, "y": 480}
        },
        "bounding_box": bbox,
        "transform_origin_css": "49.3% 50.1%"
    }

    landmarks_json_path = os.path.join(REFERENCE_DIR, "matthew_landmarks.json")
    with open(landmarks_json_path, "w", encoding="utf-8") as f:
        json.dump(landmarks_data, f, indent=2)
    print(f"Saved landmarks metadata: {landmarks_json_path}")

    # 5. Identity Prompt Template
    identity_prompt = (
        "photorealistic portrait photograph of the authentic young man Matthew, "
        "natural human skin texture with pores and realistic specular highlights, "
        "authentic facial bone structure, dark eyes, soft natural eyebrows, "
        "natural dark brown short hair with natural hairline, head tilted slightly to the right, "
        "sharp focus, professional photography lighting, clean edges, isolated subject, "
        "highly consistent facial proportions, award-winning portrait."
    )
    prompt_path = os.path.join(REFERENCE_DIR, "identity_prompt.txt")
    with open(prompt_path, "w", encoding="utf-8") as f:
        f.write(identity_prompt)
    print(f"Saved master identity prompt: {prompt_path}")

    # 6. Composition Specification
    comp_spec = {
        "canvas_width": 1024,
        "canvas_height": 1024,
        "face_anchor": {"x": 504.5, "y": 513},
        "head_width_approx": 480,
        "head_height_approx": 520,
        "camera_angle": "slight 3/4 front-facing tilt (-9.68 degrees)",
        "background_convention": "transparent alpha channel (RGBA), cleanly isolated edges",
        "in_game_transform_origin": "49.3% 50.1%"
    }
    spec_path = os.path.join(REFERENCE_DIR, "composition_spec.json")
    with open(spec_path, "w", encoding="utf-8") as f:
        json.dump(comp_spec, f, indent=2)
    print(f"Saved composition specification: {spec_path}")

    print("\n[SUCCESS] Character Reference Package extracted successfully.")

if __name__ == "__main__":
    extract_reference_package()
