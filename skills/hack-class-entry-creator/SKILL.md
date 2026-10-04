---
name: hack-class-entry-creator
description: Autonomous protocol for ingesting, structuring, scoring, and compiling technical class/workshop participation, curriculum documentation, compressed session recordings, and Pug static generation for HACK KUET.
---

# HACK Class Entry Creator Skill

Use this skill when recording new workshop or class sessions, logging batch-wise student attendance and live quiz scores, documenting technical curricula, embedding session demonstration recordings, and compiling the HACK technical leaderboard.

---

## 1. Core Directives & Architectural Rules

1. **Strict Privacy Mandate**:
   - Only `roll` is used as the student identifier (e.g. `2307033`, `2407084`).
   - Zero student names, emails, phone numbers, or academic marks outside the official rubric.
   - Any raw attendance logs (handwritten image transcription, forms, paper sign-in sheets) must be strictly scrubbed of PII upon ingestion.
2. **Batch-Wise Multi-Activity Architecture**:
   - Classes are placed per academic batch: `<batch>/class-<NN>/` (e.g. `2k23/class-01/`, `2k24/class-01/`).
   - Shared technical curriculum `CLASS.md` lives canonically in `classes/class-<NN>/CLASS.md` and is symlinked into each participating batch folder (`CLASS.md -> ../../classes/class-<NN>/CLASS.md`).
3. **Session Media & Unlisted Video Protocol**:
   - Do NOT commit heavy raw video files to git.
   - Videos should be hosted as **Unlisted** on YouTube via the YouTube Data API v3, offloading repository bandwidth while keeping videos private and accessible only to participants.
   - Environment variables are managed via `.env` (gitignored, see `.env.example`).
   - Use the provided upload helper script (`scripts/upload_unlisted.py`):
     ```bash
     python3 scripts/upload_unlisted.py <video_file> --title "<Session Title>" --class-code "C-<NN>" --update-class
     ```
   - For offline/local fallback, videos can also be compressed locally using `scripts/compress_video.py` (`ffmpeg -vcodec libx264 -crf 28 -movflags +faststart`).
   - `.gitignore` strictly excludes `.env` and `*.mp4` (with exceptions for curated media).
4. **Scoring & Quiz Schema**:
   - Base participation award is **50.00 Points** for verified attendance.
   - Schema supports live quizzes, interactive Q&A challenges, and bonus points:
     `roll,batch,status,attendance_pts,quiz_pts,bonus_pts,total_pts,remarks`
   - Points aggregate into the student cumulative score on the batch leaderboard:
     $$\\text{Total Points} = \\sum \\text{Assignments} + \\sum \\text{Classes} + \\dots$$
5. **Multi-Page Static Pug Generation**:
   - Every class compiles to a dedicated static HTML page: `<batch>/c<N>.html` (e.g. `2k23/c1.html`, `2k24/c1.html`).
   - Sub-navigation dropdown and pill bars display both assignments (`A-01`) and classes (`C-01`).
   - Student profiles include interactive filter tabs: `[All Activities]`, `[Assignments]`, `[Classes & Workshops]`.
6. **Git Branching & Identity**:
   - All development and Playwright verification must be performed on `dev`.
   - Fast-forward merge `dev -> main` and push to remote.
   - Configure git identity: `hackuet <hackuet@users.noreply.github.com>` or as instructed.

---

## 2. Step-by-Step Workflow for Adding a New Class

### Step 1: Initialize Canonical Curriculum & Media
1. Determine the class number `<NN>` (e.g. `02`) and session code (e.g. `C-02`).
2. Create canonical directory: `classes/class-<NN>/`.
3. Author `classes/class-<NN>/CLASS.md` with:
   - Header with Session Code, Date, Time, Venue, Target Batches, Base Award.
   - Instructors and institution details.
   - Primary source code repository links.
   - Demonstration recording path.
   - Executive summary and structured technical modules with learning outcomes.
   - Instructor notes and future milestone roadmap.
4. If a recording exists:
   - **Preferred (Unlisted YouTube Upload)**:
     Ensure `.env` contains `GOOGLE_CLIENT_SECRETS_FILE` or `YOUTUBE_API_KEY`.
     Execute the upload helper:
     ```bash
     python3 scripts/upload_unlisted.py <raw_video_path> --title "Technical Workshop <NN>: <Title>" --class-code "C-<NN>" --update-class
     ```
     This automatically uploads the video as unlisted and writes `youtubeId` and `youtubeEmbedUrl` into `classes/class-<NN>/meta.json`.
   - **Local Fallback**:
     If offline, compress with FastStart streaming:
     ```bash
     python3 scripts/compress_video.py <input.mp4> media/classes/class-<NN>/<name>.mp4 --crf 28
     ```
     Verify compressed size is under 20MB.

### Step 2: Ingest & Sanitize Attendance CSV
1. For each participating batch `<batch>` (e.g. `2k23`, `2k24`):
   - Create `<batch>/class-<NN>/`.
   - Symlink `CLASS.md -> ../../classes/class-<NN>/CLASS.md`.
   - Symlink recording if present: `recording.mp4 -> ../../media/classes/class-<NN>/<name>.mp4`.
   - Author `<batch>/class-<NN>/attendance.csv`:
     ```csv
     roll,batch,status,attendance_pts,quiz_pts,bonus_pts,total_pts,remarks
     2307033,2k23,Present,50.00,0.00,0.00,50.00,Attended full workshop session
     ```
2. Assert zero PII via ripgrep:
   ```bash
   rg -i "mail|[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+" <batch>/class-<NN>/
   ```

### Step 3: Compile Data & Pug Templates
1. Run the central compiler:
   ```bash
   python3 generate_data.py
   ```
2. Ensure `data.js` and `<batch>/c<N>.html` are generated without syntax errors.

### Step 4: Verify via Playwright
1. Ensure HTTP server is running on port 8080.
2. Verify:
   - Batch leaderboard displays students with correct total points.
   - Student profile modal filter tabs toggle between All, Assignments, and Classes.
   - Clicking `[Class Details]` opens the class modal and renders video player and curriculum.
   - Dedicated class page `<batch>/c<N>.html` loads and plays recording.
   - Zero student names or emails exist in the DOM or source.

### Step 5: Commit & Merge
1. Commit on `dev`:
   ```bash
   git add -A
   git commit -m "feat: add class <NN> participation and curriculum"
   git push origin dev
   ```
2. Fast-forward merge `dev -> main` and push to `main`.
