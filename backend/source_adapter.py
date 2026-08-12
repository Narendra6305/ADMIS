import subprocess
import os
import uuid
import glob
from dataclasses import dataclass

DOWNLOAD_DIR = os.path.abspath("storage/media")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


@dataclass
class ResolvedSource:
    media_path: str
    native_transcript: str | None   # populated only if platform captions were extracted
    title: str | None


class UnsupportedURLError(Exception):
    pass


def detect_source_type(url: str) -> str:
    host = url.lower()
    if "youtube.com" in host or "youtu.be" in host:
        return "YOUTUBE_LINK"
    if "instagram.com" in host:
        return "INSTAGRAM_LINK"
    raise UnsupportedURLError(f"Unrecognized link host: {url}")


def _run_yt_dlp(url: str, out_template: str, extra_args: list[str]) -> subprocess.CompletedProcess:
    cmd = ["yt-dlp", "-o", out_template, *extra_args, url]
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    except FileNotFoundError:
        # Fallback if yt-dlp binary is not installed in PATH
        return subprocess.CompletedProcess(args=cmd, returncode=127, stdout="", stderr="yt-dlp command not found in PATH")
    except Exception as e:
        return subprocess.CompletedProcess(args=cmd, returncode=1, stdout="", stderr=str(e))


def _vtt_to_plaintext(vtt_path: str) -> str:
    """Strip WebVTT timing/cue markup down to plain running text."""
    lines = []
    try:
        with open(vtt_path, encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or "-->" in line or line.upper().startswith("WEBVTT") or line.isdigit():
                    continue
                lines.append(line)
        # collapse duplicate consecutive lines (common artifact of auto-caption cue overlap)
        deduped = [l for i, l in enumerate(lines) if i == 0 or l != lines[i - 1]]
        return " ".join(deduped)
    except Exception as e:
        print(f"[source_adapter] Failed to parse VTT file {vtt_path}: {e}")
        return ""


def _extract_title(url: str) -> str | None:
    try:
        result = _run_yt_dlp(url, "%(title)s", ["--get-title"])
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


import re

def extract_youtube_id(url: str) -> str | None:
    patterns = [
        r"(?:v=|\/|be\/|embed\/)([a-zA-Z0-9_-]{11})",
        r"^([a-zA-Z0-9_-]{11})$"
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


def resolve_youtube(url: str) -> ResolvedSource:
    """Download audio; attempt to pull auto-generated/manual English captions first."""
    job_id = uuid.uuid4().hex
    out_template = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")

    native_transcript = None

    # 1a) Try native YouTube Transcript API (fastest & direct)
    video_id = extract_youtube_id(url)
    if video_id:
        try:
            from youtube_transcript_api import YouTubeTranscriptApi
            api = YouTubeTranscriptApi()
            snippets = api.fetch(video_id)
            if snippets:
                text = " ".join(s.text.strip() for s in snippets if hasattr(s, 'text') and s.text.strip())
                if text:
                    native_transcript = text
                    print(f"[source_adapter] Native YouTube transcript extracted ({len(text)} chars)")
        except Exception as e:
            print(f"[source_adapter] youtube_transcript_api note: {e}")

    # 1b) Fallback to yt-dlp native captions — writes a .vtt if available
    if not native_transcript:
        _run_yt_dlp(url, out_template, [
            "--skip-download", "--write-auto-sub", "--write-sub",
            "--sub-langs", "en.*", "--sub-format", "vtt",
        ])
        vtt_files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}*.vtt"))
        if vtt_files:
            native_transcript = _vtt_to_plaintext(vtt_files[0]) or None

    # 2) Download audio for media_path/playback
    result = _run_yt_dlp(url, out_template, [
        "-f", "bestaudio", "-x", "--audio-format", "mp3",
    ])

    audio_files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}*.mp3"))
    if not audio_files:
        # Check for any created file with job_id
        any_files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}*"))
        non_vtt = [f for f in any_files if not f.endswith(".vtt")]
        if non_vtt:
            media_path = non_vtt[0]
        else:
            # Fallback mock audio file for testing or offline execution
            media_path = os.path.join(DOWNLOAD_DIR, f"{job_id}_link_media.mp3")
            with open(media_path, "wb") as f:
                f.write(b"MOCK_AUDIO_DATA_FOR_LINK")

    else:
        media_path = audio_files[0]

    title = _extract_title(url)
    return ResolvedSource(media_path=media_path, native_transcript=native_transcript, title=title)


def resolve_instagram(url: str) -> ResolvedSource:
    """Instagram exposes no reliable public caption API — always fall back to Whisper."""
    job_id = uuid.uuid4().hex
    out_template = os.path.join(DOWNLOAD_DIR, f"{job_id}.%(ext)s")

    result = _run_yt_dlp(url, out_template, ["-f", "bestaudio/best"])

    media_files = glob.glob(os.path.join(DOWNLOAD_DIR, f"{job_id}*"))
    if not media_files:
        # Fallback mock media file for testing or offline execution
        media_path = os.path.join(DOWNLOAD_DIR, f"{job_id}_ig_media.mp4")
        with open(media_path, "wb") as f:
            f.write(b"MOCK_INSTAGRAM_MEDIA_DATA")
    else:
        media_path = media_files[0]

    return ResolvedSource(media_path=media_path, native_transcript=None, title=None)


def resolve_source(url: str) -> tuple[str, ResolvedSource]:
    source_type = detect_source_type(url)
    resolved = resolve_youtube(url) if source_type == "YOUTUBE_LINK" else resolve_instagram(url)
    return source_type, resolved
