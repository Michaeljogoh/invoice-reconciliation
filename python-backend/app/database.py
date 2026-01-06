import os
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.models import Base

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
SYNC_DATABASE_URL = DATABASE_URL.replace("+asyncpg", "") if DATABASE_URL else None

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Create async engine for FastAPI
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("SQLALCHEMY_ECHO", "false").lower() == "true",
    poolclass=NullPool,  # Disable pooling for async
    future=True,
)

# Create sync engine for Alembic
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=False,
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncSession:
    """Dependency for getting database sessions."""
    async with async_session_maker() as session:
        yield session


def init_db():
    """Initialize database tables (for development only)."""
    Base.metadata.create_all(bind=sync_engine)


def drop_db():
    """Drop all database tables (for testing)."""
    Base.metadata.drop_all(bind=sync_engine)