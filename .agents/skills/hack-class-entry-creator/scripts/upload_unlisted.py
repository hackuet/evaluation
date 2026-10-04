#!/usr/bin/env python3
"""
HACK Platform Unlisted Video Uploader
Uploads workshop and technical class demonstration recordings to YouTube as Unlisted videos.
Reads API credentials and configuration from .env.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Optional, List

# Ensure scripts directory is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from env_helper import load_env, get_env_var

# Scopes required for uploading YouTube videos
YOUTUBE_UPLOAD_SCOPE = ["https://www.googleapis.com/auth/youtube.upload"]
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

def get_authenticated_service(client_secrets_file: str, token_file: str):
    """
    Authenticates against Google OAuth2 and returns the YouTube service resource.
    Caches valid tokens in token_file.
    """
    try:
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
    except ImportError:
        print("\n[ERROR] Required Google API libraries not installed.")
        print("Please install them with:")
        print("    pip install google-api-python-client google-auth-oauthlib google-auth-httplib2\n")
        sys.exit(1)

    creds = None
    if os.path.exists(token_file):
        try:
            creds = Credentials.from_authorized_user_file(token_file, YOUTUBE_UPLOAD_SCOPE)
        except Exception as e:
            print(f"[WARN] Failed to load cached token from {token_file}: {e}")

    # If there are no valid credentials, let the user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"[WARN] Token refresh failed: {e}. Re-authenticating...")
                creds = None

        if not creds:
            if not os.path.exists(client_secrets_file):
                print(f"\n[ERROR] Client secrets file not found: {client_secrets_file}")
                print("1. Go to Google Cloud Console (https://console.cloud.google.com/)")
                print("2. Enable YouTube Data API v3")
                print("3. Create OAuth 2.0 Client ID (Application type: Desktop App)")
                print(f"4. Download JSON and place at: {client_secrets_file}")
                print("5. Or set GOOGLE_CLIENT_SECRETS_FILE in .env\n")
                sys.exit(1)

            flow = InstalledAppFlow.from_client_secrets_file(
                client_secrets_file, YOUTUBE_UPLOAD_SCOPE
            )
            creds = flow.run_local_server(port=0)

        # Save credentials for subsequent runs
        with open(token_file, "w", encoding="utf-8") as token_out:
            token_out.write(creds.to_json())
        print(f"[INFO] Cached authorized credentials to {token_file}")

    return build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION, credentials=creds)


def upload_unlisted_video(
    video_file: str,
    title: str,
    description: str = "",
    category_id: str = "28",
    tags: Optional[List[str]] = None,
    privacy_status: str = "unlisted",
    client_secrets_file: Optional[str] = None,
    token_file: Optional[str] = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Uploads a video file to YouTube with unlisted privacy status.
    
    Args:
        video_file: Path to local video file (e.g. MP4).
        title: Title of the video.
        description: Description text (including chapter timestamps).
        category_id: YouTube category ID (default: 28 for Science & Technology).
        tags: List of keywords/tags.
        privacy_status: 'unlisted' (default), 'private', or 'public'.
        client_secrets_file: Path to Google OAuth client secrets JSON.
        token_file: Path to cache authorized user token.
        dry_run: If True, simulates upload without calling the API.
        
    Returns:
        dict with video_id, watch_url, embed_url, and title.
    """
    load_env()
    video_path = Path(video_file).resolve()
    if not video_path.is_file():
        raise FileNotFoundError(f"Video file not found: {video_file}")

    file_size_mb = video_path.stat().st_size / (1024 * 1024)
    print(f"[INFO] Preparing upload for: {video_path.name} ({file_size_mb:.2f} MB)")
    print(f"[INFO] Title: {title}")
    print(f"[INFO] Privacy Status: {privacy_status}")

    if dry_run:
        print("[DRY-RUN] Simulating unlisted video upload...")
        fake_id = "DEMO_YOUTUBE_ID"
        return {
            "id": fake_id,
            "watch_url": f"https://www.youtube.com/watch?v={fake_id}",
            "embed_url": f"https://www.youtube.com/embed/{fake_id}",
            "title": title,
            "privacy_status": privacy_status,
            "file_size_mb": round(file_size_mb, 2),
            "simulated": True
        }

    # Resolve credentials from arguments or .env
    secrets = client_secrets_file or get_env_var("GOOGLE_CLIENT_SECRETS_FILE", "client_secrets.json")
    token = token_file or get_env_var("YOUTUBE_TOKEN_FILE", "token.json")
    privacy = privacy_status or get_env_var("YOUTUBE_DEFAULT_PRIVACY", "unlisted")
    category = category_id or get_env_var("YOUTUBE_CATEGORY_ID", "28")

    from googleapiclient.http import MediaFileUpload

    youtube = get_authenticated_service(secrets, token)

    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags or ["HACK", "KUET", "Embedded Systems", "Robotics", "ROS 2", "RTOS"],
            "categoryId": category
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(
        str(video_path),
        chunksize=1024 * 1024 * 4, # 4MB chunks
        resumable=True
    )

    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    print("[INFO] Upload started. Streaming chunks to YouTube...")
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            progress = int(status.progress() * 100)
            print(f"  > Progress: {progress}%", end="\r", flush=True)

    print("\n[SUCCESS] Upload complete!")
    video_id = response.get("id")
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    embed_url = f"https://www.youtube.com/embed/{video_id}"

    print(f"[INFO] Video ID: {video_id}")
    print(f"[INFO] Watch URL: {watch_url}")
    print(f"[INFO] Embed URL: {embed_url}")

    return {
        "id": video_id,
        "watch_url": watch_url,
        "embed_url": embed_url,
        "title": title,
        "privacy_status": privacy,
        "file_size_mb": round(file_size_mb, 2)
    }


def update_class_metadata(class_code: str, video_info: Dict[str, Any]):
    """
    Updates or creates meta.json in classes/class-<NN>/ with YouTube embed metadata.
    """
    # Normalize class code (e.g. C-01 -> class-01)
    class_num = class_code.lower().replace("c-", "").replace("c", "").zfill(2)
    repo_root = Path(__file__).resolve().parent.parent
    class_dir = repo_root / "classes" / f"class-{class_num}"

    if not class_dir.is_dir():
        print(f"[WARN] Target class directory not found: {class_dir}")
        return

    meta_file = class_dir / "meta.json"
    meta = {}
    if meta_file.is_file():
        try:
            with open(meta_file, "r", encoding="utf-8") as f:
                meta = json.load(f)
        except Exception:
            meta = {}

    meta["youtubeId"] = video_info["id"]
    meta["youtubeUrl"] = video_info["watch_url"]
    meta["youtubeEmbedUrl"] = video_info["embed_url"]

    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"[INFO] Updated {meta_file} with YouTube video metadata.")


def main():
    parser = argparse.ArgumentParser(
        description="Upload workshop demonstration videos as Unlisted to YouTube."
    )
    parser.add_argument("video_path", help="Path to video file to upload")
    parser.add_argument("--title", required=True, help="Video title")
    parser.add_argument("--description", default="", help="Video description")
    parser.add_argument("--category", default="28", help="YouTube category ID (default: 28 Science & Tech)")
    parser.add_argument("--tags", nargs="*", default=None, help="Video tags")
    parser.add_argument("--class-code", help="Session code e.g. C-01")
    parser.add_argument("--update-class", action="store_true", help="Automatically update class metadata with YouTube ID")
    parser.add_argument("--dry-run", action="store_true", help="Simulate upload without actual API requests")

    args = parser.parse_args()

    result = upload_unlisted_video(
        video_file=args.video_path,
        title=args.title,
        description=args.description,
        category_id=args.category,
        tags=args.tags,
        dry_run=args.dry_run
    )

    if args.update_class and args.class_code:
        update_class_metadata(args.class_code, result)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
