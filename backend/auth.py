from fastapi import Header, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from models import User

def get_current_user(
    x_user_id: str | None = Header(None, alias="X-User-Id"),
    user_id: str | None = None,
    db: Session = Depends(get_db)
) -> User:
    """Dependency to extract current user for request authentication."""
    target_id = x_user_id or user_id

    if target_id:
        # Try matching by ID first, then by username
        user = db.query(User).filter((User.id == target_id) | (User.username == target_id)).first()
        if user:
            return user

    # Default to first seeded user (Alice Admin) for simple unauthenticated demo requests
    default_user = db.query(User).filter_by(username="alice_admin").first()
    if not default_user:
        default_user = db.query(User).first()

    if not default_user:
        raise HTTPException(status_code=401, detail="No users found in database. Run seed script first.")

    return default_user
