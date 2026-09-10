import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

raw_db_url = os.getenv(
    "DATABASE_URL",
    "postgresql://nexus:nexus_password@127.0.0.1:5433/nexus_ner",
)

# Normalize legacy postgres:// scheme to postgresql:// for SQLAlchemy 2.0 compatibility
if raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = raw_db_url

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
