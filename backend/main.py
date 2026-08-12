import os
from dotenv import load_dotenv
load_dotenv()  # loads .env file (MISTRAL_API_KEY, DATABASE_URL, WHISPER_MODEL, etc.)

import shutil
import uuid
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from pydantic import BaseModel
from db import get_db, init_db
from models import Document, DocStatus, SourceType, DeletionVote, VoteChoice, User
from auth import get_current_user
from pipeline import run_pipeline
from broadcast import router as broadcast_router, broadcast
from seed import run as seed_db
from source_adapter import detect_source_type, UnsupportedURLError
from llm_client import get_mistral_client
from logger import logger, get_latest_logs

# Initialize database and seed default users
init_db()
seed_db()

# Resilient Mistral Client initialization (supports v1, v0, and direct REST fallback)
mistral_client = get_mistral_client()
logger.info("[main] ADMIS Backend initialized successfully.")

app = FastAPI(title="Agenda-Driven Meeting Intelligence System (ADMIS) API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include SSE Broadcast router
app.include_router(broadcast_router)

UPLOAD_DIR = os.path.abspath("storage/media")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=UPLOAD_DIR), name="media")

def _serialize_doc(doc: Document, delete_votes: int = 0, total_users: int = 0, voters: list = None):
    summary_data = None
    if doc.executive_summary:
        try:
            summary_data = json.loads(doc.executive_summary)
        except Exception:
            summary_data = {"summary": doc.executive_summary}

    return {
        "id": doc.id,
        "uploader_id": doc.uploader_id,
        "uploader_name": doc.uploader.display_name if doc.uploader else "Unknown",
        "title": doc.title,
        "agenda_topic": doc.agenda_topic,
        "source_type": doc.source_type.value if hasattr(doc.source_type, 'value') else str(doc.source_type),
        "source_url": doc.source_url,
        "media_path": doc.media_path,
        "used_native_captions": doc.used_native_captions,
        "raw_transcript": doc.raw_transcript,
        "filtered_transcript": doc.filtered_transcript,
        "executive_summary": summary_data,
        "status": doc.status.value if hasattr(doc.status, 'value') else str(doc.status),
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "published_at": doc.published_at.isoformat() if doc.published_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
        "delete_votes": delete_votes,
        "total_users": total_users,
        "voters": voters or []
    }

async def _run_pipeline_wrapper(doc_id: str):
    from db import SessionLocal
    db = SessionLocal()
    try:
        doc = db.get(Document, doc_id)
        if doc:
            await broadcast("document_updated", _serialize_doc(doc))
        await run_pipeline(db, mistral_client, doc_id)
        doc = db.get(Document, doc_id)
        if doc:
            await broadcast("document_updated", _serialize_doc(doc))
    finally:
        db.close()

# ---- System Status & Health ----

@app.get("/system/status")
def get_system_status():
    llm_connected = mistral_client is not None and bool(os.getenv("MISTRAL_API_KEY"))
    return {
        "status": "online",
        "llm_connected": llm_connected,
        "llm_provider": "Mistral AI" if llm_connected else None
    }

@app.get("/system/logs")
def get_system_logs(lines: int = 100):
    return {
        "log_file": os.path.abspath("logs/admis.log"),
        "logs": get_latest_logs(lines)
    }

# ---- User Management & Demo Accounts ----

@app.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username, "display_name": u.display_name, "role": u.role} for u in users]

# ---- 1a. Upload media file & kick off async pipeline ----

@app.post("/documents/upload")
async def upload_document(
    title: str = Form(...),
    agenda_topic: str = Form(...),
    file: UploadFile | None = File(None),
    raw_text: str | None = Form(None),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    media_path = None

    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        allowed_exts = {".mp3", ".wav", ".mp4", ".m4a", ".mov", ".txt"}
        if ext not in allowed_exts:
            raise HTTPException(400, f"Unsupported media format '{ext}'. Allowed: {allowed_exts}")

        media_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
        with open(media_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    elif raw_text:
        # Save submitted raw transcript text as media file
        media_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}.txt")
        with open(media_path, "w", encoding="utf-8") as f:
            f.write(raw_text)

    doc = Document(
        uploader_id=user.id,
        title=title,
        agenda_topic=agenda_topic,
        source_type=SourceType.FILE_UPLOAD,
        media_path=media_path,
        status=DocStatus.PROCESSING,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    if background_tasks:
        background_tasks.add_task(_run_pipeline_wrapper, doc.id)

    serialized = _serialize_doc(doc)
    await broadcast("document_updated", serialized)
    return {"document_id": doc.id, "status": doc.status, "message": "Document upload successful. STT & NLP pipeline started.", "document": serialized}

# ---- 1b. Ingest YouTube / Instagram URL & kick off pipeline ----

class IngestUrlRequest(BaseModel):
    title: str | None = None
    agenda_topic: str
    url: str

@app.post("/documents/ingest-url")
async def ingest_url_document(
    payload: IngestUrlRequest,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        st_str = detect_source_type(payload.url)
        source_type = SourceType(st_str)
    except UnsupportedURLError:
        raise HTTPException(400, "URL must be a valid YouTube or Instagram link")

    doc = Document(
        uploader_id=user.id,
        title=payload.title or payload.url,
        agenda_topic=payload.agenda_topic,
        source_type=source_type,
        source_url=payload.url,
        status=DocStatus.INGESTING,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    if background_tasks:
        background_tasks.add_task(_run_pipeline_wrapper, doc.id)

    serialized = _serialize_doc(doc)
    await broadcast("document_updated", serialized)
    return {"document_id": doc.id, "status": doc.status, "source_type": source_type, "document": serialized}

# ---- 2. Uploader views/approves their DRAFT/PROCESSING/INGESTING documents ----

@app.get("/documents/drafts")
def list_my_drafts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    docs = db.query(Document).filter(
        Document.uploader_id == user.id,
        Document.status.in_([DocStatus.DRAFT, DocStatus.PROCESSING, DocStatus.INGESTING])
    ).order_by(Document.created_at.desc()).all()
    return [_serialize_doc(d) for d in docs]

@app.post("/documents/{doc_id}/publish")
async def publish_document(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    if doc.uploader_id != user.id:
        raise HTTPException(403, "Only the uploader can publish this document")
    if doc.status != DocStatus.DRAFT:
        raise HTTPException(409, f"Cannot publish from status {doc.status}")

    doc.status = DocStatus.PUBLISHED
    doc.published_at = datetime.utcnow()
    db.commit()

    serialized = _serialize_doc(doc)
    await broadcast("document_published", serialized)
    return {"status": doc.status, "document": serialized}

# ---- 3. Shared Inbox / Feed ----

@app.get("/documents/feed")
def shared_feed(db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.status == DocStatus.PUBLISHED).order_by(Document.published_at.desc()).all()
    return [_serialize_doc(d) for d in docs]

# ---- 4. Trash Bin & Consensus Deletion ----

@app.get("/documents/trash")
def trash_bin(db: Session = Depends(get_db)):
    docs = db.query(Document).filter(Document.status == DocStatus.PENDING_DELETE).order_by(Document.updated_at.desc()).all()
    total_users = db.query(User).count()
    result = []
    for d in docs:
        delete_votes = sum(1 for v in d.votes if v.choice == VoteChoice.DELETE)
        voters = [{"user_id": v.user_id, "choice": v.choice.value} for v in d.votes]
        result.append(_serialize_doc(d, delete_votes=delete_votes, total_users=total_users, voters=voters))
    return result

@app.get("/documents/{doc_id}")
def get_document_details(doc_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    total_users = db.query(User).count()
    delete_votes = sum(1 for v in doc.votes if v.choice == VoteChoice.DELETE)
    voters = [{"user_id": v.user_id, "choice": v.choice.value} for v in doc.votes]
    return _serialize_doc(doc, delete_votes=delete_votes, total_users=total_users, voters=voters)

@app.post("/documents/{doc_id}/delete")
async def trigger_delete(doc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = db.get(Document, doc_id)
    if not doc or doc.status != DocStatus.PUBLISHED:
        raise HTTPException(409, "Only PUBLISHED documents can be moved to trash")

    doc.status = DocStatus.PENDING_DELETE
    db.commit()

    # Register triggering user's implicit DELETE vote
    existing_vote = db.query(DeletionVote).filter_by(document_id=doc_id, user_id=user.id).first()
    if existing_vote:
        existing_vote.choice = VoteChoice.DELETE
        existing_vote.voted_at = datetime.utcnow()
    else:
        db.add(DeletionVote(document_id=doc_id, user_id=user.id, choice=VoteChoice.DELETE))
    db.commit()

    total_users = db.query(User).count()
    delete_votes = db.query(DeletionVote).filter_by(document_id=doc_id, choice=VoteChoice.DELETE).count()
    voters = [{"user_id": v.user_id, "choice": v.choice.value} for v in doc.votes]
    serialized = _serialize_doc(doc, delete_votes=delete_votes, total_users=total_users, voters=voters)

    await broadcast("document_updated", serialized)
    return {"status": doc.status, "document": serialized}

def _purge_document(db: Session, doc: Document):
    """Hard deletes document and underlying media storage when N/N consensus reached."""
    if doc.media_path and os.path.exists(doc.media_path):
        try:
            os.remove(doc.media_path)
        except Exception as e:
            print(f"[main] Failed to remove media file {doc.media_path}: {e}")

    db.query(DeletionVote).filter_by(document_id=doc.id).delete()
    db.delete(doc)
    db.commit()

@app.post("/documents/{doc_id}/vote")
async def cast_vote(
    doc_id: str,
    choice: VoteChoice = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    doc = db.get(Document, doc_id)
    if not doc or doc.status != DocStatus.PENDING_DELETE:
        raise HTTPException(409, "Document is not pending deletion")

    existing_vote = db.query(DeletionVote).filter_by(document_id=doc_id, user_id=user.id).first()
    if existing_vote:
        existing_vote.choice = choice
        existing_vote.voted_at = datetime.utcnow()
    else:
        db.add(DeletionVote(document_id=doc_id, user_id=user.id, choice=choice))
    db.commit()

    # Rule 1: A single RESTORE vote immediately reverts status to PUBLISHED & clears votes
    if choice == VoteChoice.RESTORE:
        db.query(DeletionVote).filter_by(document_id=doc_id).delete()
        doc.status = DocStatus.PUBLISHED
        db.commit()

        serialized = _serialize_doc(doc, delete_votes=0, total_users=db.query(User).count(), voters=[])
        await broadcast("document_updated", serialized)
        return {"status": doc.status, "reason": "restored_by_single_vote", "document": serialized}

    # Rule 2: Purge only once every connected/seed user has voted DELETE (N/N)
    total_users = db.query(User).count()
    delete_votes = db.query(DeletionVote).filter_by(document_id=doc_id, choice=VoteChoice.DELETE).count()

    if delete_votes >= total_users:
        _purge_document(db, doc)
        await broadcast("document_purged", {"doc_id": doc_id})
        return {"status": DocStatus.PURGED, "reason": "unanimous_consensus"}

    voters = [{"user_id": v.user_id, "choice": v.choice.value} for v in doc.votes]
    serialized = _serialize_doc(doc, delete_votes=delete_votes, total_users=total_users, voters=voters)
    await broadcast("document_updated", serialized)
    return {"status": doc.status, "delete_votes": delete_votes, "total_users": total_users, "document": serialized}
