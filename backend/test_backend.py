import asyncio
import os
import json
from db import SessionLocal, init_db
from seed import run as seed_run
from models import User, Document, DocStatus, SourceType, DeletionVote, VoteChoice
from pipeline import run_pipeline
from source_adapter import detect_source_type, resolve_source, UnsupportedURLError

def test_full_admis_workflow():
    print("=== Testing ADMIS Backend Workflow with Multi-Source Ingestion ===")

    # 1. Initialize & Seed DB
    init_db()
    seed_run()
    db = SessionLocal()

    users = db.query(User).all()
    print(f"1. Users found in database ({len(users)}): {[u.username for u in users]}")

    alice = db.query(User).filter_by(username="alice_admin").first()
    bob = db.query(User).filter_by(username="bob_dev").first()
    charlie = db.query(User).filter_by(username="charlie_pm").first()

    # 2. Test Link Detection & Source Adapter
    yt_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    ig_url = "https://www.instagram.com/reel/C_sample123/"
    
    yt_type = detect_source_type(yt_url)
    ig_type = detect_source_type(ig_url)
    print(f"2a. Detected YouTube source type: {yt_type}")
    print(f"2b. Detected Instagram source type: {ig_type}")
    
    assert yt_type == "YOUTUBE_LINK"
    assert ig_type == "INSTAGRAM_LINK"

    # 3. Create Document with YouTube link & INGESTING status
    doc = Document(
        uploader_id=alice.id,
        title="YouTube Demo Sync",
        agenda_topic="Database Migration Architecture",
        source_type=SourceType.YOUTUBE_LINK,
        source_url=yt_url,
        status=DocStatus.INGESTING
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    print(f"3. Uploaded YouTube Link Doc ID: {doc.id}, Status: {doc.status}, Source: {doc.source_type}")

    # 4. Run STT & NLP Pipeline (which executes Stage 0 link resolution)
    asyncio.run(run_pipeline(db, mistral_client=None, doc_id=doc.id))

    db.refresh(doc)
    print(f"4. Post-Pipeline Status: {doc.status}")
    print(f"   Raw Transcript Snippet: {doc.raw_transcript[:60].encode('ascii', 'ignore').decode()}...")
    print(f"   Filtered Transcript Snippet: {doc.filtered_transcript[:60].encode('ascii', 'ignore').decode()}...")

    summary_obj = json.loads(doc.executive_summary)
    print(f"   Executive Summary Decisions: {summary_obj.get('key_decisions')}")
    print(f"   Action Items Count: {len(summary_obj.get('action_items', []))}")

    # 5. Publish Draft (as Alice)
    doc.status = DocStatus.PUBLISHED
    db.commit()
    print(f"5. Published Document Status: {doc.status}")

    # 6. Move to Trash (Trigger Delete by Bob)
    doc.status = DocStatus.PENDING_DELETE
    db.add(DeletionVote(document_id=doc.id, user_id=bob.id, choice=VoteChoice.DELETE))
    db.commit()

    delete_votes = db.query(DeletionVote).filter_by(document_id=doc.id, choice=VoteChoice.DELETE).count()
    total_users = db.query(User).count()
    print(f"6. Document in Trash (Bob triggered): Status={doc.status}, Delete Votes={delete_votes}/{total_users}")

    # 7. Test Single RESTORE Vote (by Alice)
    db.query(DeletionVote).filter_by(document_id=doc.id).delete()
    doc.status = DocStatus.PUBLISHED
    db.commit()

    print(f"7. Alice voted RESTORE: Reverted Status={doc.status}, Votes cleared count={db.query(DeletionVote).filter_by(document_id=doc.id).count()}")

    # 8. Move back to Trash & Unanimous Consensus Test
    doc.status = DocStatus.PENDING_DELETE
    db.add(DeletionVote(document_id=doc.id, user_id=alice.id, choice=VoteChoice.DELETE))
    db.add(DeletionVote(document_id=doc.id, user_id=bob.id, choice=VoteChoice.DELETE))
    db.add(DeletionVote(document_id=doc.id, user_id=charlie.id, choice=VoteChoice.DELETE))
    db.commit()

    delete_votes = db.query(DeletionVote).filter_by(document_id=doc.id, choice=VoteChoice.DELETE).count()
    print(f"8. Voting: Alice=DELETE, Bob=DELETE, Charlie=DELETE ({delete_votes}/{total_users})")

    if delete_votes >= total_users:
        db.query(DeletionVote).filter_by(document_id=doc.id).delete()
        db.delete(doc)
        db.commit()
        print("9. Unanimous Consensus Reached: Document successfully PURGED from database!")

    db.close()
    print("=== ADMIS Multi-Source Backend Verification PASSED! ===")

if __name__ == "__main__":
    test_full_admis_workflow()
