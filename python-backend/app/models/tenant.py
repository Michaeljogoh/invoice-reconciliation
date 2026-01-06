from datetime import datetime
from typing import List
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Tenant(Base):
    """Tenant (organization) model for multi-tenancy."""
    
    __tablename__ = "tenants"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    invoices: Mapped[List["Invoice"]] = relationship(
        "Invoice", back_populates="tenant", cascade="all, delete-orphan"
    )
    transactions: Mapped[List["BankTransaction"]] = relationship(
        "BankTransaction", back_populates="tenant", cascade="all, delete-orphan"
    )
    vendors: Mapped[List["Vendor"]] = relationship(
        "Vendor", back_populates="tenant", cascade="all, delete-orphan"
    )
    match_candidates: Mapped[List["MatchCandidate"]] = relationship(
        "MatchCandidate", back_populates="tenant", cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Tenant(id={self.id}, name={self.name}, slug={self.slug})>"