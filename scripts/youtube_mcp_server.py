#!/usr/bin/env python3
"""
HACK Platform YouTube & Media MCP Server
FastMCP server exposing tools for uploading unlisted workshop videos to YouTube,
compressing session media, managing chapter timestamps, and updating HACK curriculum metadata.
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List

# Ensure scripts directory and repo root are in python path
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from env_helper import load_env, get_env_var
import upload_unlisted
import compress_video

try:
    from mcp.server.mcpserver import MCPServer as FastMCP
except ImportError:
    try:
        from mcp.server.fastmcp import FastMCP
    except ImportError:
        FastMCP = None

if FastMCP is None:
    print("[ERROR] MCP package not found. Run: pip install 'mcp' or 'mcp<2'", file=sys.stderr)
    sys.exit(1)

# Initialize FastMCP Server
mcp = FastMCP(
    name="hack-youtube-mcp",
    instructions="Tools for uploading unlisted workshop recordings to YouTube and managing video assets for HACK KUET.",
)

# Load environment on startup
load_env(str(REPO_ROOT / ".env"))

@mcp.tool()
def youtube_check_auth() -> Dict[str, Any]:
    """
    Checks the status of YouTube Data API v3 OAuth credentials.
    Verifies existence of client_secrets.json, token.json cache, and credentials validity.
    """
    load_env(str(REPO_ROOT / ".env"))
    secrets_file = get_env_var("GOOGLE_CLIENT_SECRETS_FILE", "client_secrets.json")
    token_file = get_env_var("YOUTUBE_TOKEN_FILE", "token.json")

    secrets_path = Path(REPO_ROOT / secrets_file) if not os.path.isabs(secrets_file) else Path(secrets_file)
    token_path = Path(REPO_ROOT / token_file) if not os.path.isabs(token_file) else Path(token_file)

    has_secrets = secrets_path.is_file()
    has_token = token_path.is_file()

    token_valid = False
    if has_token:
        try:
            from google.oauth2.credentials import Credentials
            creds = Credentials.from_authorized_user_file(str(token_path), upload_unlisted.YOUTUBE_UPLOAD_SCOPE)
            token_valid = creds and creds.valid
        except Exception as e:
            token_valid = False

    return {
        "status": "ready" if (has_secrets and token_valid) else "needs_authorization" if has_secrets else "missing_client_secrets",
        "client_secrets_path": str(secrets_path),
        "client_secrets_found": has_secrets,
        "token_path": str(token_path),
        "token_found": has_token,
        "token_valid": token_valid,
        "instructions": (
            "Ready to upload."
            if token_valid
            else "Run 'python3 scripts/upload_unlisted.py --file <path>' once in terminal to authenticate via browser."
            if has_secrets
            else "Download OAuth client ID (Desktop app) from Google Cloud Console as client_secrets.json. See YOUTUBE_SETUP.md."
        ),
    }

@mcp.tool()
def youtube_upload_video(
    file_path: str,
    title: str,
    description: Optional[str] = "",
    privacy: str = "unlisted",
    update_class_id: Optional[str] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Uploads a video recording to YouTube with unlisted privacy status.
    Optionally links the resulting video ID directly into the target workshop's meta.json.

    Args:
        file_path: Absolute or repo-relative path to video file (.mp4, .webm, etc.)
        title: Descriptive video title (e.g. 'Class 01: ROS 2 Architecture')
        description: Description including chapter timestamps and topics
        privacy: Privacy status ('unlisted', 'private', or 'public', default: 'unlisted')
        update_class_id: Optional class folder name to update (e.g. 'class-01')
        dry_run: If True, validates authentication without actually uploading
    """
    load_env(str(REPO_ROOT / ".env"))
    resolved_path = Path(file_path)
    if not resolved_path.is_absolute():
        resolved_path = REPO_ROOT / file_path

    if not dry_run and not resolved_path.is_file():
        return {
            "success": False,
            "error": f"Video file not found at: {resolved_path}",
        }

    secrets_file = get_env_var("GOOGLE_CLIENT_SECRETS_FILE", "client_secrets.json")
    token_file = get_env_var("YOUTUBE_TOKEN_FILE", "token.json")
    secrets_path = Path(REPO_ROOT / secrets_file) if not os.path.isabs(secrets_file) else Path(secrets_file)
    token_path = Path(REPO_ROOT / token_file) if not os.path.isabs(token_file) else Path(token_file)

    if dry_run:
        auth_status = youtube_check_auth()
        return {
            "success": True,
            "dry_run": True,
            "file": str(resolved_path),
            "title": title,
            "privacy": privacy,
            "auth_status": auth_status,
        }

    try:
        youtube = upload_unlisted.get_authenticated_service(str(secrets_path), str(token_path))
        video_id = upload_unlisted.upload_video_resumable(
            youtube,
            str(resolved_path),
            title=title,
            description=description or "",
            category_id="28",
            privacy=privacy,
        )

        result = {
            "success": True,
            "video_id": video_id,
            "video_url": f"https://youtu.be/{video_id}",
            "embed_url": f"https://www.youtube-nocookie.com/embed/{video_id}",
            "title": title,
            "privacy": privacy,
        }

        if update_class_id:
            updated = upload_unlisted.update_class_meta(str(REPO_ROOT), update_class_id, video_id)
            result["class_updated"] = updated
            # Auto-recompile data store
            recompile_res = subprocess.run(
                [sys.executable, str(REPO_ROOT / "scripts" / "generate_data.py")],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
            )
            result["recompile_success"] = (recompile_res.returncode == 0)

        return result

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }

@mcp.tool()
def compress_workshop_video(
    input_file: str,
    output_file: Optional[str] = None,
    crf: int = 28,
    preset: str = "medium",
) -> Dict[str, Any]:
    """
    Compresses a raw video file using H.264 / AAC and optimizes it for FastStart web streaming.

    Args:
        input_file: Path to uncompressed video
        output_file: Output path for compressed MP4 (default: replaces extension or appends _compressed.mp4)
        crf: Constant Rate Factor (18-32, 28 recommended for slides/lectures)
        preset: FFmpeg encoding speed preset ('fast', 'medium', 'slow')
    """
    in_path = Path(input_file)
    if not in_path.is_absolute():
        in_path = REPO_ROOT / input_file

    if not in_path.is_file():
        return {"success": False, "error": f"Input file not found: {in_path}"}

    if not output_file:
        out_path = in_path.with_name(f"{in_path.stem}_compressed.mp4")
    else:
        out_path = Path(output_file)
        if not out_path.is_absolute():
            out_path = REPO_ROOT / output_file

    try:
        success = compress_video.compress_video(str(in_path), str(out_path), crf=crf, preset=preset)
        if success:
            orig_size = in_path.stat().st_size
            comp_size = out_path.stat().st_size
            ratio = (1 - comp_size / orig_size) * 100 if orig_size > 0 else 0
            return {
                "success": True,
                "input": str(in_path),
                "output": str(out_path),
                "original_size_mb": round(orig_size / (1024 * 1024), 2),
                "compressed_size_mb": round(comp_size / (1024 * 1024), 2),
                "reduction_percentage": round(ratio, 1),
            }
        else:
            return {"success": False, "error": "FFmpeg compression failed."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@mcp.tool()
def update_class_youtube_meta(class_folder: str, youtube_id: str) -> Dict[str, Any]:
    """
    Manually wires an existing YouTube Video ID into classes/<class_folder>/meta.json
    and triggers static data and Pug template recompilation.

    Args:
        class_folder: Class directory name (e.g. 'class-01')
        youtube_id: 11-character YouTube video identifier (e.g. 'dQw4w9WgXcQ')
    """
    updated = upload_unlisted.update_class_meta(str(REPO_ROOT), class_folder, youtube_id)
    if not updated:
        return {"success": False, "error": f"Could not find or update meta.json for {class_folder}"}

    # Recompile platform
    res = subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts" / "generate_data.py")],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )

    return {
        "success": True,
        "class_folder": class_folder,
        "youtube_id": youtube_id,
        "youtube_url": f"https://youtu.be/{youtube_id}",
        "embed_url": f"https://www.youtube-nocookie.com/embed/{youtube_id}",
        "recompiled": res.returncode == 0,
        "recompile_output": res.stdout.strip(),
    }

if __name__ == "__main__":
    mcp.run()
