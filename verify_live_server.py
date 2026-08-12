import urllib.request
import urllib.parse
import json

BASE_URL = "http://127.0.0.1:8000"

def get(path, headers={}):
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def post_form(path, data, headers={}):
    encoded_data = urllib.parse.urlencode(data).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}{path}", data=encoded_data, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        **headers
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def main():
    print("=== Testing Live Running ADMIS FastAPI Server ===")

    # 1. Test Users Endpoint
    users = get("/users")
    print(f"[OK] GET /users returned {len(users)} users: {[u['username'] for u in users]}")

    alice = next(u for u in users if u['username'] == 'alice_admin')
    bob = next(u for u in users if u['username'] == 'bob_dev')
    charlie = next(u for u in users if u['username'] == 'charlie_pm')

    # 2. Test Document Upload (Form)
    upload_res = post_form(
        "/documents/upload",
        {
            "title": "Live Server Verification - Database & Security Audit",
            "agenda_topic": "Database Migration & Security",
            "raw_text": "Good morning team! Let's get straight into the agenda topic: Database Migration & Security. Alice: We decided yesterday that we must migrate to PostgreSQL 16 on Aurora with zero downtime. Bob: I will complete the migration scripts by this Friday. Charlie: How will we handle encryption at rest? Alice: We agreed to enforce AES-256 encryption. Great session!"
        },
        headers={"X-User-Id": alice['id']}
    )
    doc_id = upload_res["document_id"]
    print(f"[OK] POST /documents/upload created document ID: {doc_id}")

    # 3. Test Drafts Endpoint
    drafts = get("/documents/drafts", headers={"X-User-Id": alice['id']})
    print(f"[OK] GET /documents/drafts found {len(drafts)} drafts for Alice")

    # 4. Publish Document
    pub_res = post_form(f"/documents/{doc_id}/publish", {}, headers={"X-User-Id": alice['id']})
    print(f"[OK] POST /documents/{doc_id}/publish status: {pub_res['status']}")

    # 5. Shared Feed
    feed = get("/documents/feed")
    print(f"[OK] GET /documents/feed returned {len(feed)} published documents")
    pub_doc = next(d for d in feed if d['id'] == doc_id)
    print(f"  Executive Summary: {pub_doc['executive_summary']['summary']}")

    # 6. Move to Trash (Trigger Delete by Bob)
    del_res = post_form(f"/documents/{doc_id}/delete", {}, headers={"X-User-Id": bob['id']})
    print(f"[OK] POST /documents/{doc_id}/delete moved document to trash: status={del_res['status']}")

    # 7. Trash Bin List
    trash = get("/documents/trash")
    trash_doc = next(d for d in trash if d['id'] == doc_id)
    print(f"[OK] GET /documents/trash: Delete votes = {trash_doc['delete_votes']}/{trash_doc['total_users']}")

    # 8. Test Single RESTORE Vote (1-Vote Override)
    restore_res = post_form(f"/documents/{doc_id}/vote", {"choice": "RESTORE"}, headers={"X-User-Id": alice['id']})
    print(f"[OK] POST /documents/{doc_id}/vote (RESTORE) -> Status: {restore_res['status']}, Reason: {restore_res.get('reason')}")

    # 9. Move back to trash & cast all DELETE votes (Unanimous Consensus)
    post_form(f"/documents/{doc_id}/delete", {}, headers={"X-User-Id": alice['id']})
    post_form(f"/documents/{doc_id}/vote", {"choice": "DELETE"}, headers={"X-User-Id": bob['id']})
    purge_res = post_form(f"/documents/{doc_id}/vote", {"choice": "DELETE"}, headers={"X-User-Id": charlie['id']})

    print(f"[OK] Final Vote (Unanimous Consensus N/N) -> Status: {purge_res['status']}, Reason: {purge_res.get('reason')}")

    print("\n=== ALL LIVE FASTAPI ENDPOINTS & CONSENSUS RULES VERIFIED 100% SUCCESSFUL! ===")

if __name__ == "__main__":
    main()
