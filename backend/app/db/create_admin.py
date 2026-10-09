"""Create the first admin account safely.

Reads credentials from environment (.env) or CLI args. Never hardcode passwords.

Usage:
    python -m app.db.create_admin --email admin@novamart.vn --name "Admin"
    # You will be prompted for the password (not echoed).
"""

import argparse
import getpass
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.modules.users.entities import User


def main() -> None:
    parser = argparse.ArgumentParser(description="Create NovaMart admin account")
    parser.add_argument("--email", help="Admin email (or set ADMIN_EMAIL)")
    parser.add_argument("--name", default="Administrator", help="Admin display name")
    args = parser.parse_args()

    import os
    email = args.email or os.getenv("ADMIN_EMAIL", "")
    if not email:
        email = input("Admin email: ").strip()
    if "@" not in email:
        print("Email không hợp lệ.", file=sys.stderr)
        sys.exit(1)

    password = os.getenv("ADMIN_PASSWORD", "")
    if not password:
        password = getpass.getpass("Admin password (min 8 chars): ")
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("Mật khẩu không khớp.", file=sys.stderr)
            sys.exit(1)
    if len(password) < 8:
        print("Mật khẩu phải có ít nhất 8 ký tự.", file=sys.stderr)
        sys.exit(1)

    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == email.lower()))
        if existing:
            if existing.role != "admin":
                existing.role = "admin"
                db.commit()
                print(f"Đã nâng {email} thành admin.")
            else:
                print(f"{email} đã là admin.")
            return
        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            name=args.name,
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Đã tạo tài khoản admin: {email}")


if __name__ == "__main__":
    main()
