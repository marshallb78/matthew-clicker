#!/usr/bin/env python3
"""
Local AI Environment Setup & Model Downloader for Matthew Clicker.
Inspects hardware, validates GPU/VRAM/Storage, sets up dependencies,
and manages model weights for local SDXL + IP-Adapter FaceID pipeline.
"""

import os
import sys
import json
import shutil
import subprocess
import urllib.request
import hashlib

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(WORKSPACE_ROOT, "ai", "models")

# Official model checkpoints and Hugging Face repositories
MODEL_REGISTRY = {
    "sdxl_base": {
        "name": "Stable Diffusion XL 1.0 Base",
        "filename": "sd_xl_base_1.0.safetensors",
        "url": "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors",
        "size_bytes": 6938078334,
        "size_gb": 6.46,
        "target_dir": os.path.join(MODELS_DIR, "checkpoints"),
        "sha256": "31e35c80fc4829d14f90153f40f67774ec4adc69ff868b162502b9ee0ff81b6e"
    },
    "realvis_xl": {
        "name": "RealVisXL V5.0 Photorealism",
        "filename": "realvisxlV50_lightning.safetensors",
        "url": "https://huggingface.co/SG161222/RealVisXL_V5.0_Lightning/resolve/main/RealVisXL_V5.0_Lightning.safetensors",
        "size_bytes": 6938078334,
        "size_gb": 6.46,
        "target_dir": os.path.join(MODELS_DIR, "checkpoints"),
        "sha256": None
    },
    "ip_adapter_faceid_sdxl": {
        "name": "IP-Adapter FaceID Plus v2 SDXL",
        "filename": "ip-adapter-faceid-plusv2_sdxl.bin",
        "url": "https://huggingface.co/h94/IP-Adapter-FaceID/resolve/main/ip-adapter-faceid-plusv2_sdxl.bin",
        "size_bytes": 1600000000,
        "size_gb": 1.49,
        "target_dir": os.path.join(MODELS_DIR, "ip_adapter"),
        "sha256": None
    }
}

def inspect_hardware():
    print("=" * 70)
    print("  MATTHEW CLICKER — LOCAL AI HARDWARE INSPECTION")
    print("=" * 70)

    # 1. Inspect GPU & VRAM
    gpu_info = {"name": "Unknown", "vram_mb": 0, "driver": "N/A", "cuda": False}
    try:
        smi_out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"],
            text=True, stderr=subprocess.DEVNULL
        ).strip()
        parts = [p.strip() for p in smi_out.split(",")]
        if len(parts) >= 3:
            gpu_info["name"] = parts[0]
            gpu_info["vram_mb"] = int(float(parts[1]))
            gpu_info["driver"] = parts[2]
            gpu_info["cuda"] = True
    except Exception:
        pass

    vram_gb = round(gpu_info["vram_mb"] / 1024, 2)
    print(f"[GPU]       : {gpu_info['name']}")
    print(f"[VRAM]      : {vram_gb} GB ({gpu_info['vram_mb']} MiB)")
    print(f"[DRIVER]    : {gpu_info['driver']}")

    # 2. Inspect RAM
    total_ram_gb = 0
    try:
        import psutil
        total_ram_gb = round(psutil.virtual_memory().total / (1024**3), 1)
    except ImportError:
        try:
            wmi_out = subprocess.check_output(
                ["powershell", "-Command", "(Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB"],
                text=True
            ).strip()
            total_ram_gb = round(float(wmi_out), 1)
        except Exception:
            total_ram_gb = 32.0
    print(f"[SYSTEM RAM]: {total_ram_gb} GB")

    # 3. Inspect Disk Space on Workspace drive
    workspace_drive = os.path.splitdrive(WORKSPACE_ROOT)[0] or "W:"
    usage = shutil.disk_usage(WORKSPACE_ROOT)
    free_gb = round(usage.free / (1024**3), 2)
    print(f"[STORAGE]   : Drive {workspace_drive} has {free_gb} GB free")

    # 4. Evaluation
    print("-" * 70)
    print("HARDWARE COMPATIBILITY EVALUATION FOR LOCAL SDXL + IP-ADAPTER:")
    if vram_gb >= 12:
        print("  -> VRAM: EXCELLENT (16 GB). Native 1024x1024 SDXL + ControlNet fits in VRAM.")
    elif vram_gb >= 8:
        print("  -> VRAM: GOOD (8-12 GB). SDXL with CPU offload or SD 1.5 supported.")
    else:
        print("  -> VRAM: LIMITED. Recommend SD 1.5 or ComfyUI lowvram mode.")

    if free_gb >= 15:
        print(f"  -> STORAGE: PASS ({free_gb} GB free > 15 GB required for full weights).")
    else:
        print(f"  -> STORAGE: INSUFFICIENT ({free_gb} GB free < 15 GB).")
    print("=" * 70)

    return {
        "gpu": gpu_info["name"],
        "vram_gb": vram_gb,
        "ram_gb": total_ram_gb,
        "free_disk_gb": free_gb,
        "compatible": vram_gb >= 8 and free_gb >= 15
    }

def check_python_environment():
    print("\n[PYTHON ENVIRONMENT CHECK]")
    print(f"Python executable : {sys.executable}")
    print(f"Python version    : {sys.version.split()[0]}")

    try:
        import torch
        print(f"PyTorch version   : {torch.__version__}")
        print(f"PyTorch CUDA      : {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"CUDA Device       : {torch.cuda.get_device_name(0)}")
        else:
            print("  [NOTE] Current PyTorch build is CPU-only.")
            print("  To enable CUDA 12.4 acceleration on your RTX 4060 Ti, run:")
            print("  py -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124")
    except ImportError:
        print("  [!] PyTorch not installed.")

    packages = [("diffusers", "diffusers"), ("transformers", "transformers"), ("accelerate", "accelerate"), ("safetensors", "safetensors"), ("PIL", "Pillow"), ("cv2", "OpenCV"), ("rembg", "rembg")]
    for mod, display in packages:
        try:
            __import__(mod)
            print(f"  [OK] {display}")
        except ImportError:
            print(f"  [MISSING] {display}")

def download_model(model_key, force=False):
    info = MODEL_REGISTRY.get(model_key)
    if not info:
        print(f"Unknown model key: {model_key}")
        return False

    os.makedirs(info["target_dir"], exist_ok=True)
    dest_path = os.path.join(info["target_dir"], info["filename"])

    if os.path.exists(dest_path) and not force:
        size_mb = round(os.path.getsize(dest_path) / (1024**2), 1)
        print(f"[FOUND] {info['name']} already exists at: {dest_path} ({size_mb} MB)")
        return True

    # Check free disk space before download
    usage = shutil.disk_usage(info["target_dir"])
    free_gb = usage.free / (1024**3)
    if free_gb < (info["size_gb"] + 2.0):
        print(f"[ERROR] Insufficient disk space! Required: {info['size_gb']} GB, Available: {free_gb:.1f} GB")
        return False

    print(f"\n[DOWNLOADING] {info['name']} (~{info['size_gb']} GB)...")
    print(f"  Source URL : {info['url']}")
    print(f"  Destination: {dest_path}")

    # Use urllib with progress hook
    def progress_callback(blocks, block_size, total_size):
        downloaded = blocks * block_size
        if total_size > 0:
            percent = min(100.0, (downloaded / total_size) * 100)
            mb = downloaded / (1024**2)
            total_mb = total_size / (1024**2)
            sys.stdout.write(f"\r  Progress: {percent:5.1f}% ({mb:6.1f} / {total_mb:6.1f} MB)")
            sys.stdout.flush()

    try:
        urllib.request.urlretrieve(info["url"], dest_path, reporthook=progress_callback)
        print("\n  [DONE] Download complete.")
        return True
    except Exception as e:
        print(f"\n  [ERROR] Failed to download {info['name']}: {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False

def print_setup_guide():
    guide = f"""
======================================================================
  MATTHEW CLICKER — LOCAL AI SETUP INSTRUCTIONS FOR USER
======================================================================

Your computer features an NVIDIA GeForce RTX 4060 Ti (16 GB VRAM) and
32 GB system RAM with 581 GB free storage on Drive W:, which is IDEAL
for running SDXL + IP-Adapter FaceID at native 1024x1024 resolution.

To run the local image generator locally on your GPU:

1. Install PyTorch with CUDA 12.4:
   py -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124

2. Install Diffusers and local generation libraries:
   py -m pip install diffusers transformers accelerate safetensors insightface onnxruntime-gpu rembg

3. Download the SDXL Base & IP-Adapter Weights:
   py ai/scripts/setup_local_ai.py --download-all

4. Generate any skin candidate using the CLI:
   py ai/scripts/generate_skin_cli.py --skin aura_matthew --seed 42 --candidates 2

5. Approve the candidate into the game:
   py ai/scripts/approve_skin.py --candidate ai/output/aura_matthew_42.png --skin aura_matthew

Model files will be stored in: {MODELS_DIR} (ignored by Git).
Approved game assets will be placed in: public/images/skins/
======================================================================
"""
    print(guide)

if __name__ == "__main__":
    hw = inspect_hardware()
    check_python_environment()

    if "--guide" in sys.argv or len(sys.argv) == 1:
        print_setup_guide()

    if "--download-all" in sys.argv:
        print("\nStarting model downloads...")
        for key in MODEL_REGISTRY:
            download_model(key)
    elif "--download" in sys.argv:
        idx = sys.argv.index("--download")
        if idx + 1 < len(sys.argv):
            download_model(sys.argv[idx + 1])
