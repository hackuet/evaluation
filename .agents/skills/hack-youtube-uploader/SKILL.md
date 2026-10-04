---
name: hack-youtube-uploader
description: Autonomous protocol and local MCP tools for uploading unlisted workshop and technical lecture recordings to YouTube, managing chapter timestamps, verifying Google OAuth credentials, compressing session media via FastStart, and synchronizing video metadata with HACK class pages.
---

# Autonomous Agent Skill: HACK YouTube & Media Uploader

This skill equips autonomous AI coding agents with the technical protocol and local Model Context Protocol (MCP) tooling to upload unlisted workshop recordings to YouTube, compress video binaries, generate timestamped chapters, and synchronize metadata across HACK KUET static workshop pages.

---

## 1. Core Directives & Video Architecture

- **Unlisted Video Hosting**: All workshop recordings must be uploaded with `privacyStatus="unlisted"`. They are unindexed and private on YouTube, but directly playable within embedded players on HACK class pages (`batches/<batch>/c<N>.html`).
- **Zero Raw Videos in Git**: Raw video files (`.mp4`, `.webm`, `.mov`, `.mkv`) must **never** be committed to git. They are excluded by `.gitignore`.
- **Zero-PII Compliance**: Video titles and descriptions must never leak student names or email addresses. Use instructor names, batch labels, and technical topics only.
- **Dual Invocation**: Agents can operate via the **local MCP server** (`scripts/youtube_mcp_server.py`) or directly via the **Python CLI** (`scripts/upload_unlisted.py`).

---

## 2. Local MCP Server (`hack-youtube-mcp`)

The local MCP server is located at `scripts/youtube_mcp_server.py` and exposes the following tools to agents:

### Available MCP Tools

#### 1. `youtube_check_auth()`
- **Purpose**: Audits the authentication state before initiating an upload.
- **Returns**: Status (`"ready"`, `"needs_authorization"`, or `"missing_client_secrets"`), paths to credentials, and actionable next steps.

#### 2. `youtube_upload_video(file_path, title, description, privacy="unlisted", update_class_id=None, dry_run=False)`
- **Purpose**: Resumable chunked upload to YouTube with progress tracking.
- **Parameters**:
  - `file_path`: Path to local MP4/WebM video file.
  - `title`: Formal video title (e.g. `Class 01: ROS 2 Architecture & Hardware Abstraction`).
  - `description`: Technical topics and timestamped chapter markers.
  - `privacy`: Default `"unlisted"`.
  - `update_class_id`: Target class folder (e.g. `class-01`). If specified, automatically updates `classes/<class_id>/meta.json` with the new YouTube video ID and triggers platform recompilation!
  - `dry_run`: Tests prerequisites without performing network upload.

#### 3. `compress_workshop_video(input_file, output_file=None, crf=28, preset="medium")`
- **Purpose**: Compresses raw recordings via `ffmpeg` with H.264/AAC and optimizes with FastStart (`+faststart`) for instant web playback.

#### 4. `update_class_youtube_meta(class_folder, youtube_id)`
- **Purpose**: Links an existing YouTube video ID to a class's `meta.json` and automatically triggers `python3 scripts/generate_data.py`.

---

## 3. Configuring the MCP Server in Agent Environments

To configure this local MCP server in an agent client (e.g. Antigravity, Cursor, Claude Desktop), add the following to the MCP configuration file:

```json
{
  "mcpServers": {
    "hack-youtube-mcp": {
      "command": "python3",
      "args": ["/home/user/Projects/HACK Evaluation/scripts/youtube_mcp_server.py"],
      "cwd": "/home/user/Projects/HACK Evaluation",
      "env": {
        "PYTHONPATH": "/home/user/Projects/HACK Evaluation/scripts"
      }
    }
  }
}
```

---

## 4. Command-Line Alternative (CLI)

Agents and maintainers can also execute uploads and checks directly from bash:

### Check & Dry Run
```bash
python3 scripts/upload_unlisted.py --dry-run
```

### Upload & Auto-Update Class
```bash
python3 scripts/upload_unlisted.py \
  --file path/to/workshop.mp4 \
  --title "Class 01: ROS 2 Architecture & Hardware Abstraction" \
  --description "Comprehensive hands-on workshop recording." \
  --update-class class-01
```

### Compress Raw Video
```bash
python3 scripts/compress_video.py raw_recording.mp4 media/classes/class-01/ROS.mp4 --crf 28
```

---

## 5. End-to-End Class Integration Workflow

When ingesting or updating a workshop session with a new video:

1. **Step 1: Check Auth**: Call `youtube_check_auth()` or run with `--dry-run`.
2. **Step 2: Upload Video**:
   Call `youtube_upload_video(file_path="...", title="...", update_class_id="class-01")`.
   This saves the YouTube ID into `classes/class-01/meta.json`:
   ```json
   {
     "youtubeId": "dQw4w9WgXcQ",
     "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ",
     "youtubeEmbedUrl": "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
   }
   ```
3. **Step 3: Add Chapter Markers in `classes/class-01/CLASS.md`**:
   Ensure timestamp seek markers are added under the recording section:
   ```markdown
   - `00:00:00` - Introduction & Architecture
   - `00:45:30` - ROS 2 Publisher & Subscriber
   - `01:30:00` - FreeRTOS Dual-Core Task Scheduling
   ```
4. **Step 4: Recompile Static Pages**:
   ```bash
   npm run generate
   # (or: python3 scripts/generate_data.py)
   ```
5. **Step 5: Verify via Playwright**:
   Ensure `batches/2k24/c1.html` renders the responsive YouTube embed without 404 errors.

---

## 6. Troubleshooting & Self-Healing

| Issue | Root Cause | Agent Action |
| :--- | :--- | :--- |
| `missing_client_secrets` | `client_secrets.json` not in root | Point user to [`YOUTUBE_SETUP.md`](file:///home/user/Projects/HACK%20Evaluation/YOUTUBE_SETUP.md) to download Desktop OAuth ID |
| `Token has expired` | 7-day testing mode token expiry | Delete `token.json` and re-authenticate via browser prompt |
| `Video is too long` | Channel not phone-verified | Instruct user to complete Intermediate feature verification at YouTube Studio |
| `uploadLimitExceeded` | Daily 10,000 unit quota exhausted | Wait until midnight Pacific Time (PST) or defer remaining uploads to next day |
