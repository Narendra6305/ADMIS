import bcrypt
from models import User, gen_uuid
from db import SessionLocal, init_db

SEED_USERS = [
    {"username": "alice_admin", "display_name": "Alice (Admin)", "role": "admin"},
    {"username": "bob_dev", "display_name": "Bob (Developer)", "role": "dev"},
    {"username": "charlie_pm", "display_name": "Charlie (PM)", "role": "pm"},
]
DEFAULT_PASSWORD = "admis2026"

def run():
    init_db()
    db = SessionLocal()
    salt = bcrypt.gensalt()
    pw_hash = bcrypt.hashpw(DEFAULT_PASSWORD.encode(), salt).decode('utf-8')

    for u in SEED_USERS:
        existing = db.query(User).filter_by(username=u["username"]).first()
        if existing:
            continue
        db.add(User(
            id=gen_uuid(),
            username=u["username"],
            display_name=u["display_name"],
            role=u["role"],
            password_hash=pw_hash
        ))
    db.commit()
    db.close()
    print("Database seeded successfully with users:", [u["username"] for u in SEED_USERS])

if __name__ == "__main__":
    run()
