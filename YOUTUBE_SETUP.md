# YouTube Unlisted Video Setup & Automation Guide
**Hardware Acceleration Club of KUET (HACK)**

This guide provides step-by-step instructions for configuring Google Cloud credentials, creating the YouTube channel, and uploading unlisted workshop and technical lecture recordings using HACK's automated uploader (`scripts/upload_unlisted.py`).

---

## 1. Overview & Architecture

To keep the git repository lightweight while supporting full-length, high-definition workshop recordings, HACK uses **Unlisted YouTube hosting**:
- **Privacy Mode**: All videos are published with `privacyStatus="unlisted"`. They are not publicly searchable or indexed on YouTube, but can be viewed directly via link and embedded within HACK's static workshop pages (`<batch>/c<N>.html`).
- **Authentication**: YouTube requires **OAuth 2.0 Client credentials** (`client_secrets.json`) to perform uploads on behalf of a channel. Simple API keys are strictly read-only and cannot upload videos.
- **Automation**: The CLI tool [`scripts/upload_unlisted.py`](file:///home/user/Projects/HACK%20Evaluation/scripts/upload_unlisted.py) handles resumable uploading, title/description generation, chapter timestamps, and automatically updates the class's `meta.json`.

---

## 2. Step 1: Create and Verify the YouTube Channel

If your Google Account does not already have a YouTube channel, or if you want to create a dedicated channel for club recordings:

### A. Create the Channel
1. Sign in to [YouTube](https://www.youtube.com) using your Google / Club account.
2. Click your profile avatar in the top-right corner.
3. Select **Create a channel** (or if you already have a personal channel and want a separate club channel, go to **Settings** > **Add or manage your channel(s)** > **Create a channel**).
4. Set the name (e.g., `Hardware Acceleration Club of KUET` or `HACK KUET`) and handle.
5. Click **Create Channel**.

### B. Enable Uploads Over 15 Minutes (Mandatory for Workshops)
By default, new YouTube channels are capped at 15-minute video uploads. Workshop recordings usually exceed this limit:
1. Open [YouTube Studio](https://studio.youtube.com).
2. Click **Settings** (gear icon in the bottom-left corner).
3. Select **Channel** > **Feature eligibility**.
4. Locate **Intermediate features** (enables videos longer than 15 minutes, custom thumbnails, etc.).
5. Click **Verify phone number** and complete the quick SMS verification code flow.

---

## 3. Step 2: Google Cloud Console Setup

To interact with the YouTube Data API v3, you must create a project in Google Cloud Console:

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top navigation bar and click **New Project**.
3. Enter a Project Name (e.g., `HACK-Video-Platform`) and click **Create**.
4. Ensure your new project is selected in the top navigation dropdown.
5. Navigate to **APIs & Services** > **Library** (or search `YouTube Data API v3`).
6. Select **YouTube Data API v3** and click **Enable**.

---

## 4. Step 3: Configure the OAuth Consent Screen

Because your application uploads to YouTube, Google requires an OAuth consent screen:

1. In Google Cloud Console, navigate to **APIs & Services** > **OAuth consent screen**.
2. Under **User Type**, choose **External** and click **Create**.
3. Fill in the required app information:
   - **App name**: `HACK Video Uploader`
   - **User support email**: Select your email address.
   - **Developer contact information**: Enter your email address.
   - Click **Save and Continue**.
4. **Scopes**:
   - Click **Add or Remove Scopes**.
   - Search for `youtube.upload` or filter by `YouTube Data API v3`.
   - Check `.../auth/youtube.upload` (*Manage your YouTube videos*).
   - Click **Update**, then click **Save and Continue**.
5. **Test Users** (*Critical Step*):
   - While the app status is in "Testing" mode, only designated test users can authenticate.
   - Click **+ Add Users**.
   - Enter the exact email address of the Google account that owns the YouTube channel.
   - Click **Save and Continue**.
6. Review the summary and return to the dashboard.

---

## 5. Step 4: Generate and Download `client_secrets.json`

1. In Google Cloud Console, navigate to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top of the screen and select **OAuth client ID**.
3. In the **Application type** dropdown, select **Desktop app**.
4. Set the **Name** to `HACK Desktop Uploader`.
5. Click **Create**.
6. A modal window titled **OAuth client created** will appear:
   - Click **Download JSON**.
7. Rename the downloaded file to:
   ```
   client_secrets.json
   ```
8. Move `client_secrets.json` into the root of this repository:
   ```bash
   mv ~/Downloads/client_secret_*.json /home/user/Projects/HACK\ Evaluation/client_secrets.json
   ```

> [!IMPORTANT]
> `client_secrets.json`, `.env`, and `token.json` are strictly excluded in `.gitignore`. They must **NEVER** be committed to git.

---

## 6. Step 5: (Optional) Generate an API Key

If you also want an API key for read-only metadata lookups:
1. In **APIs & Services** > **Credentials**, click **+ Create Credentials** > **API key**.
2. Copy the generated key.
3. (Recommended) Click **Edit API key**, and under **API restrictions**, select **Restrict key** and check **YouTube Data API v3**.

---

## 7. Step 6: Configure `.env`

1. Copy the template `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Verify or update the configuration variables inside `.env`:
   ```bash
   # Path to downloaded OAuth 2.0 client secrets JSON
   GOOGLE_CLIENT_SECRETS_FILE=client_secrets.json

   # Token cache file (auto-generated on first authentication)
   YOUTUBE_TOKEN_FILE=token.json

   # Optional read-only YouTube Data API Key
   YOUTUBE_API_KEY=AIzaSy...

   # Default upload privacy
   YOUTUBE_DEFAULT_PRIVACY=unlisted

   # YouTube Category (28 = Science & Technology, 27 = Education)
   YOUTUBE_CATEGORY_ID=28

   # Gemini API Key (optional, for automated chapter/rubric audits)
   GEMINI_API_KEY=
   ```

---

## 8. Step 7: Install Dependencies & Run First Test

Install the official Google API client libraries in your Python environment:

```bash
pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
```

### Dry Run Verification
Test your configuration without uploading any data:

```bash
python3 scripts/upload_unlisted.py --dry-run
```

Expected output:
```text
=== HACK Platform Unlisted Video Uploader ===
[OK] Environment loaded from: .../.env
[DRY RUN] Google Client Secrets file found: client_secrets.json
[DRY RUN] All prerequisites satisfied.
```

---

## 9. Step 8: Uploading Workshop Videos

### Basic Upload
To upload a workshop video file and get an unlisted YouTube URL:

```bash
python3 scripts/upload_unlisted.py \
  --file path/to/workshop.mp4 \
  --title "HACK Class 01: ROS 2 Architecture & Hardware Abstraction" \
  --description "Comprehensive hands-on workshop recording."
```

### Automatic Class Metadata Synchronization
To upload and automatically wire the resulting video ID and embed URL into `classes/class-01/meta.json`:

```bash
python3 scripts/upload_unlisted.py \
  --file path/to/workshop.mp4 \
  --title "Class 01: ROS 2 Architecture" \
  --update-class class-01
```

This updates `classes/class-01/meta.json` with:
```json
{
  "youtubeId": "dQw4w9WgXcQ",
  "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ",
  "youtubeEmbedUrl": "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
}
```

### First-Time Interactive Authorization
When running an upload for the first time:
1. The script will output an authorization URL and attempt to open your default browser.
2. Sign in with the Google Account added as a **Test User** in Step 3.
3. If Google displays a screen stating *"Google hasn't verified this app"*, click **Advanced** > **Go to HACK Video Uploader (unsafe)**.
4. Click **Continue** to grant the `youtube.upload` permission.
5. The script catches the authorization callback, saves `token.json`, and begins the resumable chunked upload with progress display.
6. Subsequent runs reuse `token.json` automatically without prompting.

---

## 10. Recompiling the Platform

After uploading and updating `meta.json`, recompile the static data store and Pug templates:

```bash
python3 scripts/generate_data.py
```

This compiles:
- `assets/js/data.js` containing embedded YouTube IDs.
- `index.html` cumulative view.
- `<batch>/c<N>.html` dedicated workshop pages with responsive YouTube embeds.

---

## 11. Troubleshooting & FAQ

### `invalid_grant` or `Token has expired`
- **Cause**: In Google Cloud "Testing" mode, user refresh tokens expire every 7 days.
- **Fix**: Delete `token.json` and run the script again to re-authenticate:
  ```bash
  rm token.json
  python3 scripts/upload_unlisted.py --file ...
  ```

### `access_denied: HACK Video Uploader has not completed the Google verification process`
- **Cause**: The Google account logging in was not added to the **Test Users** list.
- **Fix**: Go to Google Cloud Console > **APIs & Services** > **OAuth consent screen** > **Test users** > click **+ Add Users** and add your email.

### `uploadLimitExceeded` / Daily Quota
- **Cause**: YouTube API v3 assigns 10,000 quota units per day by default. A video upload costs 1,600 units (approx. 6 uploads per day).
- **Fix**: Daily quotas reset at midnight Pacific Time (PST/PDT). For larger batches, schedule uploads across consecutive days or request a free quota increase via Google Cloud Console.

### Long Video Rejection (`Upload rejected: Video is too long`)
- **Cause**: Channel intermediate features are not phone-verified.
- **Fix**: Complete phone verification at [YouTube Studio Settings](https://studio.youtube.com).
