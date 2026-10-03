#!/usr/bin/env python3
"""
HACK Evaluation SVG Match Checker & Auto-Tracer
Compares raster input image against an SVG trace or automatically traces it
until the match metric (SSIM / Normalized Similarity) exceeds the desired threshold (>95%).
"""

import os
import sys
import argparse
import subprocess
import shutil
import tempfile
import numpy as np
from PIL import Image

try:
    from skimage.metrics import structural_similarity as compute_skimage_ssim
    HAS_SKIMAGE = True
except ImportError:
    HAS_SKIMAGE = False

try:
    from scipy.ndimage import gaussian_filter
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

try:
    import vtracer
    HAS_VTRACER = True
except ImportError:
    HAS_VTRACER = False


def calculate_ssim(im1: np.ndarray, im2: np.ndarray) -> float:
    """Calculates Structural Similarity Index (SSIM) across RGB channels."""
    if HAS_SKIMAGE:
        score, _ = compute_skimage_ssim(im1, im2, channel_axis=2, full=True)
        return float(score)

    if HAS_SCIPY:
        im1_f = im1.astype(float)
        im2_f = im2.astype(float)
        K1, K2, L = 0.01, 0.03, 255.0
        C1 = (K1 * L) ** 2
        C2 = (K2 * L) ** 2
        ch_scores = []
        for ch in range(3):
            c1 = im1_f[:, :, ch]
            c2 = im2_f[:, :, ch]
            mu1 = gaussian_filter(c1, sigma=1.5)
            mu2 = gaussian_filter(c2, sigma=1.5)
            mu1_sq = mu1 * mu1
            mu2_sq = mu2 * mu2
            mu1_mu2 = mu1 * mu2
            sigma1_sq = gaussian_filter(c1 * c1, sigma=1.5) - mu1_sq
            sigma2_sq = gaussian_filter(c2 * c2, sigma=1.5) - mu2_sq
            sigma12 = gaussian_filter(c1 * c2, sigma=1.5) - mu1_mu2
            ssim_map = ((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / (
                (mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2)
            )
            ch_scores.append(ssim_map.mean())
        return float(np.mean(ch_scores))

    # Pure numpy global SSIM fallback
    im1_f = im1.astype(float)
    im2_f = im2.astype(float)
    C1 = (0.01 * 255.0) ** 2
    C2 = (0.03 * 255.0) ** 2
    mu1 = im1_f.mean(axis=(0, 1))
    mu2 = im2_f.mean(axis=(0, 1))
    sigma1_sq = ((im1_f - mu1) ** 2).mean(axis=(0, 1))
    sigma2_sq = ((im2_f - mu2) ** 2).mean(axis=(0, 1))
    sigma12 = ((im1_f - mu1) * (im2_f - mu2)).mean(axis=(0, 1))
    ssim_idx = ((2 * mu1 * mu2 + C1) * (2 * sigma12 + C2)) / (
        (mu1**2 + mu2**2 + C1) * (sigma1_sq + sigma2_sq + C2)
    )
    return float(np.mean(ssim_idx))


def render_svg_to_png(svg_path: str, out_png: str, width: int, height: int):
    """Renders SVG to PNG using Inkscape, ImageMagick, or Chromium."""
    if shutil.which("inkscape"):
        cmd = [
            "inkscape",
            svg_path,
            f"--export-filename={out_png}",
            f"--export-width={width}",
            f"--export-height={height}",
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0 and os.path.exists(out_png):
            return

    if shutil.which("magick") or shutil.which("convert"):
        bin_name = "magick" if shutil.which("magick") else "convert"
        cmd = [bin_name, "-density", "300", "-resize", f"{width}x{height}!", svg_path, out_png]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0 and os.path.exists(out_png):
            return

    raise RuntimeError("No SVG renderer available (inkscape or magick required).")


def run_vtracer(input_image: str, output_svg: str, preset: str = "ultra"):
    """Traces raster image to SVG using vtracer."""
    if not HAS_VTRACER:
        raise RuntimeError("vtracer is not installed. Install via: pip install vtracer")

    presets = {
        "ultra": {
            "hierarchical": "stacked",
            "mode": "spline",
            "filter_speckle": 0,
            "color_precision": 8,
            "layer_difference": 4,
            "corner_threshold": 30,
            "length_threshold": 2.0,
            "max_iterations": 20,
            "splice_threshold": 30,
            "path_precision": 6,
        },
        "balanced": {
            "hierarchical": "stacked",
            "mode": "spline",
            "filter_speckle": 1,
            "color_precision": 8,
            "layer_difference": 8,
            "corner_threshold": 45,
            "length_threshold": 3.0,
            "max_iterations": 15,
            "splice_threshold": 45,
            "path_precision": 5,
        },
        "extreme": {
            "hierarchical": "stacked",
            "mode": "spline",
            "filter_speckle": 0,
            "color_precision": 8,
            "layer_difference": 2,
            "corner_threshold": 15,
            "length_threshold": 1.0,
            "max_iterations": 30,
            "splice_threshold": 20,
            "path_precision": 6,
        },
    }

    params = presets.get(preset, presets["ultra"])
    vtracer.convert_image_to_svg_py(
        input_image,
        output_svg,
        colormode="color",
        **params,
    )


def optimize_svg(input_svg: str, output_svg: str):
    """Optimizes SVG using scour if available."""
    if shutil.which("scour"):
        subprocess.run(
            [
                "scour",
                "-i",
                input_svg,
                "-o",
                output_svg,
                "--enable-viewboxing",
                "--enable-id-stripping",
                "--shorten-ids",
                "--strip-xml-prolog",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    else:
        shutil.copyfile(input_svg, output_svg)


def generate_diff_visualization(orig: np.ndarray, rend: np.ndarray, diff_out_path: str):
    """Generates a 3-panel comparison: [Original | Traced SVG | Amplified Diff Heatmap]."""
    h, w, _ = orig.shape
    diff = np.abs(orig.astype(float) - rend.astype(float))
    diff_gray = np.mean(diff, axis=2)
    # 5x amplified diff map
    diff_vis = np.clip(diff_gray * 5.0, 0, 255).astype(np.uint8)

    diff_heatmap = np.zeros_like(orig)
    # Magenta/red heatmap for discrepancies
    diff_heatmap[:, :, 0] = diff_vis
    diff_heatmap[:, :, 1] = np.clip(diff_vis // 3, 0, 255)
    diff_heatmap[:, :, 2] = np.clip(diff_vis // 2, 0, 255)

    comparison = np.zeros((h, w * 3, 3), dtype=np.uint8)
    comparison[:, :w] = orig
    comparison[:, w : 2 * w] = rend
    comparison[:, 2 * w :] = diff_heatmap

    Image.fromarray(comparison).save(diff_out_path)


def evaluate_match(image_path: str, svg_path: str, diff_out: str = None) -> dict:
    """Evaluates match metrics between original raster image and SVG."""
    orig_img = Image.open(image_path).convert("RGB")
    width, height = orig_img.size
    orig_arr = np.array(orig_img)

    with tempfile.TemporaryDirectory() as tmpdir:
        rendered_png = os.path.join(tmpdir, "rendered.png")
        render_svg_to_png(svg_path, rendered_png, width, height)
        rend_arr = np.array(Image.open(rendered_png).convert("RGB"))

    # Compute metrics
    diff = np.abs(orig_arr.astype(float) - rend_arr.astype(float))
    mae = float(np.mean(diff))
    mse = float(np.mean(diff**2))
    rmse = float(np.sqrt(mse))
    psnr = float(10 * np.log10((255.0**2) / (mse + 1e-10)))
    normalized_similarity = float((1.0 - mae / 255.0) * 100.0)

    ssim_val = calculate_ssim(orig_arr, rend_arr)
    ssim_pct = float(ssim_val * 100.0)

    # Pixel match tolerances
    tol5 = float(np.mean(np.all(diff <= 5, axis=2)) * 100.0)
    tol10 = float(np.mean(np.all(diff <= 10, axis=2)) * 100.0)
    tol15 = float(np.mean(np.all(diff <= 15, axis=2)) * 100.0)

    if diff_out:
        generate_diff_visualization(orig_arr, rend_arr, diff_out)

    return {
        "width": width,
        "height": height,
        "ssim_percent": ssim_pct,
        "normalized_similarity_percent": normalized_similarity,
        "pixel_match_tol5": tol5,
        "pixel_match_tol10": tol10,
        "pixel_match_tol15": tol15,
        "mae": mae,
        "rmse": rmse,
        "psnr_db": psnr,
    }


def main():
    parser = argparse.ArgumentParser(description="SVG Match Checker & High-Fidelity Vector Tracer")
    parser.add_argument("--image", "-i", required=True, help="Path to original raster image")
    parser.add_argument("--svg", "-s", required=True, help="Path to SVG trace (output or input)")
    parser.add_argument("--threshold", "-t", type=float, default=95.0, help="Target match threshold %% (default: 95.0)")
    parser.add_argument("--auto-trace", action="store_true", help="Trace SVG if missing or if match < threshold")
    parser.add_argument("--diff-out", "-d", default="match_diff.png", help="Path to save 3-panel diff comparison")
    parser.add_argument("--optimize", action="store_true", default=True, help="Optimize SVG using scour")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"Error: Image '{args.image}' not found.")
        sys.exit(1)

    # If SVG doesn't exist or auto-trace requested
    if not os.path.exists(args.svg) or args.auto_trace:
        print(f"[*] Running vector trace on '{args.image}'...")
        with tempfile.TemporaryDirectory() as tmpdir:
            raw_svg = os.path.join(tmpdir, "raw.svg")
            run_vtracer(args.image, raw_svg, preset="ultra")
            if args.optimize:
                print("[*] Optimizing SVG paths with scour...")
                optimize_svg(raw_svg, args.svg)
            else:
                shutil.copyfile(raw_svg, args.svg)
        print(f"[+] Vector trace written to: {args.svg}")

    print(f"[*] Evaluating match between '{args.image}' and '{args.svg}'...")
    metrics = evaluate_match(args.image, args.svg, diff_out=args.diff_out)

    # Header
    print("\n" + "=" * 60)
    print("           SVG MATCH CHECKER VERIFICATION REPORT")
    print("=" * 60)
    print(f"Resolution                  : {metrics['width']} x {metrics['height']} px")
    print(f"Structural Similarity (SSIM): {metrics['ssim_percent']:.2f}%")
    print(f"Normalized Similarity (L1)  : {metrics['normalized_similarity_percent']:.2f}%")
    print(f"Pixel Match (Δ ≤ 5)         : {metrics['pixel_match_tol5']:.2f}%")
    print(f"Pixel Match (Δ ≤ 10)        : {metrics['pixel_match_tol10']:.2f}%")
    print(f"Pixel Match (Δ ≤ 15)        : {metrics['pixel_match_tol15']:.2f}%")
    print(f"Mean Absolute Error (MAE)   : {metrics['mae']:.2f} / 255")
    print(f"Root Mean Sq Error (RMSE)   : {metrics['rmse']:.2f}")
    print(f"PSNR                        : {metrics['psnr_db']:.2f} dB")
    print("-" * 60)

    # Threshold assessment
    passed_ssim = metrics["ssim_percent"] >= args.threshold
    passed_norm = metrics["normalized_similarity_percent"] >= args.threshold

    if passed_ssim and passed_norm:
        status = "PASSED"
        print(f"[✓] RESULT: {status}! Match is above {args.threshold}% (SSIM: {metrics['ssim_percent']:.2f}%, Norm: {metrics['normalized_similarity_percent']:.2f}%)")
    else:
        status = "FAILED"
        print(f"[✗] RESULT: {status}! Match is below {args.threshold}%.")

    if args.diff_out and os.path.exists(args.diff_out):
        print(f"[+] Visual diff comparison saved to: {args.diff_out}")
    print("=" * 60 + "\n")

    sys.exit(0 if (passed_ssim and passed_norm) else 1)


if __name__ == "__main__":
    main()
