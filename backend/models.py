import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class DocStatus(str, enum.Enum):
    INGESTING = "INGESTING"           # resolving/downloading a remote link (YouTube/Instagram)
    PROCESSING = "PROCESSING"         # STT/NLP pipeline running
    DRAFT = "DRAFT"                   # visible only to uploader
    PUBLISHED = "PUBLISHED"           # broadcast to all users
    PENDING_DELETE = "PENDING_DELETE" # in shared trash, awaiting N/N consensus
    PURGED = "PURGED"                 # soft-marker before hard delete / audit trail


class SourceType(str, enum.Enum):
    FILE_UPLOAD = "FILE_UPLOAD"
    YOUTUBE_LINK = "YOUTUBE_LINK"
    INSTAGRAM_LINK = "INSTAGRAM_LINK"


class VoteChoice(str, enum.Enum):
    DELETE = "DELETE"
    RESTORE = "RESTORE"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    username = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)  # seeded, bcrypt
    role = Column(String(20), default="member")         # admin/dev/pm/member
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="uploader")
    votes = relationship("DeletionVote", back_populates="user")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    uploader_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    title = Column(String(255), nullable=False)
    agenda_topic = Column(String(255), nullable=False)

    source_type = Column(Enum(SourceType), nullable=False, default=SourceType.FILE_UPLOAD)
    source_url = Column(String(1000), nullable=True)        # original YouTube/Instagram URL, if any
    media_path = Column(String(500), nullable=True)        # storage path/URL of uploaded media
    used_native_captions = Column(String(5), default="false")  # "true" if platform captions were usable, skipping STT
    raw_transcript = Column(Text, nullable=True)           # full English transcript
    filtered_transcript = Column(Text, nullable=True)      # agenda-only sentences
    executive_summary = Column(Text, nullable=True)        # JSON: summary/decisions/action_items/open_questions

    status = Column(Enum(DocStatus), default=DocStatus.PROCESSING, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    uploader = relationship("User", back_populates="documents")
    votes = relationship("DeletionVote", back_populates="document", cascade="all, delete-orphan")

class DeletionVote(Base):
    __tablename__ = "deletion_votes"
    __table_args__ = (UniqueConstraint("document_id", "user_id", name="uq_doc_user_vote"),)

    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    choice = Column(Enum(VoteChoice), nullable=False)
    voted_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="votes")
    user = relationship("User", back_populates="votes")
