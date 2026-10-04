#!/usr/bin/env python3
"""
HACK Platform Video Compression & FastStart Stream Optimizer
Compresses raw recordings using ffmpeg (H.264, CRF 28, AAC audio, and +faststart atom).
"""

import sys
import shutil
import argparse
import subprocess
from pathlib import Path

def compress_video(input_file: str, output_file: str, crf: int = 28, preset: str = "fast") -> Path:
    """
    Compresses input video to output_file using ffmpeg with FastStart streaming.
    """
    inp = Path(input_file).resolve()
    out = Path(output_file).resolve()

    if not inp.is_file():
        raise FileNotFoundError(f"Input file not found: {input_file}")

    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg binary not found on system PATH. Please install ffmpeg.")

    out.parent.mkdir(parents=True, exist_ok=True)

    orig_size_mb = inp.stat().st_size / (1024 * 1024)
    print(f"[INFO] Compressing {inp.name} ({orig_size_mb:.2f} MB)...")

    cmd = [
        "ffmpeg",
        "-i", str(inp),
        "-vcodec", "libx264",
        "-crf", str(crf),
        "-preset", preset,
        "-acodec", "aac",
        "-b:a", "96k",
        "-movflags", "+faststart",
        str(out),
        "-y"
    ]

    subprocess.run(cmd, check=True)

    new_size_mb = out.stat().st_size / (1024 * 1024)
    ratio = (1 - (new_size_mb / orig_size_mb)) * 100 if orig_size_mb > 0 else 0
    print(f"[SUCCESS] Compressed to {out.name} ({new_size_mb:.2f} MB, {ratio:.1f}% reduction).")
    return out

def main():
    parser = argparse.ArgumentParser(description="Compress video for web streaming and unlisted upload.")
    parser.add_argument("input", help="Path to input video")
    parser.add_argument("output", help="Path to output video")
    parser.add_argument("--crf", type=int, default=28, help="CRF quality (default: 28)")
    parser.add_argument("--preset", default="fast", help="ffmpeg preset (default: fast)")
    args = parser.parse_args()

    compress_video(args.input, args.output, crf=args.crf, preset=args.preset)

if __name__ == "__main__":
    main()
